import * as vscode from 'vscode';
import { DocInfo, getDocInfo, linetype } from './scanDoc';
import { KeywordType } from './wordinfo';
export class AsmReferenceProvider implements vscode.ReferenceProvider {
    provideReferences(document: vscode.TextDocument, position: vscode.Position): vscode.Location[] {
        const range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
        let output: vscode.Location[] = [];
        const docinfo = getDocInfo(document); //scan thdocumente 
        if (range) {
            const word = document.getText(range);
            output = getrefer(docinfo, word, document);
        }
        return output;
    }
}
function getrefer(docinfo: DocInfo, word: string, doc: vscode.TextDocument): vscode.Location[] {
    const output: vscode.Location[] = [];
    let r: vscode.Range, skip = false;
    const def = docinfo.findSymbol(word);
    if (def?.location) {
        output.push(def.location(doc.uri));
        docinfo.lines.forEach(
            (item, index) => {
                switch (item.type) {
                    case linetype.macro: skip = true; break;
                    case linetype.endm: skip = false; break;
                    case linetype.label:
                        if (skip === false) {
                            //TODO：match the symbol more exactly
                            if (def?.type === KeywordType.Variable && item.operand?.match(new RegExp("\\b" + word + "\\b"))) {
                                const start = item.str.indexOf(word);
                                r = new vscode.Range(index, start, index, start + word.length);
                            }
                            else if (def?.type === KeywordType.Macro && item.operator === word) {
                                const start = item.str.indexOf(word);
                                r = new vscode.Range(index, start, index, start + word.length);
                            }
                            else if ((def?.type === KeywordType.Procedure || def?.type === KeywordType.Label) && item.operand === word) {
                                const start = item.str.indexOf(word);
                                r = new vscode.Range(index, start, index, start + word.length);
                            }
                            if (r) { output.push(new vscode.Location(doc.uri, r)); }
                        }
                        else {

                        }

                }
            }
        );
    }
    return output;
}