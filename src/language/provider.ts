import * as vscode from 'vscode';
import { getDocInfo } from "./scanDoc";
import { AsmDocFormat } from './AsmDocumentFormattingEdit';
import { AsmHoverProvider } from './AsmHover';
import { AsmReferenceProvider } from './AsmReference';

class AsmDefProvider implements vscode.DefinitionProvider {
	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output: vscode.Location | undefined;
		let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
		let docinfo = getDocInfo(document);//scan thdocumente 
		if (range) {
			let wordo = document.getText(range);
			let tasmsymbol = docinfo.findSymbol(wordo);
			if (tasmsymbol) {
				output = tasmsymbol.location(document.uri);
			}
		}
		return output;
	}
}
class Asmsymbolprovider implements vscode.DocumentSymbolProvider {
	provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {
		return getDocInfo(document).tree;
	}
}

export function provider(context: vscode.ExtensionContext) {
	let programmaticFeatures = vscode.workspace.getConfiguration("masmtasm.language");
	if (programmaticFeatures.get("Hover")) {
		let uri: vscode.Uri = vscode.Uri.joinPath(context.extensionUri, '/resources/hoverinfo.json');
		context.subscriptions.push(vscode.languages.registerHoverProvider('assembly', new AsmHoverProvider(uri)));
	}
	if (programmaticFeatures.get("programmaticFeatures")) {
		context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("assembly", new Asmsymbolprovider()));
		context.subscriptions.push(vscode.languages.registerDefinitionProvider("assembly", new AsmDefProvider()));
		context.subscriptions.push(vscode.languages.registerReferenceProvider("assembly", new AsmReferenceProvider()));
		context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider("assembly", new AsmDocFormat()));
	}

}

