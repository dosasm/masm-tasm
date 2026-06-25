/**
 * Per-document analysis cache.
 * Runs the lexer → parser → symbol table pipeline once per document version,
 * then caches the results until the document changes.
 */

import * as vscode from 'vscode';
import { Token } from './tokens';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { ProgramNode, AstNode, AstRange } from './nodes';
import { SymbolTable, Symbol, buildSymbolTable } from './symbol';

export class DocumentAnalysis {
    private static cache: Map<string, DocumentAnalysis> = new Map();

    readonly uri: string;
    readonly version: number;
    readonly tokens: Token[];
    readonly ast: ProgramNode;
    readonly symbolTable: SymbolTable;

    private constructor(document: vscode.TextDocument) {
        this.uri = document.uri.toString();
        this.version = document.version;

        const text = document.getText();

        // Lex
        const lexer = new Lexer(text);
        this.tokens = lexer.tokenize();

        // Parse
        const parser = new Parser(this.tokens);
        this.ast = parser.parse();

        // Build symbol table
        this.symbolTable = buildSymbolTable(this.ast, this.uri);
    }

    /**
     * Get or create the analysis for a document.
     * Returns cached result if the document version hasn't changed.
     */
    static get(document: vscode.TextDocument): DocumentAnalysis {
        const key = document.uri.toString();
        const existing = this.cache.get(key);
        if (existing && existing.version === document.version) {
            return existing;
        }
        const analysis = new DocumentAnalysis(document);
        this.cache.set(key, analysis);
        return analysis;
    }

    /**
     * Invalidate the cache for a specific file.
     */
    static invalidate(uri: string): void {
        this.cache.delete(uri);
    }

    /**
     * Invalidate all cached analyses.
     */
    static invalidateAll(): void {
        this.cache.clear();
    }

    /**
     * Get all cached analyses (for workspace-wide operations).
     */
    static getAll(): DocumentAnalysis[] {
        return Array.from(this.cache.values());
    }

    /**
     * Get the AST node at a specific position.
     */
    getNodeAtPosition(line: number, character: number): AstNode | undefined {
        return findNodeAtPosition(this.ast, line, character);
    }

    /**
     * Get the token at a specific position.
     */
    getTokenAtPosition(line: number, character: number): Token | undefined {
        for (const tok of this.tokens) {
            if (tok.type === 0) { continue; } // skip Eof marker tokens we might have
            if (tok.line === line && tok.column <= character && character <= tok.column + tok.text.length) {
                return tok;
            }
        }
        return undefined;
    }

    /**
     * Find a symbol by name in this document.
     */
    findSymbol(name: string): Symbol | undefined {
        const symbols = this.symbolTable.lookup(name);
        // Prefer symbols defined in this file
        return symbols.find(s => s.containingFile === this.uri) ?? symbols[0];
    }
}

// ─── AST Navigation Helpers ─────────────────────────────────────────────────

/**
 * Recursively find the deepest AST node that contains the given position.
 */
function findNodeAtPosition(node: AstNode, line: number, character: number): AstNode | undefined {
    if (!rangeContainsPosition(node.range, line, character)) {
        return undefined;
    }

    // Check children
    const children = getChildren(node);
    for (const child of children) {
        const found = findNodeAtPosition(child, line, character);
        if (found) { return found; }
    }

    return node;
}

function rangeContainsPosition(range: AstRange, line: number, character: number): boolean {
    if (line < range.start.line || line > range.end.line) { return false; }
    if (line === range.start.line && character < range.start.character) { return false; }
    if (line === range.end.line && character > range.end.character) { return false; }
    return true;
}

function getChildren(node: AstNode): AstNode[] {
    switch (node.kind) {
        case 'program': return node.children;
        case 'segment': return node.children;
        case 'proc': return node.children;
        case 'macro': return node.children;
        case 'struct': return node.fields;
        default: return [];
    }
}
