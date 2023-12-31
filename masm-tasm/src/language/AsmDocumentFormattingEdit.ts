import * as vscode from "vscode";
import { eolString } from "../utils/eol";
import { DocInfo, linetype, Asmline } from "./scanDoc";

type caseType = "upper" | "lower" | "title" | "off";

interface FormatConfig {
    tab: boolean;
    tabSize: number;
    /**
     * Aligning code in different ways
     * - `indent`: indent the code with fixed size
     * - `label`: align the code with the label
     *      - e.g.:
     *         ```asm
     *         DoSomething:
     *                     mov ax, 1
     *          ```
     * - `segment`: consistent code indentation within segments
     */
    align: "indent" | "label" | "segment";
    /**
     * The case of instructions
     * - `upper`: `MOV` `JMP`
     * - `lower`: `mov` `jmp`
     * - `title`: `Mov` `Jmp`
     * - `off`: keep the original case
     */
    instructionCase: caseType;
    /**
     * The case of registers
     */
    registerCase: caseType;
    /**
     * The case of directives
     */
    directiveCase: caseType;
    /**
     * The case of operators
     */
    operatorCase: caseType;
    /**
     * Whether to align the operands
     */
    alignOperand: boolean;
    /**
     * Whether to align the comments
     */
    alignTrailingComment: boolean;
    /**
     * Whether to align the single line comments
     */
    alignSingleLineComment: boolean;
    /**
     * Whether to add a space after the comma
     */
    spaceAfterComma: "always" | "never" | "off";
}



//TODO: offer different operation for different vscode.FormattingOptions
export class AsmDocFormat implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        const config: FormatConfig = {
            tab: !options.insertSpaces,
            tabSize: options.tabSize,
            align: "label",
            instructionCase: "title",
            registerCase: "upper",
            directiveCase: "lower",
            operatorCase: "lower",
            alignOperand: true,
            alignTrailingComment: true,
            alignSingleLineComment: true,
            spaceAfterComma: "always",
        };
        const textedits: vscode.TextEdit[] = [];
        const docinfo = DocInfo.getDocInfo(document);
        if (docinfo.tree) {
            for (const item of docinfo.tree) {
                if (token.isCancellationRequested) {
                    return textedits;
                }
                // const newText = formateline(item.range, docinfo.lines, tabString);
                let newText;
                if (config.align === 'segment') {
                    newText = formatLine(item.range, docinfo.lines, true, config);
                }
                else {
                    newText = align(docinfo.lines, item, config);
                }
                postFormat(newText, config);
                const range = document.validateRange(item.range);
                textedits.push(
                    new vscode.TextEdit(range, newText.join(eolString(document.eol)))
                );
            }
        }
        return textedits;
    }
}

function postFormat(text: string[], config: FormatConfig) {
    for (let i = text.length - 1; i >= 0; i--) {
        // test if current line is a a comment only line, use regexp
        let line = text[i];
        // Remove the trailing spaces
        text[i] = text[i].trimEnd();
        if (/^\s*;/.test(line)) {
            // Align the single line comment
            if (config.alignSingleLineComment && i !== text.length) {
                line = line.trimStart();
                // align the single line comment to the next line, if next line is not empty
                const nextLine = text[i + 1];
                if (nextLine && nextLine !== "") {
                    const match = nextLine.match(/^\s*/);
                    if (match) {
                        text[i] = match[0] + line;
                    }
                }
            }
        }
        else if (config.directiveCase !== 'off') {
            // Convert the case of directives
            text[i] = convertDirectiveCase(text[i], config.directiveCase);
        }
    }
    return text;
}

/**
 * Recursively align the code in a node
 * @param lines 
 * @param node 
 * @param config 
 * @returns 
 */
function align(
    lines: Asmline[],
    node: vscode.DocumentSymbol,
    config: FormatConfig,
) {
    const output: string[] = [];
    output.push(...lines.slice(node.range.start.line, node.range.end.line + 1).map((item) => item.str));
    const childrenRanges = [];
    const children = node.children
        .sort((a, b) => a.range.start.line - b.range.start.line);
    for (let i = 0; i < children.length; i++) {
        const item = children[i];
        const line = lines[item.range.start.line];
        if (line.type === linetype.label && line.name) {
            // Align the code snippets after the label as a group
            const nextChild = node.children[i + 1];
            const endLine = nextChild ? nextChild.range.start.line - 1 : node.range.end.line - 1;
            const range = new vscode.Range(item.range.start.line, 0, endLine, 0);
            formatLine(range, lines, true, config).forEach((str, index) => {
                if (str !== null) {
                    const delta = item.range.start.line + index - node.range.start.line;
                    output[delta] = str;
                }
            });
            childrenRanges.push(range);
        }
        else if (line.type === linetype.variable && line.name) {
            // Merge adjacent variables into a group for alignment
            let last = item.range.start.line;
            while (i < children.length) {
                const curLine = children[i].range.start.line;
                if (lines[curLine].type !== linetype.variable || curLine - last > 1) {
                    break;
                }
                last = curLine;
                i++;
            }
            i--;
            // Now item ~ children[i] are a group of adjacent variables
            // Expand the range to include all lines of the multiline variable
            while (last < node.range.end.line && lines[last + 1].type === linetype.variable) {
                last++;
            }
            const range = new vscode.Range(item.range.start.line, 0, last, 0);
            formatLine(range, lines, true, config).forEach((str, index) => {
                if (str !== null) {
                    const delta = item.range.start.line + index - node.range.start.line;
                    output[delta] = str;
                }
            });
            childrenRanges.push(range);
        }
        else {
            const child = align(lines, item, config);
            const delta = item.range.start.line - node.range.start.line;
            const len = item.range.end.line - item.range.start.line + 1;
            output.splice(delta, len, ...child);
            childrenRanges.push(item.range);
        }
    }

    const result = formatLine(node.range, lines, false, config, childrenRanges);
    result.forEach((str, index) => {
        if (str !== null) {
            output[index] = str;
        }
    });

    return output;
}

interface CodeSize {
    /** The max length of the label or variable name */
    name: number;
    /** The max length of the operator */
    operator: number;
    /** The max length of the operand */
    operand: number;
}

/**
 * Calculate the max length of the label, operator and operand in a range
 * @param lines 
 * @param range 
 * @param excludeRanges The ranges to be excluded, e.g. the children of a block
 * @returns 
 */
function calcCodeSize(
    lines: Asmline[],
    range: vscode.Range,
    excludeRanges?: vscode.Range[]
): CodeSize {
    const size: CodeSize = { name: 0, operator: 0, operand: 0 };
    for (let i = range.start.line; i <= range.end.line; i++) {
        const childIndex = excludeRanges?.findIndex((range) =>
            range.contains(new vscode.Position(i, 0))
        );
        if (excludeRanges && childIndex !== undefined && childIndex !== -1) { // skip the children
            i = excludeRanges[childIndex].end.line;
            continue;
        }
        const line = lines[i];
        if (line.name) {
            if (line.name.length > size.name) {
                size.name = line.name.length;
                if (line.type === linetype.label) {
                    size.name += 1;
                }
            }
        }
        if (line.operator) {
            size.operator = Math.max(size.operator, line.operator.length);
        }
        if (line.operand) {
            size.operand = Math.max(size.operand, line.operand.length);
        }
    }
    return size;
}

/**
 * format a segment of assembly code
 * @param range the range of the code
 * @param lines the array of lines information
 * @param tabString the string to used as tab
 * @param alignOpt whether to align the operator
 * @returns
 */
function formatLine(
    range: vscode.Range,
    lines: Asmline[],
    alignOpt: boolean,
    config: FormatConfig,
    excludeRanges?: vscode.Range[],
): string[] {
    const output: string[] = [];

    //scan the asmlines for information
    const size = calcCodeSize(lines, range, excludeRanges);

    for (let i = range.start.line; i <= range.end.line; i++) {
        const childIndex = excludeRanges?.findIndex((range) =>
            range.contains(new vscode.Position(i, 0))
        );
        if (excludeRanges && childIndex !== undefined && childIndex !== -1) { // skip the children
            const end = excludeRanges[childIndex].end.line;
            const cross = end - i + 1;
            i = end;
            // fill the excluded range with null as placeholder
            output.push(...new Array(cross).fill(null));
            continue;
        }
        const line = lines[i];
        const isLabel = line.type === linetype.label;
        const isVariable = line.type === linetype.variable;
        if (isLabel || isVariable) {
            const alignSize = config.align === 'indent' && isLabel ? config.tabSize - 1 : size.name;
            const str = formatLabelLine(line, alignOpt, {
                ...size,
                name: alignSize,
            }, config);
            output.push(str);
        }
        else if (line.type === linetype.onlycomment) {
            output.push(indentStr(config) + line.comment);
        }
        else if (line.main) {
            let str = line.main.replace(/\s+/, " ");

            if (line.comment) {
                if (config.alignTrailingComment) {
                    //后补充空格
                    str += space(size.name + 1 + size.operator + 1 + size.operand - str.length) + indentStr(config, config.tabSize * 2);
                }
                else {
                    const match = line.str.match(/\s*(?=;)/);
                    if (match) {
                        str += match[0];
                    }
                }
                str += line.comment;
            }
            output.push(str);
        }
        else {
            output.push(line.str);
        }
    }
    return output;
}

function formatLabelLine(
    line: Asmline,
    alignOpt: boolean,
    size: CodeSize,
    config: FormatConfig,
): string {
    const nameLength = line.name?.length || 0;
    const operatorLength = line.operator?.length || 0;
    const operandLength = line.operand?.length || 0;
    const isLabel = line.type === linetype.label;
    const isVariable = line.type === linetype.variable;
    let str = indentStr(config) + (line.name ?? '');

    if (line.name) {
        str += isLabel ? ':' : ' ';
    }

    if ((alignOpt || isVariable) && (line.operator || line.operand)) {
        //标签变量名前补充空格
        let indent = size.name - nameLength;
        if (!line.name) {
            indent++;
        }
        str += line.name ? space(indent) : indentStr(config, indent);
    }
    str += convertCase(line.operator ?? '', config.instructionCase);
    if (line.operand || line.comment) { //操作码后补充空格
        if (config.alignOperand) {
            str += space(size.operator - operatorLength);
        }
        str += ' ';
        let operand = line.operand ?? '';
        if (config.registerCase !== 'off' && line.operand && isLabel) {
            operand = convertRegisterCase(operand, config.registerCase);
        }
        if (config.operatorCase !== 'off' && line.operand) {
            operand = convertOperatorCase(operand, config.operatorCase);
        }
        if (config.spaceAfterComma !== 'off' && line.operand) {
            operand = adjustSpaceAfterComma(operand, config.spaceAfterComma === 'always');
        }
        str += operand;
    }
    if (line.comment) { //操作数后补充空格
        if (config.alignTrailingComment) {
            str += `${space(size.operand - operandLength)}${indentStr(config)}`;
        }
        else {
            // get the original \s before `;` in line.str
            const match = line.str.match(/\s*(?=;)/);
            if (match) {
                str += match[0];
            }
        }
        str += line.comment;
    }
    return str;
}

/**
 * Get a space string with the given size
 * @param size 
 */
function space(size: number) {
    return ' '.repeat(Math.max(0, size));
}

/**
 * Get a indent string with the given size
 * @param size 
 * @param tab 
 * @param tabSize 
 * @returns 
 */
function indentStr(config: { tab: boolean, tabSize: number }, size?: number) {
    const { tab, tabSize } = config;
    size = Math.max(0, size ?? tabSize);
    const indenter = tab ? "\t" : space(tabSize);
    return indenter.repeat(Math.floor(size / tabSize)) + // initial indent
        space(size % tabSize);                           // align indent
}

function convertCase(word: string, toCase: caseType) {
    switch (toCase) {
        case 'upper':
            return word.toUpperCase();
        case 'lower':
            return word.toLowerCase();
        case 'title':
            if (word.length === 0) {
                return word;
            }
            // Find the first letter
            const firstIndex = word.search(/[a-zA-Z]/);
            if (firstIndex === -1) {
                return word;
            }
            const first = word[firstIndex];
            const rest = word.slice(firstIndex + 1);
            return word.slice(0, firstIndex) + first.toUpperCase() + rest.toLowerCase();
        default:
            return word;
    }
}

function convertCaseFor(str: string, toCase: caseType, regex: RegExp) {
    return str.replace(regex, (match) => {
        if (!match) {
            return match;
        }
        return convertCase(match, toCase);
    });
}


function convertRegisterCase(str: string, toCase: caseType) {
    const regex = /(?<!;.*?)\b((?<general>EAX|EBX|ECX|EDX|AX|BX|CX|DX|AL|AH|BL|BH|CL|CH|DL|DH)|(?<segment>CS|DS|ES|FS|GS|SS)|(?<pointer>DI|SI|BP|SP|IP)|(?<control>CR[01234])|(?<ProtectedMode>GDTR|IDTR|LDTR|TR)|(?<DebugTest>DR[0-7]|TR[3-7])|(?<float>R[0-7]))\b(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/gi;

    return convertCaseFor(str, toCase, regex);
}

function convertDirectiveCase(str: string, toCase: caseType) {
    const regex = /(?<!;.*?)(?<!\S)((?<x64>\.ALLOCSTACK|\.ENDPROLOG|PROC|\.PUSHFRAME|\.PUSHREG|\.SAVEREG|\.SAVEXMM128|\.SETFRAME)|(?<CodeLabels>ALIGN|EVEN|LABEL|ORG)|(?<ConditionalAssembly>ELSE|ELSEIF|ELSEIF2|IF|IF2|IFB|IFNB|IFDEF|IFNDEF|IFDIF|IFDIFI|IFE|IFIDN|IFIDNI)|(?<ConditionalControlFlow>\.BREAK|\.CONTINUE|\.ELSE|\.ELSEIF|\.ENDIF|\.ENDW|\.IF|\.REPEAT|\.UNTIL|\.UNTILCXZ|\.WHILE)|(?<ConditionalError>\.ERR|\.ERR2|\.ERRB|\.ERRDEF|\.ERRDIF|\.ERRDIFI|\.ERRE|\.ERRIDN|\.ERRIDNI|\.ERRNB|\.ERRNDEF|\.ERRNZ)|(?<DataAllocation>DB|DW|DD|DQ|DF|DT|ALIGN|BYTE|SBYTE|DWORD|SDWORD|EVEN|FWORD|LABEL|ORG|QWORD|REAL4|REAL8|REAL10|TBYTE|WORD|SWORD)|(?<Equates>=|EQU|TEXTEQU)|(?<ListingControl>\.CREF|\.LIST|\.LISTALL|\.LISTIF|\.LISTMACRO|\.LISTMACROALL|\.NOCREF|\.NOLIST|\.NOLISTIF|\.NOLISTMACRO|PAGE|SUBTITLE|\.TFCOND|TITLE)|(?<Macros>ENDM|EXITM|GOTO|LOCAL|MACRO|PURGE)|(?<Miscellaneous>ALIAS|ASSUME|COMMENT|ECHO|END|\.FPO|INCLUDE|INCLUDELIB|MMWORD|OPTION|POPCONTEXT|PUSHCONTEXT|\.RADIX|\.SAFESEH|XMMWORD|YMMWORD)|(?<Procedures>ENDP|INVOKE|PROC|PROTO)|(?<Processor>\.386|\.386P|\.387|\.486|\.486P|\.586|\.586P|\.686|\.686P|\.K3D|\.MMX|\.XMM)|(?<RepeatBlocks>ENDM|FOR|FORC|GOTO|REPEAT|WHILE)|(?<Scope>COMM|EXTERN|EXTERNDEF|INCLUDELIB|PUBLIC)|(?<Segment>\.ALPHA|ASSUME|\.DOSSEG|END|ENDS|GROUP|SEGMENT|\.SEQ)|(?<SimplifiedSegment>\.CODE|\.CONST|\.DATA|\.DATA\?|\.DOSSEG|\.EXIT|\.FARDATA|\.FARDATA\?|\.MODEL|\.STACK|\.STARTUP)|(?<String>CATSTR|INSTR|SIZESTR|SUBSTR)|(?<StructureAndRecord>ENDS|RECORD|STRUCT|TYPEDEF|UNION))\b(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/gi;

    return convertCaseFor(str, toCase, regex);
}

function convertOperatorCase(str: string, toCase: caseType) {
    const regex = /(?<!;.*?)(?<!\S)(ABS|ADDR|AND|DUP|REP|EQ|GE|GT|HIGH|HIGH32|HIGHWORD|IMAGEREL|LE|LENGTH|LENGTHOF|LOW|LOW32|LOWWORD|LROFFSET|LT|MASK|MOD|NE|NOT|OFFSET|OPATTR|OR|PTR|SEG|SHL|.TYPE|SECTIONREL|SHORT|SHR|SIZE|SIZEOF|THIS|TYPE|WIDTH|XOR)\b(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/gi;

    return convertCaseFor(str, toCase, regex);
}

function adjustSpaceAfterComma(str: string, space: boolean) {
    const regex = /(?<!;.*?)(\s*),(\s*)(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/gi;
    if (space) {
        return str.replace(regex, ', ');
    }
    else {
        return str.replace(regex, ',');
    }
}