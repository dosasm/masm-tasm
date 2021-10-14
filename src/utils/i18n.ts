import { workspace, ExtensionContext, env, Uri } from "vscode";
const fs = workspace.fs;

let text: { [id: string]: string } | null = null;

export async function loadI18n(context: ExtensionContext): Promise<void> {
    if (env.language === 'zh-cn') {
        const uri = Uri.joinPath(context.extensionUri, '/i18n/i18n.zh-cn.json');
        const data = await fs.readFile(uri);
        text = JSON.parse(data.toString());
    }
}

export function localize(key: string, value: string, ...args: string[]): string {
    if (text && Object.keys(text).includes(key)) {
        value = text[key];
    }
    for (const argidx in args) {
        value = value.replace(`{${argidx}}`, args[argidx]);
    }
    return value;
}