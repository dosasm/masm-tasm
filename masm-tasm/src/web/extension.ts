import * as vscode from 'vscode';
import { localize, loadI18n } from '../utils/i18n';

import * as lan from '../language/main';
import * as asm from './ASM';

import { XhrOptions } from "emulators/dist/out/impl/http";
import { platform } from 'emulators/dist/out/emulators';

self.window=self

export function activate(context: vscode.ExtensionContext): void {

    let jsdos=""
    if(context.extensionMode==vscode.ExtensionMode.Development){
        jsdos="node_modules/emulators/dist/"
    }

    const request=platform.current.httpRequest
    platform.current.httpRequest=async function(url:string,options:XhrOptions){
        if(url.endsWith("wasm")){
            const uri=vscode.Uri.file(url)
            const filename=uri.path.substring(uri.path.lastIndexOf('/'));
            const uri2=vscode.Uri.joinPath(context.extensionUri,jsdos,filename)
            return await vscode.workspace.fs.readFile(uri2)
        }
        if(url.endsWith("js")){
            const uri=vscode.Uri.file(url)
            const filename=uri.path.substring(uri.path.lastIndexOf('/'));
            const uri2=vscode.Uri.joinPath(context.extensionUri,jsdos,filename)
            const data=await vscode.workspace.fs.readFile(uri2)
            const text=new TextDecoder("utf-8").decode(data)
            return text
        }
        return request(url,options)
    }

    platform.current.createWorker=async function(url: string,onerror:(e:ErrorEvent)=>void,onmessage:(e:MessageEvent)=>void): Promise<Worker>{
        const uri=vscode.Uri.file(url)
        const filename=uri.path.substring(uri.path.lastIndexOf('/'));
        const uri2=vscode.Uri.joinPath(context.extensionUri,jsdos,filename)
        const data=await vscode.workspace.fs.readFile(uri2)
   
        const b = new Blob([data])

        const localUrl = URL.createObjectURL(b);
        const worker = new Worker(localUrl);
        worker.onerror=onerror;
        worker.onmessage=onmessage
        return worker
    } as any;

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
