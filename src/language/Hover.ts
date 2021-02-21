import * as vscode from 'vscode';
import { getDocInfo } from "./scanDoc";
import * as info from "./wordinfo";
import { MarkdownString, Uri } from "vscode";
import { Cppdoc } from './hoverFromCppdoc';
import { Instructions } from './hoverForInstructions';

export class AsmHoverProvider implements vscode.HoverProvider {
    cppdoc?: Cppdoc;
    instructions?: Instructions;

    constructor(private ctx: vscode.ExtensionContext) {
        this.update();
    }

    async update(): Promise<void> {
        this.cppdoc = await Cppdoc.create(this.ctx);
        const jsonfile = Uri.joinPath(this.ctx.extensionUri, 'resources/instructions-reference.json');
        this.instructions = await Instructions.create(jsonfile);
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | null | undefined> {
        const range = document.getWordRangeAtPosition(position);
        const docinfo = getDocInfo(document); //scan the document
        const line = docinfo.lines[position.line];
        const md = new MarkdownString();

        if (range) {
            const wordGet = document.getText(range);
            const wordLowCase = wordGet.toLowerCase();

            if (info.isNumberStr(wordLowCase)) {
                md.appendMarkdown(info.getNumMsg(wordLowCase));
                return new vscode.Hover(md);
            }

            const char = /'(.)'/.exec(wordLowCase);
            if (char) {
                md.appendMarkdown(info.getcharMsg(char[1]));
                return new vscode.Hover(md);
            }

            const asmsymbol = docinfo.findSymbol(wordGet); //the word is a symbol?
            if (asmsymbol) {
                return new vscode.Hover(asmsymbol.markdown());
            }

            if (this.instructions && line.operator?.includes(wordGet)) {
                const i = this.instructions.GetKeyword(wordGet);
                if (i) {
                    return new vscode.Hover(i);
                }
            }

            if (this.cppdoc) {
                const cd = await this.cppdoc.GetKeyword(wordLowCase);
                if (cd) { return new vscode.Hover(cd); }
            }
        }
        return undefined;
    }
}

