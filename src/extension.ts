import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

import { AsmAction } from './ASM/runcode';
import { provider } from "./language/provider";
let asm: AsmAction;
export function activate(context: vscode.ExtensionContext) {
	console.log(localize("activate.hello", 'Congratulations, your extension "masm-tasm" is now active!'));
	//provide programmaic language features like hover,references,outline(symbol)
	provider(context);
	//run and debug the code in dosbox or msdos-player by TASM ot MASM
	asm = new AsmAction(context);
	let commands = [
		vscode.commands.registerCommand('masm-tasm.openEmulator', (uri?: vscode.Uri) => {
			return asm.runcode('opendosbox');
		}),
		vscode.commands.registerCommand('masm-tasm.runASM', (uri?: vscode.Uri) => {
			return asm.runcode('run');
		}),
		vscode.commands.registerCommand('masm-tasm.debugASM', (uri?: vscode.Uri) => {
			return asm.runcode('debug');
		}),
		vscode.commands.registerCommand('masm-tasm.cleanalldiagnose', () => {
			asm.cleanalldiagnose();
		}),
		vscode.commands.registerCommand('masm-tasm.dosboxhere', (uri?: vscode.Uri, boxcmd?: string) => {
			return asm.BoxHere(uri, boxcmd);
		})
	];
	context.subscriptions.push(...commands);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (asm) {
		asm.deactivate();
		asm.cleanalldiagnose();
		console.log('extension deactivated');
	}
}
