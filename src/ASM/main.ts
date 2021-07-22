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
            }
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

