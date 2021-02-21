import * as vscode from 'vscode';
import * as down from './downloadFile';

const fs = vscode.workspace.fs;

class RESOURCES {
    static unincluded: { sectionof: string, list: { name: string, id: string }[] }[] = [
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
    ]
    static links = [
        'https://raw.fastgit.org/MicrosoftDocs/{repoName}/live/',
        'https://raw.githubusercontent.com/MicrosoftDocs/{repoName}/live/'
    ]
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
        //bg: "bg-bg",//pl-pl vscode not support
        // "en-GB": "en-gb",
        // hu: "hu-hu"
    }
    static getlinks(id: string, lang: string): string[] {
        const links = [...RESOURCES.links];
        if (lang === 'zh-cn') {
            links.unshift('https://gitee.com/dosasm/cpp-docs.zh-cn/raw/live/')
        }
        let repoName = 'cpp-docs';
        const pre = 'docs/assembler/masm/';
        if (lang && Object.keys(RESOURCES.langMap).includes(lang)) {
            repoName += `.${RESOURCES.langMap[lang]}`
        }
        return links.map(
            val => val.replace('{repoName}', repoName) + pre + id + '.md'
        )
    }
    static generateFromCppdoc(text: string): CppdocInfoCollection {
        const collection = [];
        let title = "", section = "";
        for (const line of text.split('\n')) {
            let r = /\[`(.*?)`.*?\]\((.*?)\)/g;
            let re = r.exec(line);
            if (re && re.length === 3 && section !== 'See also') {
                const name = re[1];
                const id = re[2].replace('.md', '');
                let item = RESOURCES.unincluded.find(
                    val => val.sectionof === name
                )
                if (item) {
                    item.list.forEach(
                        val => {
                            collection.push({ section, name: val.name, id: val.id })
                        }
                    )
                }
                collection.push({ section, name, id })
            }
            else if (line.startsWith('## ')) {
                section = line.replace('## ', '');
            }
            else if (line.startsWith('# ')) {
                title = line.replace('# ', '')
            }
            else {
                console.log(line)
            }
        }
        return collection;
    }
}

type CppdocInfoCollection = {
    section: string;
    name: string;
    id: string;
}[]


export class Cppdoc {
    static references = ['operators-reference', 'symbols-reference', 'directives-reference'];
    private missing: string[] = [];
    private collections: CppdocInfoCollection[] = [];
    private get dstFolder() { return vscode.Uri.joinPath(this.ctx.globalStorageUri, 'cpp-docs'); }

    constructor(private ctx: vscode.ExtensionContext) {
        Cppdoc.references.forEach(
            ref => {
                const s = ctx.globalState.get(this.storageKey(ref)) as CppdocInfoCollection;
                if (s) {
                    this.collections.push(s)
                } else {
                    this.missing.push(ref)
                }
            }
        );
    }

    static async create(ctx: vscode.ExtensionContext) {
        const out = new Cppdoc(ctx);
        await out.addMissing();
        return out;
    }

    private storageKey(val: string) {
        return `masmtasm.cpp-docs.${val}.${vscode.env.language}`
    }

    async addMissing() {
        const stillmiss = [];
        await fs.createDirectory(this.dstFolder)
        for (const ref of this.missing) {
            const text = await this.getText(ref);
            if (text) {
                let collection = RESOURCES.generateFromCppdoc(text);
                this.ctx.globalState.update(this.storageKey(ref), collection);
                this.collections.push(collection);
            } else {
                stillmiss.push(ref)
            }
        }
        this.missing = stillmiss;
    }

    private async getText(ref: string) {
        const links = RESOURCES.getlinks(ref, vscode.env.language);

        const dst = vscode.Uri.joinPath(this.dstFolder, `${ref}.md`);
        const code = await down.downloadFromMultiSources(links, dst.fsPath);
        if (code) {
            const arr = await fs.readFile(dst);
            return arr.toString();
        }
        return undefined;
    }

    public async GetKeyword(word: string): Promise<vscode.MarkdownString | undefined> {
        for (const collect of this.collections) {
            for (const item of collect) {
                if (item.name.toLowerCase() === word.toLowerCase()) {
                    let mainpart, context = await this.getText(item.id);
                    if (context) {
                        mainpart = context.replace(/---[\s\S]+?---/g, '')//remove header
                            .replace(/\.md\)/g, ')')
                            .replace(/\]\(/g, '](https://docs.microsoft.com/cpp/assembler/masm/')

                    } else {
                        mainpart = `<https://docs.microsoft.com/cpp/assembler/masm/${item.id}>`
                    }
                    const md = new vscode.MarkdownString(`**${word}** ${item.section}`);
                    md.appendMarkdown(mainpart);
                    return md;
                }
            }
        }
        return undefined;

    }
}

