"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const path = require("path");
const vscode = require("vscode");
const node = require("vscode-languageclient/node");
let client;

function activate(context) {
    const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    
    const serverOptions = {
        run: { module: serverModule, transport: node.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node.TransportKind.ipc,
            options: debugOptions
        }
    };
    
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'pg' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    
    client = new node.LanguageClient('parglareLSP', 'Parglare Language Server', serverOptions, clientOptions);
    client.start();
}

exports.activate = activate;

function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map