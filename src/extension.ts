import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

const localize = nls.config({ messageFormat: nls.MessageFormat.both })();
import { AsmAction } from './runcode';
import { provider } from "./language/provider";
let asm: AsmAction;
export function activate(context: vscode.ExtensionContext) {
	console.log(localize("activate.hello", 'Congratulations, your extension "masm-tasm" is now active!'));
	//provide programmaic language features like hover,references,outline(symbol)
	let programmaticFeatures = vscode.workspace.getConfiguration("masmtasm.language").get("programmaticFeatures");
	if (programmaticFeatures) { provider(context); }
	//run and debug the code in dosbox or msdos-player by TASM ot MASM
	asm = new AsmAction(context);
	let opendosbox = vscode.commands.registerTextEditorCommand('masm-tasm.opendosbox', () => {
		asm.runcode('opendosbox');
	});
	let runASM = vscode.commands.registerTextEditorCommand('masm-tasm.runASM', () => {
		asm.runcode('run');
	});
	let debugASM = vscode.commands.registerTextEditorCommand('masm-tasm.debugASM', () => {
		asm.runcode('debug');
	});
	let cleanalldiagnose = vscode.commands.registerTextEditorCommand('masm-tasm.cleanalldiagnose', () => {
		asm.cleanalldiagnose();
	});
	let dosboxhere = vscode.commands.registerCommand('masm-tasm.dosboxhere', () => {
		asm.runcode('here');
	});
	context.subscriptions.push(opendosbox, runASM, debugASM, cleanalldiagnose, dosboxhere);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (asm) {
		asm.deactivate();
		asm.cleanalldiagnose();
		console.log('extension deactivated');
	}
}
