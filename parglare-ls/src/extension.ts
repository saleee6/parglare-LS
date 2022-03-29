import * as vscode from 'vscode';
import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'pg' }],
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};
	client = new LanguageClient(
		'parglareLSP',
		'Parglare Language Server',
		serverOptions,
		clientOptions
	);
	client.start();

	console.log('Congratulations, your extension "parglare-ls" is now active!');
	let disposable = vscode.commands.registerCommand('thisOne', () => {
		vscode.window.showInformationMessage('This one from parglare-LS!');
	});
	context.subscriptions.push(disposable);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
