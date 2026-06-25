/**
 * Document formatting provider.
 * Aligns instructions, operands, and comments; manages casing;
 * and handles indentation. Operates on the AST and token stream
 * for more reliable formatting than the original line-based approach.
 */

import * as vscode from 'vscode';
import { eolString } from '../../utils/eol';
import { DocumentAnalysis } from '../analysis';
import { AstNode, AstRange } from '../nodes';
import { TokenType } from '../tokens';

// ─── Configuration ──────────────────────────────────────────────────────────

type CaseType = 'upper' | 'lower' | 'title' | 'off';

interface FormatConfig {
    tab: boolean;
    tabSize: number;
    align: 'indent' | 'label' | 'segment';
    instructionCase: CaseType;
    registerCase: CaseType;
    directiveCase: CaseType;
    operatorCase: CaseType;
    alignOperand: boolean;
    alignTrailingComment: boolean;
    alignSingleLineComment: boolean;
    spaceAfterComma: 'always' | 'never' | 'off';
}

function loadFormatConfig(options: vscode.FormattingOptions): FormatConfig {
    const config = vscode.workspace.getConfiguration('masmtasm.language.Format');
    const tab = !options.insertSpaces;
    const tabSize = options.tabSize;

    const casing = config.get<{ instruction: CaseType; register: CaseType; directive: CaseType; operator: CaseType }>('casing');

    return {
        tab,
        tabSize,
        align: config.get<'indent' | 'label' | 'segment'>('align') ?? 'segment',
        instructionCase: casing?.instruction ?? 'off',
        registerCase: casing?.register ?? 'off',
        directiveCase: casing?.directive ?? 'off',
        operatorCase: casing?.operator ?? 'off',
        alignOperand: config.get<boolean>('alignOperand') ?? true,
        alignTrailingComment: config.get<boolean>('alignTrailingComment') ?? true,
        alignSingleLineComment: config.get<boolean>('alignSingleLineComment') ?? true,
        spaceAfterComma: config.get<'always' | 'never' | 'off'>('spaceAfterComma') ?? 'off',
    };
}

// ─── Formatting Provider ────────────────────────────────────────────────────

export class AsmFormattingProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken,
    ): vscode.TextEdit[] {
        const config = loadFormatConfig(options);
        const analysis = DocumentAnalysis.get(document);
        const textEdits: vscode.TextEdit[] = [];

        // Get the original text lines
        const lines: string[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            lines.push(document.lineAt(i).text);
        }

        // Format each top-level block
        for (const node of analysis.ast.children) {
            if (token.isCancellationRequested) { return textEdits; }

            const blockRange = node.range;
            const startLine = blockRange.start.line;
            const endLine = blockRange.end.line;

            // Get the lines for this block
            const blockLines = lines.slice(startLine, endLine + 1);

            // Apply formatting
            const formatted = this.formatBlock(blockLines, node, config);

            // Create a single text edit for the block
            const range = new vscode.Range(
                startLine, 0,
                endLine, document.lineAt(endLine).text.length,
            );
            textEdits.push(new vscode.TextEdit(range, formatted.join(eolString(document.eol))));
        }

        return textEdits;
    }

    private formatBlock(lines: string[], node: AstNode, config: FormatConfig): string[] {
        const result = [...lines];

        // Apply casing transforms to every line
        for (let i = 0; i < result.length; i++) {
            result[i] = this.applyCasing(result[i], config);
        }

        // Apply alignment based on the block type
        if (config.align === 'segment') {
            this.alignSegment(result, config);
        }

        // Align trailing comments
        if (config.alignTrailingComment) {
            this.alignTrailingComments(result, config);
        }

        // Align single-line comments
        if (config.alignSingleLineComment) {
            this.alignSingleLineComments(result, config);
        }

        // Space after comma
        if (config.spaceAfterComma !== 'off') {
            for (let i = 0; i < result.length; i++) {
                result[i] = adjustSpaceAfterComma(result[i], config.spaceAfterComma === 'always');
            }
        }

        return result;
    }

    private applyCasing(line: string, config: FormatConfig): string {
        let result = line;

        // Skip comment-only lines for directive casing
        if (/^\s*;/.test(result)) { return result; }

        // Apply instruction casing
        if (config.instructionCase !== 'off') {
            result = this.convertInstructionCase(result, config.instructionCase);
        }

        // Apply register casing
        if (config.registerCase !== 'off') {
            result = convertRegisterCase(result, config.registerCase);
        }

        // Apply directive casing
        if (config.directiveCase !== 'off') {
            result = convertDirectiveCase(result, config.directiveCase);
        }

        // Apply operator casing
        if (config.operatorCase !== 'off') {
            result = convertOperatorCase(result, config.operatorCase);
        }

        return result;
    }

    private convertInstructionCase(line: string, toCase: CaseType): string {
        // Match instruction mnemonics (second word on the line, or first if no label)
        return line.replace(
            /(?<=^(?:\w+\s*:\s*)?)([A-Za-z_][A-Za-z0-9_]*)/,
            (match) => convertCase(match, toCase),
        );
    }

    private alignSegment(lines: string[], config: FormatConfig): void {
        // Find the max widths of name, operator, and operand columns
        let maxName = 0, maxOp = 0, maxOperand = 0;

        for (const line of lines) {
            const parsed = parseLineForAlignment(line);
            if (parsed.name) { maxName = Math.max(maxName, parsed.name.length + (parsed.isLabel ? 1 : 0)); }
            if (parsed.operator) { maxOp = Math.max(maxOp, parsed.operator.length); }
            if (parsed.operand) { maxOperand = Math.max(maxOperand, parsed.operand.length); }
        }

        // Re-format each line with alignment
        for (let i = 0; i < lines.length; i++) {
            const parsed = parseLineForAlignment(lines[i]);
            if (!parsed.operator && !parsed.operand) { continue; }

            const indent = config.tab ? '\t' : ' '.repeat(config.tabSize);
            let result = '';

            if (parsed.name) {
                result += parsed.name + (parsed.isLabel ? ':' : ' ');
                const pad = maxName - parsed.name.length - (parsed.isLabel ? 1 : 0);
                result += ' '.repeat(Math.max(0, pad));
            } else {
                result += indent;
            }

            if (parsed.operator) {
                result += parsed.operator;
                if (config.alignOperand && parsed.operand) {
                    result += ' '.repeat(Math.max(0, maxOp - parsed.operator.length));
                }
                result += ' ';
            }

            if (parsed.operand) {
                result += parsed.operand;
            }

            if (parsed.comment) {
                if (config.alignTrailingComment) {
                    const pad = maxName + 1 + maxOp + 1 + maxOperand - result.length;
                    result += ' '.repeat(Math.max(1, pad));
                } else {
                    result += parsed.commentSpacing;
                }
                result += parsed.comment;
            }

            lines[i] = result.trimEnd();
        }
    }

    private alignTrailingComments(lines: string[], config: FormatConfig): void {
        // Find the maximum column position for trailing comments
        let maxCol = 0;
        for (const line of lines) {
            const commentIdx = line.indexOf(';');
            if (commentIdx > 0 && commentIdx < line.length - 1) {
                maxCol = Math.max(maxCol, commentIdx);
            }
        }

        if (maxCol === 0) { return; }

        // Align comments to the max column
        for (let i = 0; i < lines.length; i++) {
            const commentIdx = lines[i].indexOf(';');
            if (commentIdx > 0) {
                const before = lines[i].substring(0, commentIdx).trimEnd();
                const comment = lines[i].substring(commentIdx);
                const pad = Math.max(1, maxCol - before.length);
                lines[i] = before + ' '.repeat(pad) + comment;
            }
        }
    }

    private alignSingleLineComments(lines: string[], config: FormatConfig): void {
        for (let i = lines.length - 1; i >= 0; i--) {
            if (/^\s*;/.test(lines[i])) {
                // This is a comment-only line — align it to the next non-empty line
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
}

// ─── Line Parsing for Alignment ─────────────────────────────────────────────

interface ParsedLine {
    name?: string;
    isLabel: boolean;
    operator?: string;
    operand?: string;
    comment?: string;
    commentSpacing: string;
}

function parseLineForAlignment(line: string): ParsedLine {
    const result: ParsedLine = { isLabel: false, commentSpacing: '' };

    // Remove leading whitespace for parsing
    const trimmed = line.trimStart();
    const indent = line.substring(0, line.length - trimmed.length);

    // Check for comment-only line
    if (trimmed.startsWith(';')) {
        result.comment = trimmed;
        return result;
    }

    // Split at comment
    let mainPart = trimmed;
    let commentPart = '';
    const commentIdx = findCommentStart(trimmed);
    if (commentIdx >= 0) {
        mainPart = trimmed.substring(0, commentIdx).trimEnd();
        commentPart = trimmed.substring(commentIdx);
        result.comment = commentPart;
        result.commentSpacing = trimmed.substring(mainPart.length, commentIdx);
    }

    // Parse: [name (:| )] [operator] [operand]
    const parts = mainPart.split(/\s+/);
    let idx = 0;

    if (idx < parts.length) {
        const word = parts[idx];
        // Check if it's a label (name followed by colon)
        if (idx + 1 < parts.length && parts[idx + 1] === ':') {
            result.name = word;
            result.isLabel = true;
            idx += 2; // skip name and colon
        } else if (idx + 1 < parts.length) {
            // Could be a variable (name followed by data directive)
            const next = parts[idx + 1].toUpperCase();
            if (['DB', 'DW', 'DD', 'DQ', 'DF', 'DT', 'EQU', 'TEXTEQU'].includes(next)) {
                result.name = word;
                idx++;
            }
        }
    }

    if (idx < parts.length) {
        result.operator = parts[idx];
        idx++;
    }

    if (idx < parts.length) {
        result.operand = parts.slice(idx).join(' ');
    }

    return result;
}

function findCommentStart(line: string): number {
    let inQuote: string | undefined;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "'" || ch === '"') {
            if (inQuote === ch) { inQuote = undefined; }
            else if (!inQuote) { inQuote = ch; }
        }
        if (ch === ';' && !inQuote) { return i; }
    }
    return -1;
}

// ─── Case Conversion ────────────────────────────────────────────────────────

function convertCase(word: string, toCase: CaseType): string {
    switch (toCase) {
        case 'upper': return word.toUpperCase();
        case 'lower': return word.toLowerCase();
        case 'title': {
            if (word.length === 0) { return word; }
            const firstIndex = word.search(/[a-zA-Z]/);
            if (firstIndex === -1) { return word; }
            return word.slice(0, firstIndex) + word[firstIndex].toUpperCase() + word.slice(firstIndex + 1).toLowerCase();
        }
        default: return word;
    }
}

function convertCaseFor(str: string, toCase: CaseType, regex: RegExp): string {
    return str.replace(regex, (match) => {
        if (!match) { return match; }
        return convertCase(match, toCase);
    });
}

function convertRegisterCase(str: string, toCase: CaseType): string {
    const regex = /\b(EAX|EBX|ECX|EDX|AX|BX|CX|DX|AL|AH|BL|BH|CL|CH|DL|DH|CS|DS|ES|FS|GS|SS|DI|SI|BP|SP|IP|CR[01234]|GDTR|IDTR|LDTR|TR|DR[0-7]|TR[3-7]|R[0-7])\b/gi;
    return convertCaseFor(str, toCase, regex);
}

function convertDirectiveCase(str: string, toCase: CaseType): string {
    const regex = /(?<!\S)(\.ALLOCSTACK|\.ENDPROLOG|PROC|\.PUSHFRAME|\.PUSHREG|\.SAVEREG|\.SAVEXMM128|\.SETFRAME|ALIGN|EVEN|LABEL|ORG|ELSE|ELSEIF|ELSEIF2|IF|IF2|IFB|IFNB|IFDEF|IFNDEF|IFDIF|IFDIFI|IFE|IFIDN|IFIDNI|\.BREAK|\.CONTINUE|\.ELSE|\.ELSEIF|\.ENDIF|\.ENDW|\.IF|\.REPEAT|\.UNTIL|\.UNTILCXZ|\.WHILE|\.ERR|\.ERR2|\.ERRB|\.ERRDEF|\.ERRDIF|\.ERRDIFI|\.ERRE|\.ERRIDN|\.ERRIDNI|\.ERRNB|\.ERRNDEF|\.ERRNZ|DB|DW|DD|DQ|DF|DT|BYTE|SBYTE|DWORD|SDWORD|FWORD|QWORD|REAL4|REAL8|REAL10|TBYTE|WORD|SWORD|=|EQU|TEXTEQU|\.CREF|\.LIST|\.LISTALL|\.LISTIF|\.LISTMACRO|\.LISTMACROALL|\.NOCREF|\.NOLIST|\.NOLISTIF|\.NOLISTMACRO|PAGE|SUBTITLE|\.TFCOND|TITLE|ENDM|EXITM|GOTO|LOCAL|MACRO|PURGE|ALIAS|ASSUME|COMMENT|ECHO|END|\.FPO|INCLUDE|INCLUDELIB|MMWORD|OPTION|POPCONTEXT|PUSHCONTEXT|\.RADIX|\.SAFESEH|XMMWORD|YMMWORD|ENDP|INVOKE|PROTO|\.386|\.386P|\.387|\.486|\.486P|\.586|\.586P|\.686|\.686P|\.K3D|\.MMX|\.XMM|REPEAT|WHILE|COMM|EXTERN|EXTERNDEF|\.ALPHA|ENDS|GROUP|SEGMENT|\.SEQ|\.CODE|\.CONST|\.DATA|\.DATA\?|\.DOSSEG|\.EXIT|\.FARDATA|\.FARDATA\?|\.MODEL|\.STACK|\.STARTUP|CATSTR|INSTR|SIZESTR|SUBSTR|RECORD|STRUCT|TYPEDEF|UNION)\b/gi;
    return convertCaseFor(str, toCase, regex);
}

function convertOperatorCase(str: string, toCase: CaseType): string {
    const regex = /\b(ABS|ADDR|AND|DUP|REP|EQ|GE|GT|HIGH|HIGH32|HIGHWORD|IMAGEREL|LE|LENGTH|LENGTHOF|LOW|LOW32|LOWWORD|LROFFSET|LT|MASK|MOD|NE|NOT|OFFSET|OPATTR|OR|PTR|SEG|SHL|\.TYPE|SECTIONREL|SHORT|SHR|SIZE|SIZEOF|THIS|TYPE|WIDTH|XOR)\b/gi;
    return convertCaseFor(str, toCase, regex);
}

function adjustSpaceAfterComma(str: string, addSpace: boolean): string {
    const regex = /(\s*),(\s*)/g;
    if (addSpace) {
        return str.replace(regex, ', ');
    } else {
        return str.replace(regex, ',');
    }
}
