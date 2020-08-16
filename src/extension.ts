import * as vscode from 'vscode'
import * as nls from 'vscode-nls'

const localize = nls.config({ messageFormat: nls.MessageFormat.both })();
import {runcode} from './runcode'
import  {provider} from "./language/provider"
let asm:runcode
export function activate(context: vscode.ExtensionContext) {
	console.log(localize("active.hello",'Congratulations, your extension "masm-tasm" is now active!'));
	asm = new runcode(context);
	let programmaticFeatures=vscode.workspace.getConfiguration("masmtasm.language").get("programmaticFeatures")
	if(programmaticFeatures) provider(context)
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
	context.subscriptions.push(opendosbox,runASM,debugASM,cleanalldiagnose);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (asm) {
		asm.deactivate();
		asm.cleanalldiagnose();
		console.log('extendion deactivate')
	}
}
