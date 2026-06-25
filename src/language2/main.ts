/**
 * Entry point for the language2 module.
 * Registers all VS Code language providers for the assembly language.
 * This replaces src/language/main.ts for the desktop extension.
 */

import * as vscode from 'vscode';
import { workspaceManager } from './workspace';
import { DocumentAnalysis } from './analysis';

import { AsmHoverProvider } from './providers/hover';
import { AsmDocumentSymbolProvider, AsmWorkspaceSymbolProvider } from './providers/symbols';
import { AsmDefinitionProvider } from './providers/definition';
import { AsmReferenceProvider } from './providers/reference';
import { AsmRenameProvider } from './providers/rename';
import { AsmCompletionProvider } from './providers/completion';
import { AsmFormattingProvider } from './providers/formatting';

export function activate(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration('masmtasm.language');

    // ─── Workspace Events ───────────────────────────────────────────────
    // Track document lifecycle for multi-file support
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => {
            if (doc.languageId === 'assembly') {
                workspaceManager.onDocumentChange(doc);
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.languageId === 'assembly') {
                workspaceManager.onDocumentChange(e.document);
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => {
            if (doc.languageId === 'assembly') {
                workspaceManager.onDocumentClose(doc.uri.toString());
            }
        }),
    );

    // Index currently open assembly files
    for (const doc of vscode.workspace.textDocuments) {
        if (doc.languageId === 'assembly') {
            workspaceManager.onDocumentChange(doc);
        }
    }

    // ─── Hover Provider ─────────────────────────────────────────────────
    if (config.get<boolean>('Hover')) {
        context.subscriptions.push(
            vscode.languages.registerHoverProvider('assembly', new AsmHoverProvider(context)),
        );
    }

    // ─── Programmatic Features ──────────────────────────────────────────
    if (config.get<boolean>('programmaticFeatures')) {
        // Document symbols (outline view)
        context.subscriptions.push(
            vscode.languages.registerDocumentSymbolProvider('assembly', new AsmDocumentSymbolProvider()),
        );

        // Workspace symbols (Ctrl+T global search)
        context.subscriptions.push(
            vscode.languages.registerWorkspaceSymbolProvider(new AsmWorkspaceSymbolProvider()),
        );

        // Go-to-definition
        context.subscriptions.push(
            vscode.languages.registerDefinitionProvider('assembly', new AsmDefinitionProvider()),
        );

        // Find all references
        context.subscriptions.push(
            vscode.languages.registerReferenceProvider('assembly', new AsmReferenceProvider()),
        );

        // Rename symbol ⭐ NEW
        context.subscriptions.push(
            vscode.languages.registerRenameProvider('assembly', new AsmRenameProvider()),
        );

        // Auto-completion
        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                'assembly',
                new AsmCompletionProvider(),
                ' ', ',', '[', '.', ':',
            ),
        );

        // Document formatting
        context.subscriptions.push(
            vscode.languages.registerDocumentFormattingEditProvider('assembly', new AsmFormattingProvider()),
        );
    }
}
