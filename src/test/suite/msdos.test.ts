import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { AsmResult } from '../../ASM/main';
import { DosEmulatorType } from '../../utils/configuration';
// import * as myExtension from '../../extension';

const samplesUri = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../../samples/');

suite('Extension Test Suite', () => {
    const file = '3中文路径hasError.asm';
    const emu = DosEmulatorType.msdos;
    const asm = 'MASM-v5.00';
    const shouldErr = 1;

    test(`test file ${file} in ${emu} use ${asm} want should ${shouldErr} error`,
        async function () {
            if (process.platform !== 'win32') {
                this.skip();
            }
            this.timeout('60s');
            this.slow('20s');

            //open test file. NOTE: the extension will be activated when open .asm file
            const samplefile = vscode.Uri.joinPath(samplesUri, file);

            //update settings
            await vscode.workspace.getConfiguration('masmtasm').update("dosbox.run", "exit");
            await vscode.workspace.getConfiguration('masmtasm').update("ASM.emulator", emu);
            await vscode.workspace.getConfiguration('masmtasm').update("ASM.assembler", asm);

            //assert the extension activated and command contributed
            const vscodecmds = await vscode.commands.getCommands(true);
            const cmd = 'masm-tasm.runASM';
            if (!vscodecmds.includes(cmd)) {
                await vscode.extensions.getExtension('xsro.masm-tasm')?.activate();
            }
            const vscodecmds2 = await vscode.commands.getCommands(true);
            assert.ok(vscodecmds2.includes(cmd));

            //assert message processed
            const _result = await vscode.commands.executeCommand(cmd, samplefile);
            const { message, error } = _result as AsmResult;
            assert.strictEqual(error, shouldErr, message);
        });
});