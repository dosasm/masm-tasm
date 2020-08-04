import * as vscode from 'vscode';
import {runcode} from './runcode';
let asm:runcode
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "masm-tasm" is now active!');
	asm = new runcode(context);
	let opendosbox = vscode.commands.registerTextEditorCommand('masm-tasm.opendosbox', () => {
		asm.runcode('opendosbox');
	});
	let runASM = vscode.commands.registerTextEditorCommand('masm-tasm.runASM', () => {
		asm.runcode('run');
	});
	let debugASM = vscode.commands.registerTextEditorCommand('masm-tasm.debugASM', () => {
		asm.runcode('debug');
	});
	let cleanalldiagnose=vscode.commands.registerTextEditorCommand('masm-tasm.cleanalldiagnose', () => {
		asm.cleanalldiagnose();
	});
	context.subscriptions.push(opendosbox);
	context.subscriptions.push(runASM);
	context.subscriptions.push(debugASM);
	context.subscriptions.push(cleanalldiagnose);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (asm) {
		asm.deactivate();
		asm.cleanalldiagnose();
		console.log('extendion deactivate')
	}
}
