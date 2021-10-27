
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { AsmResult } from '../../ASM/main';
import { DIAGCODE } from '../../diagnose/main';
import { DosEmulatorType, Assembler } from '../../utils/configuration';

// import * as myExtension from '../../extension';

const samplesUri = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../../samples/');

suite('Extension Test Suite', function () {
	vscode.window.showInformationMessage('Start all tests.');
	const MASMorTASM = [
		Assembler.MASM,
		Assembler.TASM,
	];
	const emulator: DosEmulatorType[] = [
		DosEmulatorType.jsdos,
	];

	const filelist: [string, number][] = [
		['1.asm', 0],
		// ['2.asm', DIAGCODE.ok],
		['3中文路径hasError.asm', 1]
	];

	const args: [string, DIAGCODE, DosEmulatorType, Assembler][] = [];
	for (const file of filelist) {
		for (const emu of emulator) {
			for (const asm of MASMorTASM) {
				args.push([file[0], file[1], emu, asm]);
			}
		}
	}

	shuffle(args).forEach((val) => { testAsmCode(...val); });
});

function testAsmCode(file: string, shouldErr: number, emu: DosEmulatorType, asm: Assembler): void {
	test(`test file ${file} in ${emu} use ${asm} want should ${shouldErr} error`,
		async function () {
			this.timeout('60s');
			this.slow('20s');
			//skip azure pipeline test for this condition
			if (file === '3中文路径hasError.asm' && emu === DosEmulatorType.msdos && asm === Assembler.MASM && !process.env.LANG?.includes('zh_CN')) {
				this.skip();
			}

			//open test file. NOTE: the extension will be activated when open .asm file
			const samplefile = vscode.Uri.joinPath(samplesUri, file);
			await vscode.commands.executeCommand('vscode.open', samplefile);

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
}

function shuffle<T>(arr: T[]): T[] {
	for (let i = 1; i < arr.length; i++) {
		const random = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[random]] = [arr[random], arr[i]];
	}
	return arr;
}