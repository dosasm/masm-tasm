import * as vscode from 'vscode';
import { localize, loadI18n } from './utils/i18n';

import * as lan from './language/main';
import * as asm from './ASM/main';

import { Platform, platform, XhrOptions } from 'emulators';


class Nodejs implements Platform{
	name="vscode nodejs host"
	jsdos = ""
	constructor(private context: vscode.ExtensionContext) {
		if (context.extensionMode == vscode.ExtensionMode.Development) {
			this.jsdos = "resources/jsdos/"
		}
	}
	async createWorker(workerUrl: string, onerror: (e: ErrorEvent) => void, onmessage: (e: MessageEvent) => void): Promise<Worker> {
		const node_workder_threads=__non_webpack_require__("node:worker_threads")
        const w=new node_workder_threads.Worker(workerUrl)
        w.on('message', (message:any) => {
            onmessage({data:message} as any)
        });
        w.on('error',(error:any)=>{
            onerror({type:"node worker thread",filename:error.stack,message:error.message} as any)
        })
        return w
	}
	node_require(path: string) {
		return __non_webpack_require__(path);
	}
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
	
}

export function activate(context: vscode.ExtensionContext): void {
	platform.set(new Nodejs(context));

	loadI18n(context);

	//provide programmaic language features like hover,references,outline(symbol)
	lan.activate(context);
	//provide run and debug features via DOS emulators
	asm.activate(context);

	console.log(localize("activate.hello"));
}

// this method is called when your extension is deactivated
export function deactivate(): void {
	console.log('extension deactivated');
}
