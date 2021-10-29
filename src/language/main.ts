import * as vscode from 'vscode';
import { DocInfo } from "./scanDoc";
import { AsmDocFormat } from './AsmDocumentFormattingEdit';
import { AsmHoverProvider } from './Hover';
import { AsmReferenceProvider } from './AsmReference';

class AsmDefProvider implements vscode.DefinitionProvider {
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Definition {
		const range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
		const docinfo = DocInfo.getDocInfo(document);//scan thdocumente 
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
		const sym = DocInfo.getDocInfo(document).tree;
		if (sym) {
			return sym;
		}
		return [];
	}
}

export function activate(context: vscode.ExtensionContext): void {
	const programmaticFeatures = vscode.workspace.getConfiguration("masmtasm.language");
	if (programmaticFeatures.get("Hover")) {
		context.subscriptions.push(vscode.languages.registerHoverProvider('assembly', new AsmHoverProvider(context)));
	}
	if (programmaticFeatures.get("programmaticFeatures")) {
		context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("assembly", new Asmsymbolprovider()));
		context.subscriptions.push(vscode.languages.registerDefinitionProvider("assembly", new AsmDefProvider()));
		context.subscriptions.push(vscode.languages.registerReferenceProvider("assembly", new AsmReferenceProvider()));
		context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider("assembly", new AsmDocFormat()));
	}
}

