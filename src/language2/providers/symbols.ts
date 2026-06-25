/**
 * Document symbol provider (outline) and workspace symbol provider.
 * Walks the AST to produce a hierarchical symbol tree for the editor.
 */

import * as vscode from 'vscode';
import { DocumentAnalysis } from '../analysis';
import { workspaceManager } from '../workspace';
import { AstNode, AstRange, SegmentNode, ProcNode, MacroNode, StructNode } from '../nodes';
import { SymbolKind } from '../symbol';

// ─── Document Symbol Provider ───────────────────────────────────────────────

export class AsmDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const analysis = DocumentAnalysis.get(document);
        return astToDocumentSymbols(analysis.ast.children, document);
    }
}

function astToDocumentSymbols(nodes: AstNode[], document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];

    for (const node of nodes) {
        switch (node.kind) {
            case 'segment': {
                const range = toVsRange(node.range);
                const selectionRange = toVsRange(node.nameRange);
                const sym = new vscode.DocumentSymbol(
                    node.name,
                    node.directive,
                    vscode.SymbolKind.Class,
                    range,
                    selectionRange,
                );
                sym.children = astToDocumentSymbols(node.children, document);
                symbols.push(sym);
                break;
            }
            case 'proc': {
                const range = toVsRange(node.range);
                const selectionRange = toVsRange(node.nameRange);
                const sym = new vscode.DocumentSymbol(
                    node.name,
                    `PROC ${node.attributes}`.trim(),
                    vscode.SymbolKind.Function,
                    range,
                    selectionRange,
                );
                sym.children = astToDocumentSymbols(node.children, document);
                symbols.push(sym);
                break;
            }
            case 'macro': {
                const range = toVsRange(node.range);
                const selectionRange = toVsRange(node.nameRange);
                const sym = new vscode.DocumentSymbol(
                    node.name,
                    node.parameters.length > 0 ? `(${node.parameters.join(', ')})` : 'MACRO',
                    vscode.SymbolKind.Module,
                    range,
                    selectionRange,
                );
                sym.children = astToDocumentSymbols(node.children, document);
                symbols.push(sym);
                break;
            }
            case 'struct': {
                const range = toVsRange(node.range);
                const selectionRange = toVsRange(node.nameRange);
                const sym = new vscode.DocumentSymbol(
                    node.name,
                    node.keyword,
                    vscode.SymbolKind.Struct,
                    range,
                    selectionRange,
                );
                sym.children = node.fields.map(f => {
                    const fRange = toVsRange(f.range);
                    const fSelRange = f.nameRange ? toVsRange(f.nameRange) : fRange;
                    return new vscode.DocumentSymbol(
                        f.name ?? '(anonymous)',
                        f.dataType,
                        vscode.SymbolKind.Field,
                        fRange,
                        fSelRange,
                    );
                });
                symbols.push(sym);
                break;
            }
            case 'label': {
                const range = toVsRange(node.range);
                const sym = new vscode.DocumentSymbol(
                    node.name,
                    'label',
                    vscode.SymbolKind.Key,
                    range,
                    range,
                );
                symbols.push(sym);
                break;
            }
            case 'variable': {
                if (!node.name) { break; }
                const range = toVsRange(node.range);
                const selectionRange = node.nameRange ? toVsRange(node.nameRange) : range;
                const sym = new vscode.DocumentSymbol(
                    node.name,
                    node.dataType,
                    vscode.SymbolKind.Variable,
                    range,
                    selectionRange,
                );
                symbols.push(sym);
                break;
            }
            case 'constant': {
                const range = toVsRange(node.range);
                const sym = new vscode.DocumentSymbol(
                    node.name,
                    node.equateType,
                    vscode.SymbolKind.Constant,
                    range,
                    toVsRange(node.nameRange),
                );
                symbols.push(sym);
                break;
            }
            case 'extern': {
                const range = toVsRange(node.range);
                const sym = new vscode.DocumentSymbol(
                    node.name,
                    node.directive,
                    vscode.SymbolKind.Interface,
                    range,
                    toVsRange(node.nameRange),
                );
                symbols.push(sym);
                break;
            }
        }
    }

    return symbols;
}

// ─── Workspace Symbol Provider ──────────────────────────────────────────────

export class AsmWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
    provideWorkspaceSymbols(query: string): vscode.SymbolInformation[] {
        const results: vscode.SymbolInformation[] = [];
        const upperQuery = query.toUpperCase();

        for (const analysis of DocumentAnalysis.getAll()) {
            for (const sym of analysis.symbolTable.getAll()) {
                if (upperQuery && !sym.name.toUpperCase().includes(upperQuery)) {
                    continue;
                }
                const kind = symbolKindToVscode(sym.kind);
                const uri = vscode.Uri.parse(sym.containingFile);
                const range = toVsRange(sym.definition);
                results.push(
                    new vscode.SymbolInformation(
                        sym.name,
                        kind,
                        sym.detail ?? '',
                        new vscode.Location(uri, range),
                    )
                );
            }
        }

        return results;
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toVsRange(range: AstRange): vscode.Range {
    return new vscode.Range(
        range.start.line, range.start.character,
        range.end.line, range.end.character,
    );
}

function symbolKindToVscode(kind: SymbolKind): vscode.SymbolKind {
    switch (kind) {
        case SymbolKind.Segment: return vscode.SymbolKind.Class;
        case SymbolKind.Procedure: return vscode.SymbolKind.Function;
        case SymbolKind.Macro: return vscode.SymbolKind.Module;
        case SymbolKind.Structure: return vscode.SymbolKind.Struct;
        case SymbolKind.Label: return vscode.SymbolKind.Key;
        case SymbolKind.Variable: return vscode.SymbolKind.Variable;
        case SymbolKind.Constant: return vscode.SymbolKind.Constant;
        case SymbolKind.Parameter: return vscode.SymbolKind.TypeParameter;
        case SymbolKind.Extern: return vscode.SymbolKind.Interface;
    }
}
