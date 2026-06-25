/**
 * Rename provider.
 * Renames a symbol across the current document and all related files.
 * Supports renaming labels, variables, procedures, macros, segments, structures, and constants.
 */

import * as vscode from 'vscode';
import { DocumentAnalysis } from '../analysis';
import { workspaceManager } from '../workspace';
import { SymbolKind } from '../symbol';
import { TokenType } from '../tokens';

export class AsmRenameProvider implements vscode.RenameProvider {
    prepareRename(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string }> {
        const analysis = DocumentAnalysis.get(document);
        const tok = analysis.getTokenAtPosition(position.line, position.character);
        if (!tok) {
            return Promise.reject('Cannot rename this element');
        }

        // Cannot rename instructions, registers, directives, operators, etc.
        if (tok.type === TokenType.Instruction ||
            tok.type === TokenType.Register ||
            tok.type === TokenType.Directive ||
            tok.type === TokenType.Operator ||
            tok.type === TokenType.SizeDirective ||
            tok.type === TokenType.Number ||
            tok.type === TokenType.String ||
            tok.type === TokenType.Comment) {
            return Promise.reject('Cannot rename this element');
        }

        // Verify it's a known symbol
        const symbol = analysis.findSymbol(tok.text);
        if (!symbol) {
            // Also check workspace symbols
            const visible = workspaceManager.getVisibleSymbols(document.uri.toString());
            const wsSymbol = visible.lookup(tok.text);
            if (wsSymbol.length === 0) {
                return Promise.reject('Cannot rename this element — not a defined symbol');
            }
        }

        const range = new vscode.Range(tok.line, tok.column, tok.line, tok.column + tok.text.length);
        return { range, placeholder: tok.text };
    }

    provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.WorkspaceEdit> {
        const analysis = DocumentAnalysis.get(document);
        const tok = analysis.getTokenAtPosition(position.line, position.character);
        if (!tok) { return undefined; }

        const oldName = tok.text;
        if (oldName === newName) { return undefined; }

        const edit = new vscode.WorkspaceEdit();
        const upperOld = oldName.toUpperCase();

        // Collect all references across the workspace
        const allAnalyses = DocumentAnalysis.getAll();

        for (const fileAnalysis of allAnalyses) {
            const fileUri = vscode.Uri.parse(fileAnalysis.uri);
            for (const fileToken of fileAnalysis.tokens) {
                if (fileToken.text.toUpperCase() === upperOld && fileToken.type !== TokenType.Eof) {
                    const range = new vscode.Range(
                        fileToken.line,
                        fileToken.column,
                        fileToken.line,
                        fileToken.column + fileToken.text.length,
                    );
                    edit.replace(fileUri, range, newName);
                }
            }
        }

        return edit;
    }
}
