import * as vscode from 'vscode';
import { getDocInfo } from "./scanDoc";
import * as info from "./wordinfo";
import { MarkdownString, env, Uri, workspace } from "vscode";
import { getType } from "./wordinfo";
//TODO: collect hover information to show
export class AsmHoverProvider implements vscode.HoverProvider {
    hoverDict: HoverDICT;
    constructor(uri: vscode.Uri) {
        this.hoverDict = new HoverDICT(uri);
    }
    async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover> {
        let output: vscode.MarkdownString = new vscode.MarkdownString();
        const range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
        const docinfo = getDocInfo(document); //scan the document
        if (range) {
            const wordo = document.getText(range);
            const word = wordo.toLowerCase();

            const char = /'(.)'/.exec(word); //the word is a charactor?
            const keyword = this.hoverDict.GetKeyword(word); //the word is a keyword of assembly?
            const tasmsymbol = docinfo.findSymbol(wordo); //the word is a symbol?

            if (info.isNumberStr(word)) { output.appendMarkdown(info.getNumMsg(word)); } //the word is a number?
            else if (char) { output.appendMarkdown(info.getcharMsg(char[1])); }
            else if (tasmsymbol) { output = tasmsymbol.markdown(); }
            else if (keyword !== undefined) { output = keyword; }
        }
        return new vscode.Hover(output);
    }
}

interface KEYINFO {
    name: string;
    syntax?: string;
    info?: string;
    chs?: string;
    alias?: string[];
}
function markdown(key: KEYINFO, type: string): MarkdownString {
    const md = new MarkdownString(getType(type) + " **" + key.name + "**\n\n");
    let description = key.info;
    if (env.language === "zh-cn" && key.chs) { description = key.chs; }
    md.appendMarkdown(description + "\n\n");
    if (key.alias) {
        let msg = "alias: ";
        let i: number;
        for (i = 0; i < key.alias.length - 1; i++) {
            msg += "`" + key.alias[i] + "`,";
        }
        msg += "`" + key.alias[i] + "`";
        md.appendMarkdown(msg);
    }
    md.appendCodeblock("Syntax: " + key.syntax, "assembly");
    return md;
}

export class HoverDICT {
    KEYWORD_DICONTARY: { [id: string]: KEYINFO[] } | undefined;
    constructor(fileuri: Uri) {
        workspace.fs.readFile(fileuri).then(
            (value) => {
                const hoverJSON = JSON.parse(value.toString());
                this.KEYWORD_DICONTARY = hoverJSON;
            }
        );
    }
    public GetKeyword(word: string): MarkdownString | undefined {
        let res: KEYINFO;
        if (this.KEYWORD_DICONTARY) {
            for (const n in this.KEYWORD_DICONTARY) {
                if (Array.isArray(this.KEYWORD_DICONTARY[n])) {
                    //console.log(n)
                    for (let i = 0; i < this.KEYWORD_DICONTARY[n].length; i++) {
                        const keyword = this.KEYWORD_DICONTARY[n][i];
                        if (keyword.name === word) { res = keyword; return markdown(res, n); }
                        if (keyword.alias) {
                            for (let i = 0; i < keyword.alias.length; i++) {
                                const alia = keyword.alias[i];
                                if (alia === word) { res = keyword; return markdown(res, n); }
                            }
                        }
                    }
                }
            }
        }
        return;
    }
}


