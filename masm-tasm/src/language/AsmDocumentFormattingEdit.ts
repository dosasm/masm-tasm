import * as vscode from 'vscode';
import { eolString } from '../utils/eol';
import { DocInfo, linetype, Asmline } from "./scanDoc";

//TODO: offer different operation for different vscode.FormattingOptions
export class AsmDocFormat implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        const textedits: vscode.TextEdit[] = [];
        const tabString = options.insertSpaces ? new Array(options.tabSize).fill(" ").join("") : "\t";
        const docinfo = DocInfo.getDocInfo(document);
        if (docinfo.tree) {
            for (const item of docinfo.tree) {
                if (token.isCancellationRequested) {
                    return textedits;
                }
                const newText = formateline(item.range, docinfo.lines, tabString);
                const range = document.validateRange(item.range);
                textedits.push(new vscode.TextEdit(range, newText.join(eolString(document.eol))));
            }
        }
        return textedits;
    }
}

/**
 * format a segment of assembly code
 * @param range the range of the code
 * @param asmline the array of lines information
 * @param tabString the string to used as tab
 * @returns 
 */
function formateline(range: vscode.Range, asmline: Asmline[], tabString = "\t"): string[] {
    let namesize = 0, optsize = 0, oprsize = 0,
        str: string | undefined = undefined;
    const output: string[] = [];

    //scan the asmlines for information
    for (let i = range.start.line; i <= range.end.line; i++) {
        const item = asmline[i];
        if (item.name) { namesize = item.name.length > namesize ? item.name.length : namesize; }//find the maxlength of label name or variabel name
        if (item.operator) { optsize = item.operator.length > optsize ? item.operator.length : optsize; }//find the maxlength of operator 
        if (item.operand) { oprsize = item.operand.length > oprsize ? item.operand.length : oprsize; }//find the maxlength of operand
    }

    for (let i = range.start.line; i <= range.end.line; i++) {
        str = undefined;
        const item = asmline[i];
        if (item.type === linetype.label || item.type === linetype.variable) {
            str = tabString;
            let length = 0;
            if (item.name?.length) { length = item.name.length; }
            if (item.type === linetype.label && item.name) { str += item.name + ":"; }
            else if (item.type === linetype.variable && item.name) { str += item.name + " "; }
            else { str += " "; }
            for (let i = 0; i < namesize - length; i++) { str += " "; }//标签变量名前补充空格
            str += item.operator;
            if (item.operator?.length) { length = item.operator.length; }
            else { length = 0; }
            if (item.operand || item.comment) {
                for (let i = 0; i < optsize - length; i++) { str += " "; }//操作码后补充空格
                str += " " + item.operand;
            }
            if (item.comment) {
                if (item.operand?.length) { length = item.operand.length; }
                else { length = 0; }
                for (let i = 0; i < oprsize - length; i++) { str += " "; }//操作数后补充空格
                str += tabString + item.comment;
            }
        }
        else if (item.type === linetype.onlycomment) {
            str = tabString + item.comment;
        }
        else if (item.main) {
            str = item.main.replace(/\s+/, " ");
            const length: number = namesize + 1 + optsize + 1 + oprsize - str.length;
            if (item.comment) {
                for (let i = 0; i < length; i++) { str += " "; }//后补充空格
                str += tabString + tabString + item.comment;
            }
        }
        output.push(str && str !== item.str ? str : item.str);
    }
    return output;
}

