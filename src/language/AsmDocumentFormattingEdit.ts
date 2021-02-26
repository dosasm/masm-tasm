import * as vscode from 'vscode';
import { DocInfo, linetype, Asmline } from "./scanDoc";
//TODO: offer different operation for different vscode.FormattingOptions
export class AsmDocFormat implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
        const textedits: vscode.TextEdit[] = [];
        const docinfo = DocInfo.getDocInfo(document);
        if (docinfo.tree) {
            docinfo.tree.forEach(
                (item) => {
                    formateline(item.range.start.line, item.range.end.line, docinfo.lines, document, textedits);
                }
            );
        }
        return textedits;
    }
}
function formateline(beg: number, end: number, asmline: Asmline[], document: vscode.TextDocument, formator: vscode.TextEdit[]): vscode.TextEdit[] {
    let namesize = 0, optsize = 0, oprsize = 0,
        str: string | undefined = undefined, r: vscode.Range, i: number;
    //scan the asmlines for information
    for (i = beg; i < end; i++) {
        const item = asmline[i];
        if (item.name) { namesize = item.name.length > namesize ? item.name.length : namesize; }//find the maxlength of label name or variabel name
        if (item.operator) { optsize = item.operator.length > optsize ? item.operator.length : optsize; }//find the maxlength of operator 
        if (item.operand) { oprsize = item.operand.length > oprsize ? item.operand.length : oprsize; }//find the maxlength of operand
    }
    for (i = beg; i < end; i++) {
        str = undefined;
        const item = asmline[i];
        if (item.type === linetype.label || item.type === linetype.variable) {
            str = "\t";
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
                str += "\t" + item.comment;
            }
        }
        else if (item.type === linetype.onlycomment) {
            str = "\t" + item.comment;
        }
        else if (item.main) {
            str = item.main.replace(/\s+/, " ");
            const length: number = namesize + 1 + optsize + 1 + oprsize - str.length;
            if (item.comment) {
                for (let i = 0; i < length; i++) { str += " "; }//后补充空格
                str += "\t\t" + item.comment;
            }
        }
        if (str && str !== item.str) {
            r = new vscode.Range(item.line, 0, item.line, item.str.length);
            formator.push(vscode.TextEdit.replace(document.validateRange(r), str));
        }
    }
    return formator;
}

