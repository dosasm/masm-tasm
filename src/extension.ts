import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import { provider } from './language/provider';
import { AsmCommands } from './ASM/main';

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export function activate(context: vscode.ExtensionContext) {
	console.log(localize("activate.hello", 'Congratulations, your extension "masm-tasm" is now active!'));
	//provide programmaic language features like hover,references,outline(symbol)
	provider(context);
	//run and debug the code in dosbox or msdos-player by TASM ot MASM
	AsmCommands(context);
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('extension deactivated');
}
