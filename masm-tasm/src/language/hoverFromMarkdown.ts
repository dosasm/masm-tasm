import * as yaml from 'js-yaml';
import { env, Uri, workspace } from 'vscode';
import { keywordType } from './Hover';
const fs = workspace.fs;

interface HoverInfoItem {
    head: {
        type: keywordType;
        keyword: string | string[];
        'i18n': string[];
    };
    info: string[];
}

/**get hover information from markdown*/
export class HoverFromMarkdown {
    constructor(private target: HoverInfoItem[]) {

    }
    static async create(uri: Uri): Promise<HoverFromMarkdown> {
        const arr = await fs.readFile(uri);
        const str = new TextDecoder().decode(arr).replace(/\r\n/g, '\n');
        const target: HoverInfoItem[] = [];
        const regex = /```yaml\n([\s\S]+?)\n```([\s\S]+?)(?=```)/g;
        let re = regex.exec(str);
        while (re?.length === 3) {
            const [, yamlcode, content] = re;
            const head = yaml.load(yamlcode);
            if (content.includes('---')) {
                const info = content.split('\n---\n');
                target.push({ head, info } as HoverInfoItem);
            }
            re = regex.exec(str);
        }
        return new HoverFromMarkdown(target);
    }

    findKeyword(word: string, types: keywordType[]): string | undefined {
        const compare = (val1: string, val2: string): boolean => val1.toLowerCase() === val2.toLowerCase();
        const finded = this.target.find(
            val => {
                const key = val.head?.keyword;
                if (types.includes(val.head.type)) {
                    if (key && typeof key === 'string') {
                        return compare(key, word);
                    } else if (Array.isArray(key)) {
                        return key.some(val => compare(val, word));
                    }
                }
                return false;
            }
        );
        if (finded) {
            let idx = 0;
            const lang = env.language;
            if (lang !== 'en' && Object.keys(finded.head).includes('i18n')) {
                const idx2 = finded.head['i18n'].findIndex(val => val === lang);
                idx = idx2 > -1 ? idx2 + 1 : 0;
            }
            if (finded.info.length > idx) {
                return finded.info[idx];
            } else {
                return finded.info[0];
            }
        }
    }
}

