import * as vscode from 'vscode';
import * as conf from '../utils/configuration';

const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

const emu = [
    conf.DosEmulatorType.jsdos,
    conf.DosEmulatorType.dosbox,
    conf.DosEmulatorType.dosboxX,
    conf.DosEmulatorType.msdos
];

const asm = [
    conf.Assembler['MASM-v5.00'],
    conf.Assembler['MASM-v6.11'],
    conf.Assembler.TASM
];

const iterms: string[] = [];
for (const e of emu) {
    for (const a of asm) {
        if (e === conf.DosEmulatorType.msdos) {
            if (a === conf.Assembler.TASM || a === conf.Assembler['MASM-v6.11'])
                continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((process as any).browser && e !== conf.DosEmulatorType.jsdos) {
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

    if (process.platform === 'win32') {
        emu.push(conf.DosEmulatorType.msdos);
    }

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