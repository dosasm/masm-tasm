import * as vscode from 'vscode';
import { localize, loadI18n } from './utils/i18n';

import * as lan from './language/main';
import * as asm from './ASM2/main-node';
import { logger } from './utils/logger';

import { platform, Browser } from "emulators";
import { VScodeNodeJsPlatform } from "./ASM2/jsdos/platformNodejs";
platform.current=new VScodeNodeJsPlatform()

export function activate(context: vscode.ExtensionContext): void {

	logger.logExtensionInfo(context);

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
