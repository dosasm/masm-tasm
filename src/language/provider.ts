import * as vscode from 'vscode';
import * as info from "./wordinfo";
import * as key from "./keyword";

class AsmHoverProvider implements vscode.HoverProvider {
	async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output: vscode.MarkdownString = new vscode.MarkdownString()
		let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
		info.scanDocumnt(document)//scan the document
		if (range) {
			let wordo = document.getText(range)
			let word = wordo.toLowerCase()

			let char = /'(.)'/.exec(word)//the word is a charactor?
			let keyword = key.GetKeyword(word)//the word is a keyword of assembly?
			let tasmsymbol = info.findSymbol(wordo)//the word is a symbol?

			if (info.isNumberStr(word)) output.appendMarkdown(info.getNumMsg(word));//the word is a number?
			else if (char) output.appendMarkdown(info.getcharMsg(char[1]));
			else if (tasmsymbol) output = tasmsymbol.markdown()
			else if (keyword !== undefined) output = keyword
		}
		return new vscode.Hover(output);
	}
}

class AsmDefProvider implements vscode.DefinitionProvider {
	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output: vscode.Location | undefined
		let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
		info.scanDocumnt(document)//scan thdocumente 
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
		docsymbol = info.scanDocumnt(document)
		return docsymbol
	}

}

class AsmReferenceProvider implements vscode.ReferenceProvider {
	provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken) {
		let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character))
		let output: vscode.Location[] = []
		info.scanDocumnt(document)//scan thdocumente 
		if (range) {
			let word = document.getText(range)
			output = info.getrefer(word, document)
		}
		return output
	}
}
class AsmDocFormat implements vscode.DocumentFormattingEditProvider {
	provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
		return info.codeformatting(document, options)
	}
}
export function provider(context: vscode.ExtensionContext) {
	let uri = vscode.Uri.joinPath(context.extensionUri, "./scripts/keyword.json")
	vscode.workspace.fs.readFile(uri).then(
		(text) => {
			key.Dictionary(text.toString())
		}
	)
	context.subscriptions.push(vscode.languages.registerHoverProvider('assembly', new AsmHoverProvider()));
	context.subscriptions.push(vscode.languages.registerDefinitionProvider("assembly", new AsmDefProvider()));
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("assembly", new Asmsymbolprovider()))
	context.subscriptions.push(vscode.languages.registerReferenceProvider("assembly", new AsmReferenceProvider()))
	context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider("assembly", new AsmDocFormat()))
}

