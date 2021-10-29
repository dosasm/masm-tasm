import { workspace, ExtensionContext, env, Uri } from "vscode";
import * as conf from './configuration';

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

export function actionMessage(act: conf.actionType, file: string, emu: conf.DosEmulatorType, asm: conf.Assembler): string {
    switch (act) {
        case conf.actionType.open:
            return localize("openemu.msg", "open DOS emulator {2} set {1} in folder of: \n\t{0}", file, asm, emu);
        case conf.actionType.run:
            return localize("run.msg", "run code with {1} in {2}\n\t{0}", file, asm, emu);
        case conf.actionType.debug:
            return localize("debug.msg", "debug code with {1} in {2}\n\t{0}", file, asm, emu);
    }
}