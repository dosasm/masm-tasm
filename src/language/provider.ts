import * as vscode from 'vscode';
import { getDocInfo } from "./scanDoc";
import { AsmDocFormat } from './AsmDocumentFormattingEdit';
import { AsmHoverProvider } from './AsmHover';
import { AsmReferenceProvider } from './AsmReference';

class AsmDefProvider implements vscode.DefinitionProvider {
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Definition {
		const range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
		const docinfo = getDocInfo(document);//scan thdocumente 
		const wordo = document.getText(range);
		const tasmsymbol = docinfo.findSymbol(wordo);
		if (tasmsymbol) {
			return tasmsymbol.location(document.uri);
		}
		return [];
	}
}

class Asmsymbolprovider implements vscode.DocumentSymbolProvider {
	provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
		const sym = getDocInfo(document).tree;
		if (sym) {
			return sym;
		};
		return [];
	}
}

export function provider(context: vscode.ExtensionContext): void {
	const programmaticFeatures = vscode.workspace.getConfiguration("masmtasm.language");
	if (programmaticFeatures.get("Hover")) {
		const uri: vscode.Uri = vscode.Uri.joinPath(context.extensionUri, '/resources/hoverinfo.json');
		context.subscriptions.push(vscode.languages.registerHoverProvider('assembly', new AsmHoverProvider(uri)));
	}
	if (programmaticFeatures.get("programmaticFeatures")) {
		context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("assembly", new Asmsymbolprovider()));
		context.subscriptions.push(vscode.languages.registerDefinitionProvider("assembly", new AsmDefProvider()));
		context.subscriptions.push(vscode.languages.registerReferenceProvider("assembly", new AsmReferenceProvider()));
		context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider("assembly", new AsmDocFormat()));
	}
}

