/**
 * Workspace-wide file index and INCLUDE resolution.
 * Tracks all open assembly files, resolves INCLUDE directives,
 * and provides cross-file symbol lookup.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { DocumentAnalysis } from './analysis';
import { SymbolTable, Symbol, SymbolKind } from './symbol';
import { IncludeNode } from './nodes';

export class WorkspaceManager {
    /** file URI string → set of URIs that include it */
    private includedBy: Map<string, Set<string>> = new Map();

    /** file URI string → set of URIs it includes */
    private includes: Map<string, Set<string>> = new Map();

    // ─── Document Lifecycle ─────────────────────────────────────────────

    /**
     * Called when a document is opened or changed.
     * Triggers analysis and updates the include graph.
     */
    onDocumentChange(document: vscode.TextDocument): void {
        if (document.languageId !== 'assembly') { return; }
        const analysis = DocumentAnalysis.get(document);
        this.updateIncludeGraph(document.uri.toString(), analysis);
    }

    /**
     * Called when a document is closed.
     * Removes from cache but keeps include graph (files may be referenced by others).
     */
    onDocumentClose(uri: string): void {
        DocumentAnalysis.invalidate(uri);
    }

    // ─── Include Graph ──────────────────────────────────────────────────

    private updateIncludeGraph(fromUri: string, analysis: DocumentAnalysis): void {
        // Remove old edges from this file
        const oldIncludes = this.includes.get(fromUri);
        if (oldIncludes) {
            for (const target of oldIncludes) {
                this.includedBy.get(target)?.delete(fromUri);
            }
        }

        // Find new includes
        const newIncludes = new Set<string>();
        for (const child of analysis.ast.children) {
            if (child.kind === 'include') {
                const resolved = this.resolveInclude(fromUri, child);
                if (resolved) {
                    newIncludes.add(resolved);
                }
            }
        }

        // Update graph
        this.includes.set(fromUri, newIncludes);
        for (const target of newIncludes) {
            const set = this.includedBy.get(target) ?? new Set();
            set.add(fromUri);
            this.includedBy.set(target, set);
        }
    }

    /**
     * Resolve an INCLUDE directive to an absolute file URI.
     */
    resolveInclude(fromUri: string, includeNode: IncludeNode): string | undefined {
        const includePath = includeNode.path;
        if (!includePath) { return undefined; }

        const fromDir = path.dirname(vscode.Uri.parse(fromUri).fsPath);

        // Strategy 1: relative to the including file
        const candidates = [
            path.resolve(fromDir, includePath),
            path.resolve(fromDir, includePath.toLowerCase()),
            path.resolve(fromDir, includePath.toUpperCase()),
        ];

        // Strategy 2: workspace include paths from configuration
        const config = vscode.workspace.getConfiguration('masmtasm.language');
        const extraPaths = config.get<string[]>('includePaths') ?? [];
        for (const p of extraPaths) {
            candidates.push(path.resolve(p, includePath));
        }

        // Check each candidate
        for (const candidate of candidates) {
            try {
                const uri = vscode.Uri.file(candidate);
                return uri.toString();
            } catch {
                // continue
            }
        }

        return undefined;
    }

    /**
     * Try to find and open an included file.
     */
    async resolveAndOpenInclude(fromUri: string, includePath: string): Promise<vscode.TextDocument | undefined> {
        const fromDir = path.dirname(vscode.Uri.parse(fromUri).fsPath);
        const candidates = [
            path.resolve(fromDir, includePath),
            path.resolve(fromDir, includePath.toLowerCase()),
            path.resolve(fromDir, includePath.toUpperCase()),
        ];

        const config = vscode.workspace.getConfiguration('masmtasm.language');
        const extraPaths = config.get<string[]>('includePaths') ?? [];
        for (const p of extraPaths) {
            candidates.push(path.resolve(p, includePath));
        }

        for (const candidate of candidates) {
            try {
                const uri = vscode.Uri.file(candidate);
                return await vscode.workspace.openTextDocument(uri);
            } catch {
                // continue
            }
        }

        return undefined;
    }

    // ─── Cross-File Symbol Resolution ───────────────────────────────────

    /**
     * Get all symbols visible from a given file (its own + included files).
     */
    getVisibleSymbols(fileUri: string): SymbolTable {
        const merged = new SymbolTable();
        const visited = new Set<string>();
        this.collectSymbols(fileUri, merged, visited);
        return merged;
    }

    private collectSymbols(fileUri: string, table: SymbolTable, visited: Set<string>): void {
        if (visited.has(fileUri)) { return; }
        visited.add(fileUri);

        // Add symbols from this file
        const analysis = DocumentAnalysis.getAll().find(a => a.uri === fileUri);
        if (analysis) {
            table.merge(analysis.symbolTable);
        }

        // Recursively add symbols from included files
        const includes = this.includes.get(fileUri);
        if (includes) {
            for (const includedUri of includes) {
                this.collectSymbols(includedUri, table, visited);
            }
        }
    }

    /**
     * Get all symbols across the entire workspace.
     */
    getAllWorkspaceSymbols(): SymbolTable {
        const merged = new SymbolTable();
        for (const analysis of DocumentAnalysis.getAll()) {
            merged.merge(analysis.symbolTable);
        }
        return merged;
    }

    /**
     * Find all files that include the given file (reverse dependencies).
     */
    getIncludedBy(fileUri: string): string[] {
        return Array.from(this.includedBy.get(fileUri) ?? []);
    }

    /**
     * Get the set of files that a given file includes.
     */
    getIncludes(fileUri: string): string[] {
        return Array.from(this.includes.get(fileUri) ?? []);
    }

    /**
     * Check if one file transitively includes another.
     */
    doesInclude(fromUri: string, targetUri: string): boolean {
        const visited = new Set<string>();
        return this.doesIncludeHelper(fromUri, targetUri, visited);
    }

    private doesIncludeHelper(fromUri: string, targetUri: string, visited: Set<string>): boolean {
        if (visited.has(fromUri)) { return false; }
        visited.add(fromUri);

        const includes = this.includes.get(fromUri);
        if (!includes) { return false; }
        if (includes.has(targetUri)) { return true; }

        for (const included of includes) {
            if (this.doesIncludeHelper(included, targetUri, visited)) {
                return true;
            }
        }
        return false;
    }

    // ─── Workspace-wide Rename ──────────────────────────────────────────

    /**
     * Find all references to a symbol across the workspace.
     * Returns an array of { uri, range } locations.
     */
    findAllReferences(name: string, definitionUri: string): { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }[] {
        const results: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }[] = [];
        const upperName = name.toUpperCase();

        for (const analysis of DocumentAnalysis.getAll()) {
            // Search for occurrences of the symbol name in tokens
            for (const tok of analysis.tokens) {
                if (tok.type !== 0 && tok.text.toUpperCase() === upperName) {
                    results.push({
                        uri: analysis.uri,
                        range: {
                            start: { line: tok.line, character: tok.column },
                            end: { line: tok.line, character: tok.column + tok.text.length },
                        },
                    });
                }
            }
        }

        return results;
    }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const workspaceManager = new WorkspaceManager();
