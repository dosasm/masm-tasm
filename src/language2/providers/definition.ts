/**
 * Go-to-definition provider.
 * Resolves symbol references to their definition locations,
 * including across files via INCLUDE directives.
 */

import * as vscode from 'vscode';
import { DocumentAnalysis } from '../analysis';
import { workspaceManager } from '../workspace';
import { Symbol, SymbolKind } from '../symbol';
import { TokenType } from '../tokens';

export class AsmDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.Definition | undefined {
        const analysis = DocumentAnalysis.get(document);
        const token = analysis.getTokenAtPosition(position.line, position.character);
        if (!token) { return undefined; }

        // Only resolve definitions for identifiers, labels, and similar
        if (token.type !== TokenType.Identifier &&
            token.type !== TokenType.Instruction &&
            token.type !== TokenType.Register) {
            return undefined;
        }

        // If it's a known instruction or register, don't try to go-to-def
        if (token.type === TokenType.Instruction || token.type === TokenType.Register) {
            return undefined;
        }

        const word = token.text;

        // First, look in the current file's symbol table
        const localSymbol = analysis.symbolTable.lookup(word);
        if (localSymbol.length > 0) {
            return this.symbolToLocation(localSymbol[0], document);
        }

        // Then, look in visible symbols (current file + included files)
        const visibleSymbols = workspaceManager.getVisibleSymbols(document.uri.toString());
        const crossFileSymbol = visibleSymbols.lookup(word);
        if (crossFileSymbol.length > 0) {
            return this.symbolToLocation(crossFileSymbol[0], document);
        }

        // Finally, search the whole workspace
        const allSymbols = workspaceManager.getAllWorkspaceSymbols();
        const workspaceSymbol = allSymbols.lookup(word);
        if (workspaceSymbol.length > 0) {
            return this.symbolToLocation(workspaceSymbol[0], document);
        }

        return undefined;
    }

    private symbolToLocation(symbol: Symbol, document: vscode.TextDocument): vscode.Location {
        const uri = vscode.Uri.parse(symbol.containingFile);
        const range = new vscode.Range(
            symbol.definition.start.line,
            symbol.definition.start.character,
            symbol.definition.end.line,
            symbol.definition.end.character,
        );
        return new vscode.Location(uri, range);
    }
}
