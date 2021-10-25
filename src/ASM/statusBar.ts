import * as vscode from 'vscode';
import * as conf from '../utils/configuration';

const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

function showStatus() {
    bar.command = 'masmtasm.updateEmuASM';
    bar.text = `${conf.extConf.emulator} ${conf.extConf.asmType}`;
    bar.show();
}

async function statusBarCommand() {
    const _conf = vscode.workspace.getConfiguration('masmtasm.ASM');
    const emu = [
        conf.DosEmulatorType.jsdos,
        conf.DosEmulatorType.dosbox,
        conf.DosEmulatorType.dosboxX
    ];
    if (process.platform === 'win32') {
        emu.push(conf.DosEmulatorType.msdos);
    }

    const asm = [
        conf.ASMTYPE.MASM,
        conf.ASMTYPE.TASM
    ];

    const iterms = [];
    for (const e of emu) {
        for (const a of asm) {
            iterms.push(e + ' ' + a);
        }
    }

    const placeHolder = 'choose DOS environment emulator and assembler';
    const Selected = await vscode.window.showQuickPick(iterms, { placeHolder });
    if (Selected) {
        const [emu1, asm1] = Selected?.split(' ');
        const target = vscode.ConfigurationTarget.Workspace;
        await _conf.update('emulator', emu1, target);
        await _conf.update('MASMorTASM', asm1, target);
        showStatus();
    }
}

export function activate(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('masmtasm.updateEmuASM', statusBarCommand);
    context.subscriptions.push(disposable);
    showStatus();
}