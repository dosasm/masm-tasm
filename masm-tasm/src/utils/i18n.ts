import { workspace, ExtensionContext, env, Uri } from "vscode";
import * as defaultMessage from './i18n-default.json';
let localMessage: { [id: string]: string } | null = null;

type MessageKey = keyof (typeof defaultMessage);
const fs = workspace.fs;

export async function loadI18n(context: ExtensionContext): Promise<void> {
    if (env.language === 'zh-cn') {
        const uri = Uri.joinPath(context.extensionUri, '/i18n/i18n.zh-cn.json');
        const data = await fs.readFile(uri);
        localMessage = JSON.parse(data.toString());
    }
}

export function localize(key: MessageKey, ...args: string[]): string {
    let value: string;
    if (localMessage && Object.keys(localMessage).includes(key)) {
        value = localMessage[key];
    } else {
        value = defaultMessage[key];
    }
    for (const argidx in args) {
        value = value.replace(`{${argidx}}`, args[argidx]);
    }
    return value;
}