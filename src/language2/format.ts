/**
 * Pure formatting function for MASM/TASM assembly.
 *
 * Uses the AST to determine line types and applies consistent indentation:
 *   - Labels at column 0 (no indent)
 *   - Instructions indented with tabs (or spaces), operands aligned
 *   - Nested blocks (SEGMENT/PROC/MACRO/STRUCT) get deeper indentation
 *
 * No VS Code dependency — accepts source text, AST, and a simple config.
 */

import {
    AstNode, ProgramNode, SegmentNode, ProcNode, MacroNode, StructNode,
    LabelNode, InstructionNode, VariableNode,
} from './nodes';

// ─── Configuration ─────────────────────────────────────────────────────────

export interface FormatOptions {
    useTab: boolean;
    tabSize: number;
    alignOperand: boolean;
    alignTrailingComment: boolean;
    alignSingleLineComment: boolean;
    spaceAfterComma: 'always' | 'never' | 'off';
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
    useTab: true,
    tabSize: 4,
    alignOperand: true,
    alignTrailingComment: false,
    alignSingleLineComment: true,
    spaceAfterComma: 'off',
};

// ─── Main Entry Point ──────────────────────────────────────────────────────

/**
 * Format assembly source text using the AST for structure.
 *
 * @param sourceLines - Original source lines
 * @param ast - Parsed AST (from Parser.parse())
 * @param options - Formatting options
 * @returns Formatted lines
 */
export function formatSource(
    sourceLines: string[],
    ast: ProgramNode,
    options: FormatOptions = DEFAULT_FORMAT_OPTIONS,
): string[] {
    if (sourceLines.length === 0) { return sourceLines; }

    // Build line → node map (start line → node)
    const nodeMap = new Map<number, AstNode>();
    buildNodeMap(ast.children, nodeMap);

    const result: string[] = [];
    formatBlock(sourceLines, ast.children, nodeMap, 0, options, result);

    // Post-processing passes
    if (options.alignTrailingComment) {
        alignTrailingComments(result);
    }
    if (options.alignSingleLineComment) {
        alignSingleLineComments(result);
    }
    if (options.spaceAfterComma !== 'off') {
        for (let i = 0; i < result.length; i++) {
            result[i] = adjustCommaSpacing(result[i], options.spaceAfterComma === 'always');
        }
    }

    return result;
}

// ─── Block Formatting (recursive) ──────────────────────────────────────────

/**
 * Format lines within a block's range.
 *
 * @param sourceLines - All source lines
 * @param children - AST children of this block
 * @param nodeMap - start line → node mapping
 * @param indent - Current indentation level (0 = top)
 * @param options - Formatting options
 * @param output - Output array to push formatted lines into
 */
function formatBlock(
    sourceLines: string[],
    children: AstNode[],
    nodeMap: Map<number, AstNode>,
    indent: number,
    options: FormatOptions,
    output: string[],
): void {
    // Collect block range from children
    const blockStart = children.length > 0 ? children[0].range.start.line : -1;
    const blockEnd = children.length > 0 ? children[children.length - 1].range.end.line : -1;
    if (blockStart < 0 || blockEnd < 0) { return; }

    // Calculate max mnemonic width for operand alignment within this block
    const maxMnemonic = calcMaxMnemonic(children);

    // Track whether we're inside a section directive (.data, .code, .stack, etc.)
    // Section directives act like block openers — lines after them are indented
    let inSection = false;

    // Process each line in the block's range
    for (let line = blockStart; line <= blockEnd; line++) {
        const node = nodeMap.get(line);

        if (node && isBlockType(node)) {
            // Block node (SEGMENT/PROC/MACRO/STRUCT): recurse
            const blockIndent = inSection ? indent + 1 : indent;
            const blockChildren = getBlockChildren(node);
            output.push(formatLine(sourceLines[line], node, blockIndent, maxMnemonic, options));
            formatBlock(sourceLines, blockChildren, nodeMap, blockIndent + 1, options, output);
            const lastChildEnd = blockChildren.length > 0
                ? blockChildren[blockChildren.length - 1].range.end.line
                : node.range.start.line;
            for (let closingLine = lastChildEnd + 1; closingLine <= node.range.end.line; closingLine++) {
                if (closingLine >= blockStart && closingLine <= blockEnd) {
                    output.push(formatLine(sourceLines[closingLine], undefined, blockIndent, 0, options, true));
                }
            }
            line = node.range.end.line;
        } else if (node && node.kind === 'label' && isSectionDirective((node as LabelNode).name)) {
            // Section directive (.data, .code, .stack, etc.) — acts as a block opener
            inSection = true;
            output.push(formatLine(sourceLines[line], node, indent, maxMnemonic, options));
        } else {
            // Regular line — if we're in a section, use indent+1
            const lineIndent = inSection ? indent + 1 : indent;
            output.push(formatLine(sourceLines[line], node, lineIndent, maxMnemonic, options));
        }
    }
}

/** Check if a label name is a simplified segment directive (.data, .code, etc.) */
function isSectionDirective(name: string): boolean {
    return /^\.(data|code|stack|const|fardata|data\?|fardata\?)$/i.test(name);
}

// ─── Line Formatting ───────────────────────────────────────────────────────

/**
 * Format a single line based on its AST node type.
 */
function formatLine(
    original: string,
    node: AstNode | undefined,
    indent: number,
    maxMnemonic: number,
    options: FormatOptions,
    isClosing = false,
): string {
    // Labels are always at column 0 (no indent)
    if (node && node.kind === 'label') {
        return original.trimStart();
    }

    // Block openers (SEGMENT, PROC, MACRO, STRUCT) use the current indent level
    if (node && isBlockType(node)) {
        return makeIndent(indent, options) + original.trimStart();
    }

    // Closing lines (ENDS, ENDP, ENDM) use the current indent level
    if (isClosing) {
        return makeIndent(indent, options) + original.trimStart();
    }

    // All other lines get at least 1 level of indentation
    const effectiveIndent = Math.max(1, indent);
    const indentStr = makeIndent(effectiveIndent, options);

    if (!node) {
        // No AST node — preserve content with indentation
        return indentStr + original.trimStart();
    }

    switch (node.kind) {
        case 'instruction': {
            const instr = node as InstructionNode;
            const opText = instr.operands.map(o => o.text).join(', ');
            const comment = extractComment(original);

            // Pad mnemonic to align operands
            const pad = ' '.repeat(Math.max(1, maxMnemonic - instr.mnemonic.length + 1));
            let line = indentStr + instr.mnemonic + pad + opText;
            if (comment) {
                line += ' ' + comment;
            }
            return line;
        }

        default: {
            // Variable, constant, directive, include, extern, comment, etc.
            return indentStr + original.trimStart();
        }
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Build a map from start line to AST node for all children (recursive). */
function buildNodeMap(children: AstNode[], map: Map<number, AstNode>): void {
    for (const child of children) {
        const existing = map.get(child.range.start.line);
        // Don't overwrite a label with an instruction (they share the same line)
        if (!existing || (existing.kind !== 'label' && child.kind === 'label')) {
            map.set(child.range.start.line, child);
        }
        if (isBlockType(child)) {
            buildNodeMap(getBlockChildren(child), map);
        }
    }
}

/** Check if a node is a block type (has children). */
function isBlockType(node: AstNode | undefined): boolean {
    if (!node) { return false; }
    return node.kind === 'segment' || node.kind === 'proc' ||
        node.kind === 'macro' || node.kind === 'struct';
}

/** Get children of a block node. StructNode returns its fields. */
function getBlockChildren(node: AstNode): AstNode[] {
    if (node.kind === 'struct') { return (node as StructNode).fields; }
    if (node.kind === 'segment' || node.kind === 'proc' || node.kind === 'macro') {
        return (node as SegmentNode | ProcNode | MacroNode).children;
    }
    return [];
}

/** Calculate the maximum mnemonic length among instruction children. */
function calcMaxMnemonic(children: AstNode[]): number {
    let max = 0;
    for (const child of children) {
        if (child.kind === 'instruction') {
            max = Math.max(max, (child as InstructionNode).mnemonic.length);
        }
        if (isBlockType(child)) {
            max = Math.max(max, calcMaxMnemonic(getBlockChildren(child)));
        }
    }
    return max;
}

/** Generate indentation string for a given level. */
function makeIndent(level: number, options: FormatOptions): string {
    if (level <= 0) { return ''; }
    if (options.useTab) {
        return '\t'.repeat(level);
    }
    return ' '.repeat(options.tabSize * level);
}

/** Extract a trailing comment from a line (e.g. `; comment`). */
function extractComment(line: string): string | undefined {
    let inQuote: string | undefined;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "'" || ch === '"') {
            if (inQuote === ch) { inQuote = undefined; }
            else if (!inQuote) { inQuote = ch; }
        }
        if (ch === ';' && !inQuote) {
            return line.substring(i);
        }
    }
    return undefined;
}

/** Align trailing comments across all lines. */
function alignTrailingComments(lines: string[]): void {
    let maxCol = 0;
    for (const line of lines) {
        const idx = line.indexOf(';');
        if (idx > 0 && idx < line.length - 1) {
            maxCol = Math.max(maxCol, idx);
        }
    }
    if (maxCol === 0) { return; }

    for (let i = 0; i < lines.length; i++) {
        const idx = lines[i].indexOf(';');
        if (idx > 0) {
            const before = lines[i].substring(0, idx).trimEnd();
            const comment = lines[i].substring(idx);
            const pad = Math.max(1, maxCol - before.length);
            lines[i] = before + ' '.repeat(pad) + comment;
        }
    }
}

/** Align standalone comment lines to the indentation of the next non-empty line. */
function alignSingleLineComments(lines: string[]): void {
    for (let i = lines.length - 1; i >= 0; i--) {
        if (/^\s*;/.test(lines[i])) {
            const nextLine = lines[i + 1];
            if (nextLine && nextLine.trim()) {
                const match = nextLine.match(/^\s*/);
                if (match) {
                    lines[i] = match[0] + lines[i].trimStart();
                }
            }
        }
    }
}

/** Adjust spacing after commas. */
function adjustCommaSpacing(line: string, addSpace: boolean): string {
    const regex = /(\s*),(\s*)/g;
    if (addSpace) {
        return line.replace(regex, ', ');
    } else {
        return line.replace(regex, ',');
    }
}
