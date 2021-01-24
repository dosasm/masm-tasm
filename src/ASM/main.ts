import * as vscode from 'vscode';
import { AsmAction, ASMCMD } from './runcode';
import { SeeinCPPDOCS } from './diagnose/codeAction';
import { DOSEMU } from './configration';

/**register commands for run and debug the code
 *  in dosbox or msdos-player by TASM ot MASM */
export function AsmCommands(context: vscode.ExtensionContext) {
    let asm = new AsmAction(context);
    let commands = [
        vscode.commands.registerCommand('masm-tasm.openEmulator', (uri?: vscode.Uri) => {
            return asm.runcode(ASMCMD.OpenEmu, uri);
        }),
        vscode.commands.registerCommand('masm-tasm.runASM', (uri?: vscode.Uri) => {
            return asm.runcode(ASMCMD.run, uri);
        }),
        vscode.commands.registerCommand('masm-tasm.debugASM', (uri?: vscode.Uri) => {
            return asm.runcode(ASMCMD.debug, uri);
        }),
        vscode.commands.registerCommand('masm-tasm.cleanalldiagnose', () => {
            asm.cleanalldiagnose();
        }),
        vscode.commands.registerCommand('masm-tasm.dosboxhere', (uri?: vscode.Uri, emulator?: DOSEMU) => {
            return asm.BoxHere(uri, emulator);
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

