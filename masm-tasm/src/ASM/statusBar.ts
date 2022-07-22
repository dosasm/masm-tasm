import * as vscode from 'vscode';
import * as conf from '../utils/configuration';

const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

const emu = [
    conf.DosEmulatorType.jsdos,
    conf.DosEmulatorType.dosbox,
    conf.DosEmulatorType.dosboxX,
    conf.DosEmulatorType.msdos
];

const iterms: string[] = [];
for (const a of Object.keys(conf.extConf.actions)) {
    for (const e of emu) {
        //if running in browser only use jsdos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((process as any).browser && e !== conf.DosEmulatorType.jsdos) {
            continue;
        }

        //ignore msdos player by default
        if (conf.extConf.actions[a].support === undefined && e === conf.DosEmulatorType.msdos) {
            continue;
        }

        //hide msdos player in nonwin system
        if (process.platform !== "win32" && e === conf.DosEmulatorType.msdos) {
            continue;
        }

        if (conf.extConf.actions[a].support) {
            if (!conf.extConf.actions[a].support?.includes(e))
                continue;
        }

        iterms.push(e + '\t' + a);
    }
}

function showStatus() {
    bar.command = 'masmtasm.updateEmuASM';
    bar.text = `${conf.extConf.emulator} ${conf.extConf.asmType}`;
    bar.show();
}

async function statusBarCommand() {
    const _conf = vscode.workspace.getConfiguration('masmtasm.ASM');

    const placeHolder = 'choose DOS environment emulator and assembler';
    const Selected = await vscode.window.showQuickPick(iterms, { placeHolder });
    if (Selected) {
        const [emu1, asm1] = Selected?.split('\t');
        const target = vscode.ConfigurationTarget.Global;
        await _conf.update('emulator', emu1, target);
        await _conf.update('assembler', asm1, target);
        showStatus();
    }
}

export function activate(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('masmtasm.updateEmuASM', statusBarCommand);
    context.subscriptions.push(disposable);
    showStatus();
}