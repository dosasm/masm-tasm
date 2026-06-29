import * as vscode from "vscode";
import { DosEmulatorType } from "./types";
import * as config from "./config";

const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

const emu = [
    DosEmulatorType.jsdos,
    DosEmulatorType.jsdosX,
    DosEmulatorType.dosbox,
    DosEmulatorType.dosboxX,
];

function buildItems(): string[] {
    const items: string[] = [];
    const actions = config.getActions();
    for (const a of Object.keys(actions)) {
        for (const e of emu) {
            // In browser, only jsdos is available
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((process as any).browser && e !== DosEmulatorType.jsdos) {
                continue;
            }
            if (actions[a].support && !actions[a].support?.includes(e)) {
                continue;
            }
            items.push(e + "\t" + a);
        }
    }
    return items;
}

function showStatus() {
    bar.command = "masmtasm.updateEmuASM";
    bar.text = `${config.getEmulator()} ${config.getAssembler()}`;
    bar.show();
}

async function statusBarCommand() {
    const _conf = vscode.workspace.getConfiguration("masmtasm.ASM");
    const items = buildItems();
    const placeHolder = "choose DOS environment emulator and assembler";
    const selected = await vscode.window.showQuickPick(items, { placeHolder });
    if (selected) {
        const [emu1, asm1] = selected.split("\t");
        const target = vscode.ConfigurationTarget.Global;
        await _conf.update("emulator", emu1, target);
        await _conf.update("assembler", asm1, target);
        showStatus();
    }
}

export function activate(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand("masmtasm.updateEmuASM", statusBarCommand);
    context.subscriptions.push(disposable);
    showStatus();
}
