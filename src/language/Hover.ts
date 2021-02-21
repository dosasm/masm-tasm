import * as vscode from 'vscode';
import { getDocInfo } from "./scanDoc";
import * as info from "./wordinfo";
import { MarkdownString, Uri } from "vscode";
import { Cppdoc } from './hoverFromCppdoc';
import { FELIX } from './hoverFelix';
import { HoverFromMarkdown } from './hoverFromMarkdown';

export enum keywordType {
    other = 0,
    /**- instruction,opcode Mnemonic
     * [info](https://www.felixcloutier.com/x86/)*/
    instruction,
    /**Assembly directives,include Data definitions
     * [info](https://docs.microsoft.com/cpp/assembler/masm/directives-reference)*/
    directive,
    /**symbol [info](https://docs.microsoft.com/cpp/assembler/masm/symbols-referenc) */
    symbol,
    /**operator [info](https://docs.microsoft.com/cpp/assembler/masm/operators-reference) */
    operator,
    register
}

export class AsmHoverProvider implements vscode.HoverProvider {
    /**Hover infomation from [masm part of cppdoc](https://docs.microsoft.com/cpp/assembler/masm/) */
    cppdoc?: Cppdoc;
    /**Hover information from  [felixcloutier.com](https://www.felixcloutier.com/x86/)*/
    felix?: FELIX;
    /**Hover information from `resources/hoverinfo.md`*/
    fromMD?: HoverFromMarkdown;

    constructor(private ctx: vscode.ExtensionContext) {
        this.update();
    }

    async update(): Promise<void> {
        this.cppdoc = await Cppdoc.create(this.ctx);
        const jsonfile = Uri.joinPath(this.ctx.extensionUri, 'resources/instructions-reference.json');
        this.felix = await FELIX.create(jsonfile);
        const mdfile = Uri.joinPath(this.ctx.extensionUri, 'resources/hoverinfo.md');
        this.fromMD = await HoverFromMarkdown.create(mdfile);

    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | null | undefined> {
        const range = document.getWordRangeAtPosition(position);
        const docinfo = getDocInfo(document); //scan the document
        const line = docinfo.lines[position.line];

        if (range) {
            const wordGet = document.getText(range);
            const wordLowCase = wordGet.toLowerCase();

            if (line && line.operator?.includes(wordGet)) {
                const h = await this.getHover(wordGet, [keywordType.instruction]);
                if (h) { return h; }
            }

            if (line && line.operand?.includes(wordGet)) {

                const md = new MarkdownString();
                if (info.isNumberStr(wordLowCase)) {
                    md.appendMarkdown(info.getNumMsg(wordLowCase));
                    return new vscode.Hover(md);
                }

                const char = /'(.)'/.exec(wordLowCase);
                if (char && line.operand?.includes(wordGet)) {
                    md.appendMarkdown(info.getcharMsg(char[1]));
                    return new vscode.Hover(md);
                }

                const h = await this.getHover(wordGet, [keywordType.operator, keywordType.register, keywordType.symbol]);
                if (h) { return h; };
            }

            const asmsymbol = docinfo.findSymbol(wordGet); //the word is a symbol?
            if (asmsymbol) {
                return new vscode.Hover(asmsymbol.markdown());
            }

            const h = await this.getHover(wordGet, [keywordType.other, keywordType.directive, keywordType.register]);
            if (h) { return h; };
        }
        return undefined;
    }

    public async getHover(word: string, types: keywordType[]): Promise<vscode.Hover | undefined> {
        let str = "";

        //get the Hover information markdown file `hoverinfo.md`
        const frommd = this.fromMD?.findKeyword(word, types);
        if (frommd) {
            str += frommd.trimEnd() + '\n\n';
        }

        //add the Hover information from cppdoc
        const cppdoc = await this.cppdoc?.findKeyword(word, types);
        if (cppdoc) {
            str += cppdoc;
        }

        //add the Hover information from https://www.felixcloutier.com/x86/
        if (this.felix && types.includes(keywordType.instruction)) {
            const felix = this.felix?.findKeyword(word);
            str = felix ? felix + '\n---\n\n' : '' + str.trim();
        }

        if (str.trim() === '') {
            return undefined;
        }
        return new vscode.Hover(new MarkdownString(str));
    }
}

