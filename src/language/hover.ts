import * as vscode from 'vscode';
import * as info from "./wordinfo";

class TasmHoverProvider implements vscode.HoverProvider {
	async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output:vscode.MarkdownString=new vscode.MarkdownString()
			let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
			if(range){
				let word = document.getText(range).toLowerCase();
				let char=/'(.)'/.exec(word)
				if(char) output.appendMarkdown(info.getcharMsg(char[1]));
				let keyword = info.GetKeyword(word)
				// let proc = findProc(word)
				// let macro = findMacro(word),label=findLabel(word);
				if(info.isNumberStr(word)){
					output.appendMarkdown(info.getNumMsg(word));}
				// else if(proc !== undefined){
				// 	output.appendCodeblock("assembly","(Procedure) " + proc.name)
				// 		output.appendMarkdown( proc.description.des)
				// 		output.appendCodeblock("assembly", proc.description.paramsString())
				// 		output.appendCodeblock("assembly", proc.description.outputs())
				// }else if(macro !== undefined) {
				// 	if(macro.short){
				// 		output.appendCodeblock("assembly","(Macro) " + macro.name + " => " + macro.des.des)
				// 	}else{
				// 		output.appendCodeblock("assembly","(Macro) " + macro.name)
				// 		output.appendText(macro.des.des)
				// 		output.appendCodeblock("assembly",macro.des.paramsStringMac())
				// 		output.appendCodeblock("assembly",macro.des.outputs()	)					
				// 	}
				// }
				else if(keyword !== undefined){
				let md=info.getType(keyword.type)+" **"+keyword.name+"**\n\n"+keyword.def
				output.appendMarkdown(md)
				output.appendCodeblock("Syntax: " + keyword.data)
				}
				//else if(label !== undefined){
				// 	output.appendCodeblock('assembly','(Label) ' + label.name + " => " + label.value)
				// }
			}
		return new vscode.Hover(output);}
}

export function hoveractivate(context: vscode.ExtensionContext) {
	if(vscode.workspace.getConfiguration('masmtasm.language').get('hover'))context.subscriptions.push(vscode.languages.registerHoverProvider('assembly',new TasmHoverProvider()));
}

