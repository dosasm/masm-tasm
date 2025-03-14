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
    const items=["show jsdos view","show terminal"]

    const placeHolder = 'manipulate emulator';
    const Selected = await vscode.window.showQuickPick(items, { placeHolder });
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