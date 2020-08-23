import * as vscode from 'vscode';
import * as info from "./wordinfo";

class AsmHoverProvider implements vscode.HoverProvider {
	async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output: vscode.MarkdownString = new vscode.MarkdownString()
		let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
		if (range) {
			let wordo = document.getText(range)
			let word = wordo.toLowerCase()
			let char = /'(.)'/.exec(word)
			if (char) output.appendMarkdown(info.getcharMsg(char[1]));
			let keyword = info.GetKeyword(word)
			if (info.isNumberStr(word)) {
				output.appendMarkdown(info.getNumMsg(word));
			}
			let tasmsymbol = info.findSymbol(wordo)
			if (tasmsymbol) {
				output = tasmsymbol.markdown()
			}
			else if (keyword !== undefined) output = keyword.markdown()
			//else if(label !== undefined){
			// 	output.appendCodeblock('assembly','(Label) ' + label.name + " => " + label.value)
			// }
		}
		return new vscode.Hover(output);
	}
}

class AsmDefProvider implements vscode.DefinitionProvider {
	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output: vscode.Location | undefined
		let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
		if (range) {
			let wordo = document.getText(range)
			let tasmsymbol = info.findSymbol(wordo)
			if (tasmsymbol) {
				output = tasmsymbol.location
			}
		}
		return output;
	}
}
class Asmsymbolprovider implements vscode.DocumentSymbolProvider {
	provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {
		let docsymbol: vscode.DocumentSymbol[] = []
		docsymbol = info.getVscSymbols(document)
		return docsymbol
	}

}

class AsmReferenceProvider implements vscode.ReferenceProvider {
	provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken) {
		let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character))
		let output: vscode.Location[] = []
		if (range) {
			let word = document.getText(range)
			output = info.getrefer(word, document)
		}
		return output
	}
}
class AsmDocFormat implements vscode.DocumentFormattingEditProvider {
	provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken):vscode.TextEdit[] {
		info.getVscSymbols(document)//scan the document
		return info.codeformatting(document, options)
	}
}
export function provider(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerHoverProvider('assembly', new AsmHoverProvider()));
	context.subscriptions.push(vscode.languages.registerDefinitionProvider("assembly", new AsmDefProvider()));
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("assembly", new Asmsymbolprovider()))
	context.subscriptions.push(vscode.languages.registerReferenceProvider("assembly", new AsmReferenceProvider()))
	context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider("assembly", new AsmDocFormat()))
}

