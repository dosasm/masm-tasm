import * as vscode from 'vscode';
import { AsmAction, ASMCMD } from './runcode';
import { SeeinCPPDOCS } from './diagnose/codeAction';

/**register commands for run and debug the code
 *  in dosbox or msdos-player by TASM ot MASM */
export function AsmCommands(context: vscode.ExtensionContext) {
    let asm = new AsmAction(context);
    let commands = [
        vscode.commands.registerCommand('masm-tasm.openEmulator', (uri?: vscode.Uri) => {
            return asm.runcode(ASMCMD.OpenEmu);
        }),
        vscode.commands.registerCommand('masm-tasm.runASM', (uri?: vscode.Uri) => {
            return asm.runcode(ASMCMD.run);
        }),
        vscode.commands.registerCommand('masm-tasm.debugASM', (uri?: vscode.Uri) => {
            return asm.runcode(ASMCMD.debug);
        }),
        vscode.commands.registerCommand('masm-tasm.cleanalldiagnose', () => {
            asm.cleanalldiagnose();
        }),
        vscode.commands.registerCommand('masm-tasm.dosboxhere', (uri?: vscode.Uri, boxcmd?: string) => {
            return asm.BoxHere(uri, boxcmd);
        })
    ];
    if (asm.ASM === 'MASM') {
        commands.push(
            vscode.languages.registerCodeActionsProvider('assembly', new SeeinCPPDOCS(), {
                providedCodeActionKinds: SeeinCPPDOCS.providedCodeActionKinds
            })
        );
    }
    context.subscriptions.push(...commands);
    return commands;
}

