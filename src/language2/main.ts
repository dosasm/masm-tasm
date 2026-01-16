import * as vscode from 'vscode';
import * as providers from './providers';
import { AsmHoverProvider } from './hoverProvider/Hover';


export function activate(context: vscode.ExtensionContext): void {
    const programmaticFeatures = vscode.workspace.getConfiguration("masmtasm.language");
    if (programmaticFeatures.get("Hover")) {
        context.subscriptions.push(vscode.languages.registerHoverProvider('assembly', new AsmHoverProvider(context)));
    }
    if (programmaticFeatures.get("programmaticFeatures")) {
        context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("assembly", new providers.Asmsymbolprovider()));
        context.subscriptions.push(vscode.languages.registerDefinitionProvider("assembly", new providers.AsmDefProvider()));
        // context.subscriptions.push(vscode.languages.registerReferenceProvider("assembly", new providers.AsmReferenceProvider()));
        context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider("assembly", new providers.AsmDocFormat()));
    }
}

