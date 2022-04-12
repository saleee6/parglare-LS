import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	Location,
	Definition
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);

	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			definitionProvider: true,
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				resolveProvider: true
			}
		}
	};

	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}

	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}

	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.parglareLSP || defaultSettings)
		);
	}

	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'parglareLSP'
		});
		documentSettings.set(resource, result);
	}

	return result;
}

documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
	commandsOfLanguage.delete(e.document.uri);
});

const commandsOfLanguage:  Map<string, Array<string>> = new Map();

documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	const settings = await getDocumentSettings(textDocument.uri);
	let commandsOfDocument = commandsOfLanguage.get(textDocument.uri);
	if (!commandsOfDocument) {
		commandsOfDocument = new Array<string>();
	}
	const text = textDocument.getText();
	const pattern = /\b([A-Z]|[a-z])+\b: /g;
	let m: RegExpExecArray | null;

	let problems = 0;
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		let found = false;
		for (const element in commandsOfDocument) {
			if (m !== null && element === m[0].substring(0, m[0].length - 2)) {
				found = true;
			}
		}
		if (!found) {
			commandsOfDocument.push(m[0].substring(0, m[0].length - 2));
			commandsOfLanguage.set(textDocument.uri, commandsOfDocument);
		}
	}
}

connection.onDidChangeWatchedFiles(_change => {
	connection.console.log('We received an file change event');
});

connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		const commandsOfDocument = commandsOfLanguage.get(_textDocumentPosition.textDocument.uri);
		let array: CompletionItem[] | { label: string; kind: 1; }[] = [];
		if (commandsOfDocument) {
			commandsOfDocument.forEach(element => {
				array.push({ 'label': element, 'kind': CompletionItemKind.Text });
			});
		}
		return array;
	}
);

connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		item.detail = item.label;
		return item;
	}
);

connection.onDefinition((_textDocumentPosition: TextDocumentPositionParams): Definition => {
	const commandsOfDocument = commandsOfLanguage.get(_textDocumentPosition.textDocument.uri);
	let len = 0;
	if (commandsOfDocument) {
		len = commandsOfDocument[0].length;
	}
	return Location.create(_textDocumentPosition.textDocument.uri, {
		start: { line: 0, character: 0 },
		end: { line: 0, character: len }
	});
});

documents.listen(connection);
connection.listen();