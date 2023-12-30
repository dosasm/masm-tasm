import * as vscode from "vscode";
import { eolString } from "../utils/eol";
import { DocInfo, linetype, Asmline } from "./scanDoc";

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
    instructionCase: "upper" | "lower" | "title" | "off";
    /**
     * The case of registers
     */
    registerCase: "upper" | "lower" | "title" | "off";

    /**
     * The case of directives
     */
    directiveCase: "upper" | "lower" | "title" | "off";
    /**
     * Whether to align the operands
     */
    alignOperand: boolean;
    /**
     * Whether to align the comments
     */
    alignComment: boolean;
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
            instructionCase: "off",
            registerCase: "off",
            directiveCase: "off",
            alignOperand: false,
            alignComment: false,
            spaceAfterComma: "off",
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
                const range = document.validateRange(item.range);
                textedits.push(
                    new vscode.TextEdit(range, newText.join(eolString(document.eol)))
                );
            }
        }
        return textedits;
    }
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
            output.push(
                formatLabelLine(line, alignOpt, {
                    ...size,
                    name: alignSize,
                }, config)
            );
        }
        else if (line.type === linetype.onlycomment) {
            output.push(indentStr(config) + line.comment);
        }
        else if (line.main) {
            let str = line.main.replace(/\s+/, " ");
            if (line.comment) {
                //后补充空格
                str += space(size.name + 1 + size.operator + 1 + size.operand - str.length);
                str += indentStr(config, config.tabSize * 2) + line.comment;
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
    str += line.operator;
    if (line.operand || line.comment) { //操作码后补充空格
        str += `${space(size.operator - operatorLength)} ${line.operand}`;
    }
    if (line.comment) { //操作数后补充空格
        str += `${space(size.operand - operandLength)}${indentStr(config)}${line.comment}`;
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