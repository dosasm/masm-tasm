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

        // Split by <!-- markers to get each entry block
        const blocks = str.split(/(?=<!--)/).filter(b => b.trim());

        for (const block of blocks) {
            const match = /<!--\s*(.+?)\s*-->\n([\s\S]+)/.exec(block);
            if (!match) continue;

            const [, metaStr, content] = match;

            // Parse metadata: "type:1 keyword:mov i18n:zh-cn"
            const head: any = {};
            const parts = metaStr.trim().split(/\s+/);
            for (const part of parts) {
                const colonIdx = part.indexOf(':');
                if (colonIdx === -1) continue;
                const key = part.slice(0, colonIdx);
                const value = part.slice(colonIdx + 1);
                if (key === 'keyword') {
                    head.keyword = value.includes(',') ? value.split(',') : value;
                } else if (key === 'i18n') {
                    head.i18n = value.split(',');
                } else if (key === 'type') {
                    head.type = parseInt(value, 10) as keywordType;
                }
            }

            if (content.includes('---')) {
                const info = content.split('\n---\n').map(s => s.trim());
                target.push({ head, info } as HoverInfoItem);
            }
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
            if (lang !== 'en' && finded.head['i18n'] && finded.head['i18n'].length > 0) {
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