import * as vscode from 'vscode';
import { ASMTYPE, DosEmulatorType } from '../utils/configuration';

const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

function showStatus() {
    bar.command = 'masmtasm.updateEmuASM';
    const conf = vscode.workspace.getConfiguration('masmtasm.ASM');
    bar.text = `${conf.get("emulator")} ${conf.get('MASMorTASM')}`;
    bar.show();
}

async function statusBarCommand() {
    const conf = vscode.workspace.getConfiguration('masmtasm.ASM');
    const emu = [DosEmulatorType.jsdos, DosEmulatorType.dosbox, DosEmulatorType.dosboxX];
    if (process.platform === 'win32') {
        emu.push(DosEmulatorType.msdos);
    }
    const asm = [ASMTYPE.MASM, ASMTYPE.TASM];

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
        await conf.update('emulator', emu1, target);
        await conf.update('MASMorTASM', asm1, target);
        showStatus();
    }
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('masmtasm.updateEmuASM', statusBarCommand);
    context.subscriptions.push(disposable);
    showStatus();
}