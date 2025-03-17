import * as vscode from 'vscode';
import { localize, loadI18n } from '../utils/i18n';

import * as lan from '../language/main';
import * as asm from './ASM';

import { platform, Platform, XhrOptions } from 'emulators';

export class Browser implements Platform {
    jsdos = ""
    constructor(private context: vscode.ExtensionContext) {
        if (context.extensionMode == vscode.ExtensionMode.Development) {
            this.jsdos = "resources/jsdos/"
        }
    }
    name = "vscode-web";
    async httpRequest(url: string, options: XhrOptions) {
        if (url.endsWith("wasm")) {
            const uri = vscode.Uri.file(url)
            const filename = uri.path.substring(uri.path.lastIndexOf('/'));
            const uri2 = vscode.Uri.joinPath(this.context.extensionUri, this.jsdos, filename)
            return await vscode.workspace.fs.readFile(uri2)
        }

        if (url.endsWith("js")) {
            const uri = vscode.Uri.file(url)
            const filename = uri.path.substring(uri.path.lastIndexOf('/'));
            const uri2 = vscode.Uri.joinPath(this.context.extensionUri, this.jsdos, filename)
            const data = await vscode.workspace.fs.readFile(uri2)
            const text = new TextDecoder("utf-8").decode(data)
            return text
        }
        throw new Error("  ")
    }
    node_require(path: string) {
        return require(path)
    }
    async createWorker(url: string, onerror: (e: ErrorEvent) => void, onmessage: (e: MessageEvent) => void): Promise<Worker> {
        const uri = vscode.Uri.file(url)
        const filename = uri.path.substring(uri.path.lastIndexOf('/'));
        const uri2 = vscode.Uri.joinPath(this.context.extensionUri, this.jsdos, filename)
        const data = await vscode.workspace.fs.readFile(uri2)

        const b = new Blob([data])

        const localUrl = URL.createObjectURL(b);
        const worker = new Worker(localUrl);
        worker.addEventListener('message', (message:any) => {
            onmessage(message)
        });
        worker.addEventListener('error',(error:any)=>{
            onerror(error)
        })
        return worker
    }
}


export function activate(context: vscode.ExtensionContext): void {
    platform.set(new Browser(context))

    loadI18n(context);

    //provide programmaic language features like hover,references,outline(symbol)
    lan.activate(context);
    //provide run and debug features via DOS emulators
    asm.activate(context);

    console.log(localize("activate.hello", 'Congratulations, your extension "masm-tasm" is now active!'));
}

// this method is called when your extension is deactivated
export function deactivate(): void {
    console.log('extension deactivated');
}
