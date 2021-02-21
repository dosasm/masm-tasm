import { env, MarkdownString, Uri, workspace } from "vscode";

const fs = workspace.fs;

interface InstructionsJSON {
    linkprefix: string;
    sections: string[];
    from: string;
    collection: [
        /**the code of section */
        number,
        /**the keyword name */
        string | string[],
        /**the summary */
        string,
        /**link path of https://www.felixcloutier.com/x86/ */
        string,
        /**i18n */
        { [id: string]: string }
    ][];
}

export class Instructions {

    static async create(fileuri: Uri): Promise<Instructions> {
        const arr = await fs.readFile(fileuri);
        const json = JSON.parse(arr.toString());
        return new Instructions(json);
    }

    constructor(private target: InstructionsJSON) {
    }
    public GetKeyword(word: string): MarkdownString | undefined {
        const item = this.target.collection.find(
            val => {
                if (typeof val[1] === 'string') {
                    return val[1].toLowerCase() === word.toLowerCase()
                } else if (Array.isArray(val[1])) {
                    if (val[1].some(v => v.toLowerCase() === word.toLowerCase())) {
                        return val
                    }
                }
            }
        );
        if (item) {
            const md = new MarkdownString(`**${word}** ${this.target.sections[item[0]]}\n\n`);
            if (typeof (item[4]) === 'object' && Object.keys(item[4]).includes(env.language)) {
                md.appendMarkdown(`${item[4][env.language]}\n\n`);
            } else {
                md.appendMarkdown(`${item[2]}\n\n`);
            }
            if (item[3]) {
                if (item[3].startsWith('http')) {
                    md.appendMarkdown(`[link](${item[3]})\n\n`);
                } else {
                    md.appendMarkdown(`- [link on ${this.target.from}](${this.target.linkprefix}${item[3]})\n\n`);
                }
            }
            return md;
        }
        return undefined;
    }
}