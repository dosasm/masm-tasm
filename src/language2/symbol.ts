/**
 * Symbol table for MASM/TASM assembly language.
 * Tracks definitions of labels, variables, constants, procedures,
 * macros, segments, and structures with scope awareness.
 */

import {
    AstNode, ProgramNode, SegmentNode, ProcNode, MacroNode, StructNode,
    LabelNode, VariableNode, ConstantNode, ExternNode,
    AstRange,
} from './nodes';

// ─── Symbol Kind ────────────────────────────────────────────────────────────

export enum SymbolKind {
    Segment,
    Procedure,
    Macro,
    Structure,
    Label,
    Variable,
    Constant,
    Parameter,
    Extern,
}

// ─── Symbol ─────────────────────────────────────────────────────────────────

export interface Symbol {
    name: string;
    kind: SymbolKind;
    definition: AstRange;
    containingFile: string;  // URI string
    scope: 'global' | 'local';
    type?: string;           // DB/DW/DD etc for variables, NEAR/FAR for procs
    detail?: string;         // extra info for display
}

// ─── Symbol Table ───────────────────────────────────────────────────────────

export class SymbolTable {
    /** name (uppercase) → Symbol[] */
    private symbols: Map<string, Symbol[]> = new Map();

    add(symbol: Symbol): void {
        const key = symbol.name.toUpperCase();
        const existing = this.symbols.get(key);
        if (existing) {
            existing.push(symbol);
        } else {
            this.symbols.set(key, [symbol]);
        }
    }

    /** Find all symbols matching the given name (case-insensitive). */
    lookup(name: string): Symbol[] {
        return this.symbols.get(name.toUpperCase()) ?? [];
    }

    /** Find the first symbol matching name in a specific file. */
    lookupInFile(name: string, fileUri: string): Symbol | undefined {
        return this.lookup(name).find(s => s.containingFile === fileUri);
    }

    /** Get all symbols in this table. */
    getAll(): Symbol[] {
        const result: Symbol[] = [];
        for (const symbols of this.symbols.values()) {
            result.push(...symbols);
        }
        return result;
    }

    /** Get all unique symbol names. */
    getAllNames(): string[] {
        return Array.from(this.symbols.keys());
    }

    /** Merge another symbol table into this one. */
    merge(other: SymbolTable): void {
        for (const [key, symbols] of other.symbols) {
            const existing = this.symbols.get(key);
            if (existing) {
                existing.push(...symbols);
            } else {
                this.symbols.set(key, [...symbols]);
            }
        }
    }

    /** Remove all symbols from a specific file. */
    removeByFile(fileUri: string): void {
        for (const [key, symbols] of this.symbols) {
            const filtered = symbols.filter(s => s.containingFile !== fileUri);
            if (filtered.length === 0) {
                this.symbols.delete(key);
            } else {
                this.symbols.set(key, filtered);
            }
        }
    }

    /** Get the size of the table (total symbol count). */
    get size(): number {
        let count = 0;
        for (const symbols of this.symbols.values()) {
            count += symbols.length;
        }
        return count;
    }
}

// ─── AST → Symbol Table Builder ─────────────────────────────────────────────

/**
 * Walk the AST and extract all symbol definitions into a SymbolTable.
 */
export function buildSymbolTable(ast: ProgramNode, fileUri: string): SymbolTable {
    const table = new SymbolTable();
    walkNodes(ast.children, table, fileUri, 'global');
    return table;
}

function walkNodes(nodes: AstNode[], table: SymbolTable, fileUri: string, scope: 'global' | 'local'): void {
    for (const node of nodes) {
        switch (node.kind) {
            case 'segment':
                table.add({
                    name: node.name,
                    kind: SymbolKind.Segment,
                    definition: node.nameRange,
                    containingFile: fileUri,
                    scope: 'global',
                    detail: node.directive,
                });
                walkNodes(node.children, table, fileUri, 'global');
                break;

            case 'proc':
                table.add({
                    name: node.name,
                    kind: SymbolKind.Procedure,
                    definition: node.nameRange,
                    containingFile: fileUri,
                    scope: 'global',
                    type: node.attributes || undefined,
                    detail: `PROC ${node.attributes}`.trim(),
                });
                walkNodes(node.children, table, fileUri, 'local');
                break;

            case 'macro':
                table.add({
                    name: node.name,
                    kind: SymbolKind.Macro,
                    definition: node.nameRange,
                    containingFile: fileUri,
                    scope: 'global',
                    detail: node.parameters.length > 0 ? `(${node.parameters.join(', ')})` : undefined,
                });
                walkNodes(node.children, table, fileUri, 'local');
                break;

            case 'struct':
                table.add({
                    name: node.name,
                    kind: SymbolKind.Structure,
                    definition: node.nameRange,
                    containingFile: fileUri,
                    scope: 'global',
                    detail: node.keyword,
                });
                for (const field of node.fields) {
                    if (field.name) {
                        table.add({
                            name: field.name,
                            kind: SymbolKind.Variable,
                            definition: field.nameRange!,
                            containingFile: fileUri,
                            scope: 'local',
                            type: field.dataType,
                            detail: `${field.dataType} ${field.value}`.trim(),
                        });
                    }
                }
                break;

            case 'label':
                table.add({
                    name: node.name,
                    kind: SymbolKind.Label,
                    definition: node.nameRange,
                    containingFile: fileUri,
                    scope,
                });
                break;

            case 'variable':
                if (node.name) {
                    table.add({
                        name: node.name,
                        kind: SymbolKind.Variable,
                        definition: node.nameRange!,
                        containingFile: fileUri,
                        scope,
                        type: node.dataType,
                        detail: `${node.dataType} ${node.value}`.trim(),
                    });
                }
                break;

            case 'constant':
                table.add({
                    name: node.name,
                    kind: SymbolKind.Constant,
                    definition: node.nameRange,
                    containingFile: fileUri,
                    scope: 'global',
                    type: node.equateType,
                    detail: `${node.equateType} ${node.value}`.trim(),
                });
                break;

            case 'extern':
                table.add({
                    name: node.name,
                    kind: SymbolKind.Extern,
                    definition: node.nameRange,
                    containingFile: fileUri,
                    scope: 'global',
                    type: node.typeSpec,
                    detail: `${node.directive} ${node.typeSpec}`.trim(),
                });
                break;
        }
    }
}
