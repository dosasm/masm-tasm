import * as vscode from 'vscode';
import * as down from './downloadFile';
import { keywordType } from './Hover';

const fs = vscode.workspace.fs;

class RESOURCES {

    static unincluded: { sectionof: string; list: { name: string; id: string }[] }[] = [
        {
            sectionof: 'WORD',
            list: [
                { name: 'DB', id: 'db' },
                { name: 'DD', id: 'dd' },
                { name: 'DF', id: 'df' },
                { name: 'DQ', id: 'dq' },
                { name: 'DT', id: 'dt' },
                { name: 'DW', id: 'dw' }
            ]
        }
    ];

    /**mainly use information from https://github.com/microsoft/vscode-loc */
    static langMap: { [id: string]: string } = {
        "zh-cn": "zh-cn",
        ja: "ja-jp",
        ru: "ru-ru",
        ko: "ko-kr",
        es: "es-es",
        de: "de-de",
        "zh-tw": "zh-tw",
        tr: "tr-tr",
        it: "it-it",
        cs: "cs-cz",
        "pt-br": "pt-br",
        fr: "fr-fr",
        //no resources
        //bg: "bg-bg",
        //"en-GB": "en-gb",
        //hu: "hu-hu"
        //pl-pl has resources but vscode does not support this language 
    };

    static links = [
        'https://raw.fastgit.org/MicrosoftDocs/{repo}/{branch}/',
        'https://raw.githubusercontent.com/MicrosoftDocs/{repo}/{branch}/'
    ];

    static getlinks(id: string, lang: string): string[] {
        const links = [...RESOURCES.links];
        if (lang === 'zh-cn') {
            links.unshift('https://gitee.com/dosasm/cpp-docs.zh-cn/raw/live/');
        }
        let repoName = 'cpp-docs';
        const pre = 'docs/assembler/masm/';
        let branchName = 'master';
        if (lang && Object.keys(RESOURCES.langMap).includes(lang)) {
            repoName += `.${RESOURCES.langMap[lang]}`;
            branchName = 'live';
        }
        return links.map(
            val => val.replace('{repo}', repoName)
                .replace('{branch}', branchName) + pre + id + '.md'
        );
    }

    static generateFromCppdoc(text: string): CppdocInfoCollection {
        const collection = [];
        let section = "";
        for (const line of text.split('\n')) {
            const r = /\[`(.*?)`.*?\]\((.*?)\)/g;
            const re = r.exec(line);
            if (re && re.length === 3 && section !== 'See also') {
                const name = re[1];
                const id = re[2].replace('.md', '');
                const item = RESOURCES.unincluded.find(
                    val => val.sectionof === name
                );
                if (item) {
                    item.list.forEach(
                        val => {
                            collection.push({ section, name: val.name, id: val.id });
                        }
                    );
                }
                collection.push({ section, name, id });
            }
            else if (line.startsWith('## ')) {
                section = line.replace('## ', '');
            }
            else if (line.startsWith('# ')) {
                //title = line.replace('# ', '');
            }
            else {
                //console.log(line);
            }
        }
        return collection;
    }
}

type CppdocInfoCollection = {
    section: string;
    name: string;
    id: string;
}[];

/**offer information of Masm operators,symbols,directives via data from
 * https://github.com/MicrosoftDocs/cpp-docs/tree/master/docs/assembler/masm
 */
export class Cppdoc {
    static references: string[] = ['operators-reference', 'symbols-reference', 'directives-reference'];
    private keywordTypes: keywordType[] = [keywordType.operator, keywordType.symbol, keywordType.directive];
    private collections: CppdocInfoCollection[] = [[], [], []];
    private missing: number[] = [];

    private get dstFolder(): vscode.Uri {
        return vscode.Uri.joinPath(this.ctx.globalStorageUri, 'cpp-docs_' + vscode.env.language);
    }

    constructor(private ctx: vscode.ExtensionContext) {
        Cppdoc.references.forEach(
            (ref, idx) => {
                const key = this.storageKey(ref);
                const s = ctx.globalState.get(key) as CppdocInfoCollection;
                if (s) {
                    this.collections[idx] = s;
                } else {
                    this.missing.push(idx);
                }
            }
        );
    }

    static async create(ctx: vscode.ExtensionContext): Promise<Cppdoc> {
        const out = new Cppdoc(ctx);
        await out.addMissing();
        return out;
    }

    private storageKey(val: string): string {
        return `masmtasm.cpp-docs.${val}.${vscode.env.language}`;
    }

    async addMissing(): Promise<void> {
        const stillmiss: number[] = [];
        await fs.createDirectory(this.dstFolder);
        for (const idx of this.missing) {
            const ref = Cppdoc.references[idx];
            const text = await this.getText(ref);
            if (text) {
                const collection = RESOURCES.generateFromCppdoc(text);
                this.ctx.globalState.update(this.storageKey(ref), collection);
                this.collections[idx] = collection;
            } else {
                stillmiss.push(idx);
            }
        }
        this.missing = stillmiss;
    }

    private async getText(ref: string): Promise<string | undefined> {
        const links = RESOURCES.getlinks(ref, vscode.env.language);

        const dst = vscode.Uri.joinPath(this.dstFolder, `${ref}.md`);
        const code = await down.downloadFromMultiSources(links, dst.fsPath);
        if (code) {
            const arr = await fs.readFile(dst);
            return arr.toString();
        }
        return undefined;
    }

    public async findKeyword(word: string, types: keywordType[]): Promise<string | undefined> {
        for (const type of types) {
            const idx = this.keywordTypes.findIndex(val => val === type);
            if (idx > -1 && idx < this.collections.length) {
                for (const item of this.collections[idx]) {
                    if (item.name.toLowerCase() === word.toLowerCase()) {
                        let md = `**${word}** ${item.section} [📖cpp-doc link](https://docs.microsoft.com/cpp/assembler/masm/${item.id})`;
                        const context = await this.getText(item.id);
                        if (context) {
                            md += context
                                .replace(/---[\s\S]+?---/g, '')//remove header
                                .replace(/\.md\)/g, ')')
                                .replace(/\]\(/g, '](https://docs.microsoft.com/cpp/assembler/masm/');//redirect links
                        }
                        return md;
                    }
                }
            }
        }
        return undefined;
    }
}

