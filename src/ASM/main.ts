import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { API } from './vscode-dosbox';
import { ASMTYPE, DOSEMU } from '../utils/configuration';
import { SeeinCPPDOCS } from '../diagnose/codeAction';

const fs = vscode.workspace.fs;

export async function activate(context: vscode.ExtensionContext) {
    const vscode_dosbox = vscode.extensions.getExtension('xsro.vscode-dosbox');
    const api: API = await vscode_dosbox?.activate();

    async function open(uri: vscode.Uri) {
        const conf = vscode.workspace.getConfiguration('masm-tasm');
        const emu = conf.get('ASM.emulator')
        if (emu === 'dosbox') {
            api.dosbox.run()
        }
        else if (emu === 'dosboxX') {
            api.dosboxX.run()
        }
        else if (emu === 'msdos player') {
            api.msdosPlayer();
        }
        else if (emu === 'jsdos' || true) {
            const bundleUri = vscode.Uri.joinPath(context.extensionUri, 'resources/TASM.jsdos');
            const bundle = await fs.readFile(bundleUri);
            api.jsdosWeb(bundle);
        }
        logger.channel(JSON.stringify(uri)).show()
    }

    async function run(uri?: vscode.Uri) {
        const conf = vscode.workspace.getConfiguration('masm-tasm');
        const asmType: ASMTYPE | undefined = conf.get('ASM.MASMorTASM');
        if (conf.get('ASM.emulator') === 'jsdos') {
            const bundleUri = vscode.Uri.joinPath(context.extensionUri, 'resources/TASM.jsdos');
            const bundle = await fs.readFile(bundleUri);
            api.jsdosWeb(bundle);
        }
        if (conf.get('ASM.emulator') === 'dosbox') {

        }
        if (conf.get('ASM.emulator') === 'msdos player') {

        }
        logger.channel(JSON.stringify(uri)).show()
    }

    function debug() {

    }

    const commands = [
        vscode.commands.registerCommand('masm-tasm.openEmulator', open),
        vscode.commands.registerCommand('masm-tasm.runASM', run),
        vscode.commands.registerCommand('masm-tasm.debugASM', (uri?: vscode.Uri) => {
            //return asm.runcode(ASMCMD.debug, uri);
        }),
        vscode.commands.registerCommand('masm-tasm.cleanalldiagnose', () => {
            //asm.cleanalldiagnose();
        }),
        vscode.commands.registerCommand('masm-tasm.dosboxhere', (uri?: vscode.Uri, emulator?: DOSEMU) => {
            //return asm.BoxHere(uri, emulator);
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
    if (vscode.workspace.getConfiguration('masm-tasm').get('ASM.MASMorTASM') === ASMTYPE.MASM) {
        commands.push(
            vscode.languages.registerCodeActionsProvider('assembly', new SeeinCPPDOCS(), {
                providedCodeActionKinds: SeeinCPPDOCS.providedCodeActionKinds
            })
        );
    }
    context.subscriptions.push(...commands);
}