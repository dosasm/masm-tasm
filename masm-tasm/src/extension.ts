import * as vscode from 'vscode';
import { localize, loadI18n } from './utils/i18n';

import * as lan from './language/main';
import * as asm from './ASM/main';

import { XhrOptions } from "emulators/dist/out/impl/http";
import { platform } from 'emulators/dist/out/emulators';

const request=platform.current.httpRequest
platform.current.httpRequest=function(url:string,options:XhrOptions){
	return request(url,options)
}

platform.current.node_require=function(url:string){
	return __non_webpack_require__(url);
};

export function activate(context: vscode.ExtensionContext): void {

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
