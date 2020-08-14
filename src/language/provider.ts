import * as vscode from 'vscode';
import * as info from "./wordinfo";

class TasmHoverProvider implements vscode.HoverProvider {
	async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output:vscode.MarkdownString=new vscode.MarkdownString()
			let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
			if(range){
				let wordo = document.getText(range)
				let word=wordo.toLowerCase()
				let char=/'(.)'/.exec(word)
				if(char) output.appendMarkdown(info.getcharMsg(char[1]));
				let keyword = info.GetKeyword(word)
				if(info.isNumberStr(word)){
					output.appendMarkdown(info.getNumMsg(word));}
				let tasmsymbol=info.findSymbol(wordo)
				if(tasmsymbol){
					output=tasmsymbol.markdown()
				}
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

class TasmDefProvider implements vscode.DefinitionProvider{
	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output:vscode.Location|undefined
			let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
			if(range){
				let wordo = document.getText(range)
				let tasmsymbol=info.findSymbol(wordo)
				if(tasmsymbol){
					output=tasmsymbol.location
				}
			}
		return output;
	}
}

export function provider(context: vscode.ExtensionContext) {
	info.scanDoc()
	if(vscode.workspace.getConfiguration('masmtasm.language').get('hover'))context.subscriptions.push(vscode.languages.registerHoverProvider('assembly',new TasmHoverProvider()));
	context.subscriptions.push(vscode.languages.registerDefinitionProvider("assembly",new TasmDefProvider()));
}

