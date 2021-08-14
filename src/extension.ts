import * as vscode from 'vscode';
import { localize, loadI18n } from './i18n';

import { provider } from './language/provider';
import { AsmCommands } from './ASM/main';

export function activate(context: vscode.ExtensionContext): void {
	loadI18n(context);
	//provide programmaic language features like hover,references,outline(symbol)
	provider(context);
	//run and debug the code in dosbox or msdos-player by TASM ot MASM
	AsmCommands(context);
	console.log(localize("activate.hello", 'Congratulations, your extension "masm-tasm" is now active!'));
}

// this method is called when your extension is deactivated
export function deactivate(): void {
	console.log('extension deactivated');
}
