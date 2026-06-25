/**
 * Find-references provider.
 * Locates all usages of a symbol across the document (and optionally workspace).
 */

import * as vscode from 'vscode';
import { DocumentAnalysis } from '../analysis';
import { workspaceManager } from '../workspace';
import { TokenType } from '../tokens';

export class AsmReferenceProvider implements vscode.ReferenceProvider {
    provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
    ): vscode.Location[] {
        const analysis = DocumentAnalysis.get(document);
        const token = analysis.getTokenAtPosition(position.line, position.character);
        if (!token) { return []; }

        // Don't find references for instructions or registers
        if (token.type === TokenType.Instruction || token.type === TokenType.Register) {
            return [];
        }

        const word = token.text;
        const locations: vscode.Location[] = [];

        // Find the symbol definition first
        const symbol = analysis.findSymbol(word);

        if (context.includeDeclaration && symbol) {
            const defUri = vscode.Uri.parse(symbol.containingFile);
            const defRange = new vscode.Range(
                symbol.definition.start.line,
                symbol.definition.start.character,
                symbol.definition.end.line,
                symbol.definition.end.character,
            );
            locations.push(new vscode.Location(defUri, defRange));
        }

        // Search current document
        this.findReferencesInDocument(analysis, word, document.uri, locations);

        // If the symbol is defined with PUBLIC or is a macro, search across workspace
        if (symbol && (symbol.scope === 'global' || symbol.kind === 0 /* SymbolKind.Segment */)) {
            const allAnalyses = DocumentAnalysis.getAll();
            for (const otherAnalysis of allAnalyses) {
                if (otherAnalysis.uri === analysis.uri) { continue; }
                const otherUri = vscode.Uri.parse(otherAnalysis.uri);
                this.findReferencesInDocument(otherAnalysis, word, otherUri, locations);
            }
        }

        return locations;
    }

    private findReferencesInDocument(
        analysis: DocumentAnalysis,
        word: string,
        uri: vscode.Uri,
        locations: vscode.Location[],
    ): void {
        const upperWord = word.toUpperCase();
        for (const tok of analysis.tokens) {
            if (tok.text.toUpperCase() === upperWord && tok.type !== TokenType.Eof) {
                locations.push(new vscode.Location(
                    uri,
                    new vscode.Range(tok.line, tok.column, tok.line, tok.column + tok.text.length),
                ));
            }
        }
    }
}
