/**
 * Document formatting provider.
 *
 * Delegates to the pure `formatSource()` function from ../format,
 * adding VS Code integration (config loading, TextEdit creation).
 */

import * as vscode from 'vscode';
import { eolString } from '../../utils/eol';
import { DocumentAnalysis } from '../analysis';
import { formatSource, FormatOptions } from '../format';

// ─── Configuration ──────────────────────────────────────────────────────────

type CaseType = 'upper' | 'lower' | 'title' | 'off';

interface FormatConfig extends FormatOptions {
    align: 'indent' | 'label' | 'segment';
    instructionCase: CaseType;
    registerCase: CaseType;
    directiveCase: CaseType;
    operatorCase: CaseType;
}

function loadFormatConfig(options: vscode.FormattingOptions): FormatConfig {
    const config = vscode.workspace.getConfiguration('masmtasm.language.Format');
    const tab = !options.insertSpaces;
    const tabSize = options.tabSize;

    const casing = config.get<{ instruction: CaseType; register: CaseType; directive: CaseType; operator: CaseType }>('casing');

    return {
        useTab: tab,
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

        // Get original text lines
        const sourceLines: string[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            sourceLines.push(document.lineAt(i).text);
        }

        // Format using the pure function
        const formatted = formatSource(sourceLines, analysis.ast, config);

        // Apply casing transforms (not handled by formatSource yet)
        for (let i = 0; i < formatted.length; i++) {
            if (token.isCancellationRequested) { return []; }
            formatted[i] = this.applyCasing(formatted[i], config);
        }

        // Create a single TextEdit replacing the entire document
        const fullRange = new vscode.Range(0, 0, document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
        return [new vscode.TextEdit(fullRange, formatted.join(eolString(document.eol)))];
    }

    private applyCasing(line: string, config: FormatConfig): string {
        let result = line;

        // Skip comment-only lines
        if (/^\s*;/.test(result)) { return result; }

        if (config.instructionCase !== 'off') {
            result = this.convertInstructionCase(result, config.instructionCase);
        }
        if (config.registerCase !== 'off') {
            result = convertRegisterCase(result, config.registerCase);
        }
        if (config.directiveCase !== 'off') {
            result = convertDirectiveCase(result, config.directiveCase);
        }
        if (config.operatorCase !== 'off') {
            result = convertOperatorCase(result, config.operatorCase);
        }

        return result;
    }

    private convertInstructionCase(line: string, toCase: CaseType): string {
        return line.replace(
            /(?<=^(?:\w+\s*:\s*)?)([A-Za-z_][A-Za-z0-9_]*)/,
            (match) => convertCase(match, toCase),
        );
    }
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
