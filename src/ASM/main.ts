import * as vscode from 'vscode';
import { AsmAction, ASMCMD } from './runcode';
import { SeeinCPPDOCS } from './diagnose/codeAction';
import { ASMTYPE, DOSEMU } from './configration';

/**register commands for run and debug the code
 *  in dosbox or msdos-player by TASM ot MASM */
export function AsmCommands(context: vscode.ExtensionContext): void {
    const asm = new AsmAction(context);
    const commands = [
        vscode.commands.registerCommand('masm-tasm.openEmulator', (uri?: vscode.Uri) => {
            return asm.runcode(ASMCMD.OpenEmu, uri);
        }),
        vscode.commands.registerCommand('masm-tasm.runASM', (uri: vscode.Uri) => {
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
        }),
        vscode.commands.registerCommand('masmtasm.updateEmuASM', async () => {
            const conf = vscode.workspace.getConfiguration('masmtasm.ASM');
            const emu = [DOSEMU.jsdos, DOSEMU.dosbox];
            if (process.platform === 'win32') {
                emu.push(DOSEMU.msdos, DOSEMU.auto);
            }
            let placeHolder = 'choose DOS environment emulator';
            const emuSelected = await vscode.window.showQuickPick(emu, { placeHolder });
            const asm = [ASMTYPE.MASM, ASMTYPE.TASM];
            placeHolder = 'choose MASM or TASM to use';
            const asmSelected = await vscode.window.showQuickPick(asm, { placeHolder });
            placeHolder = 'choose where to store the setting';
            const target = await vscode.window.showQuickPick(['Global', 'Workspace', 'WorkspaceFolder'], { placeHolder });

            await conf.update('emulator', emuSelected, target as unknown as vscode.ConfigurationTarget);
            await conf.update('MASMorTASM', asmSelected, target as unknown as vscode.ConfigurationTarget);
        }
        )
    ];
    if (asm.ASM === ASMTYPE.MASM) {
        commands.push(
            vscode.languages.registerCodeActionsProvider('assembly', new SeeinCPPDOCS(), {
                providedCodeActionKinds: SeeinCPPDOCS.providedCodeActionKinds
            })
        );
    }
    context.subscriptions.push(...commands);
}

