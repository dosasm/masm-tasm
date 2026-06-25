/**
 * AST node types for MASM/TASM assembly language.
 *
 * Uses discriminated unions (the `kind` field) for type-safe pattern matching.
 * Every node carries its own range for precise editor integration.
 */

import { Token, TokenType } from './tokens';

// ─── Range (mirrors vscode.Range shape for zero-dependency) ─────────────────

export interface AstRange {
    start: { line: number; character: number };
    end: { line: number; character: number };
}

// ─── Node Types ─────────────────────────────────────────────────────────────

export type AstNode =
    | ProgramNode
    | SegmentNode
    | ProcNode
    | MacroNode
    | StructNode
    | LabelNode
    | InstructionNode
    | VariableNode
    | ConstantNode
    | DirectiveNode
    | IncludeNode
    | ExternNode
    | CommentNode
    | BlankLineNode;

/** Root node: the entire document. */
export interface ProgramNode {
    kind: 'program';
    children: AstNode[];
    range: AstRange;
}

/**
 * A segment block: `name SEGMENT ... name ENDS` or `.CODE` / `.DATA`.
 * Contains procedures, labels, variables, and instructions.
 */
export interface SegmentNode {
    kind: 'segment';
    name: string;
    nameRange: AstRange;
    directive: string;       // 'SEGMENT', '.CODE', '.DATA', etc.
    children: AstNode[];
    range: AstRange;
}

/**
 * A procedure block: `name PROC [attributes] ... name ENDP`.
 */
export interface ProcNode {
    kind: 'proc';
    name: string;
    nameRange: AstRange;
    attributes: string;      // 'NEAR', 'FAR', 'PUBLIC', etc. (raw text after PROC)
    children: AstNode[];
    range: AstRange;
}

/**
 * A macro block: `name MACRO [params] ... ENDM`.
 */
export interface MacroNode {
    kind: 'macro';
    name: string;
    nameRange: AstRange;
    parameters: string[];    // parameter names
    children: AstNode[];
    range: AstRange;
}

/**
 * A structure/union block: `name STRUCT/UNION ... name ENDS`.
 */
export interface StructNode {
    kind: 'struct';
    name: string;
    nameRange: AstRange;
    keyword: 'STRUCT' | 'UNION' | 'RECORD';
    fields: VariableNode[];
    range: AstRange;
}

/** A label definition: `name:` or standalone `name` on a line. */
export interface LabelNode {
    kind: 'label';
    name: string;
    nameRange: AstRange;
    isNear: boolean;         // true if defined with `:` or as a code label
    range: AstRange;
}

/** An instruction with optional operands: `MOV AX, BX`. */
export interface InstructionNode {
    kind: 'instruction';
    mnemonic: string;
    mnemonicRange: AstRange;
    operands: OperandNode[];
    comment?: CommentNode;
    range: AstRange;
}

/** A variable/data definition: `name DB/DW/DD... value`. */
export interface VariableNode {
    kind: 'variable';
    name: string | undefined; // undefined for anonymous: `DB 10 DUP(?)`
    nameRange: AstRange | undefined;
    dataType: string;          // 'DB', 'DW', 'DD', 'DQ', 'DF', 'DT', 'BYTE', 'DWORD', etc.
    value: string;             // raw text of the operand/value
    valueRange: AstRange;
    comment?: CommentNode;
    range: AstRange;
}

/** A constant defined with EQU or = : `name EQU expr` or `name = expr`. */
export interface ConstantNode {
    kind: 'constant';
    name: string;
    nameRange: AstRange;
    equateType: 'EQU' | 'TEXTEQU' | '=';
    value: string;
    range: AstRange;
}

/** A directive that doesn't fit other categories: `.MODEL`, `ASSUME`, `OPTION`, etc. */
export interface DirectiveNode {
    kind: 'directive';
    name: string;
    nameRange: AstRange;
    arguments: string;       // raw text after the directive
    comment?: CommentNode;
    range: AstRange;
}

/** An INCLUDE or INCLUDELIB directive. */
export interface IncludeNode {
    kind: 'include';
    path: string;            // the filename
    pathRange: AstRange;
    directive: 'INCLUDE' | 'INCLUDELIB';
    range: AstRange;
}

/** An EXTERN/EXTERNDEF/PUBLIC declaration. */
export interface ExternNode {
    kind: 'extern';
    name: string;
    nameRange: AstRange;
    directive: 'EXTERN' | 'EXTERNDEF' | 'PUBLIC' | 'COMM';
    typeSpec: string;        // type specification (e.g., 'PROC', 'NEAR', 'DWORD')
    range: AstRange;
}

/** A standalone comment line or trailing comment. */
export interface CommentNode {
    kind: 'comment';
    text: string;
    range: AstRange;
}

/** A blank or whitespace-only line. */
export interface BlankLineNode {
    kind: 'blank';
    range: AstRange;
}

/** An operand within an instruction or variable definition. */
export interface OperandNode {
    kind: 'operand';
    text: string;            // raw operand text
    tokens: Token[];         // constituent tokens
    range: AstRange;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export function isBlockNode(node: AstNode): node is SegmentNode | ProcNode | MacroNode | StructNode {
    return node.kind === 'segment' || node.kind === 'proc' || node.kind === 'macro' || node.kind === 'struct';
}

export function isNamedNode(node: AstNode): node is SegmentNode | ProcNode | MacroNode | StructNode | LabelNode | VariableNode | ConstantNode {
    return 'name' in node && typeof (node as { name: unknown }).name === 'string';
}

// ─── Range Utilities ────────────────────────────────────────────────────────

export function tokenToRange(token: Token): AstRange {
    return {
        start: { line: token.line, character: token.column },
        end: { line: token.line, character: token.column + token.text.length },
    };
}

export function makeRange(startLine: number, startChar: number, endLine: number, endChar: number): AstRange {
    return {
        start: { line: startLine, character: startChar },
        end: { line: endLine, character: endChar },
    };
}

export function mergeRanges(...ranges: (AstRange | undefined)[]): AstRange {
    const valid = ranges.filter(Boolean) as AstRange[];
    if (valid.length === 0) {
        return makeRange(0, 0, 0, 0);
    }
    let startLine = Infinity, startChar = Infinity;
    let endLine = -Infinity, endChar = -Infinity;
    for (const r of valid) {
        if (r.start.line < startLine || (r.start.line === startLine && r.start.character < startChar)) {
            startLine = r.start.line;
            startChar = r.start.character;
        }
        if (r.end.line > endLine || (r.end.line === endLine && r.end.character > endChar)) {
            endLine = r.end.line;
            endChar = r.end.character;
        }
    }
    return makeRange(startLine, startChar, endLine, endChar);
}

/**
 * Convert an AstRange to a vscode.Range-like tuple [startLine, startCol, endLine, endCol].
 */
export function rangeToTuple(r: AstRange): [number, number, number, number] {
    return [r.start.line, r.start.character, r.end.line, r.end.character];
}
