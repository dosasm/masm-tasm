
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { DIAGCODE, DIAGINFO } from '../../diagnose/main';
import { DosEmulatorType, ASMTYPE } from '../../utils/configuration';

// import * as myExtension from '../../extension';

const samplesUri = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../../samples/');

suite('Extension Test Suite', function () {
	vscode.window.showInformationMessage('Start all tests.');
	const MASMorTASM = [
		ASMTYPE.MASM,
		ASMTYPE.TASM,
	];
	const emulator: DosEmulatorType[] = [
		// DosEmulatorType.jsdos,
		DosEmulatorType.dosbox,
		DosEmulatorType.dosboxX,
	];

	const filelist: [string, DIAGCODE][] = [
		['1.asm', DIAGCODE.ok],
		// ['2.asm', DIAGCODE.ok],
		['3中文路径hasError.asm', DIAGCODE.hasError]
	];

	const args: [string, DIAGCODE, DosEmulatorType, ASMTYPE][] = [];
	for (const file of filelist) {
		for (const emu of emulator) {
			for (const asm of MASMorTASM) {
				args.push([file[0], file[1], emu, asm]);
			}
		}
	}

	shuffle(args).forEach((val) => { testAsmCode(...val); });
});

function testAsmCode(file: string, diagcode: DIAGCODE, emu: DosEmulatorType, asm: ASMTYPE): void {
	test(`test file ${file} in ${emu} use ${asm} want ${DIAGCODE[diagcode]} ${diagcode}`,
		async function () {
			this.timeout('120s');
			this.slow('10s');
			//skip azure pipeline test for this condition
			if (file === '3中文路径hasError.asm' && emu === DosEmulatorType.msdos && asm === ASMTYPE.MASM && !process.env.LANG?.includes('zh_CN')) {
				this.skip();
			}

			//open test file. NOTE: the extension will be activated when open .asm file
			const samplefile = vscode.Uri.joinPath(samplesUri, file);
			await vscode.commands.executeCommand('vscode.open', samplefile);

			//update settings
			await vscode.workspace.getConfiguration('masmtasm').update("dosbox.run", "exit", vscode.ConfigurationTarget.Global);
			await vscode.workspace.getConfiguration('masmtasm').update("ASM.emulator", emu, vscode.ConfigurationTarget.Global);
			await vscode.workspace.getConfiguration('masmtasm').update("ASM.assembler", asm, vscode.ConfigurationTarget.Global);

			//assert the extension activated and command contributed
			const vscodecmds = await vscode.commands.getCommands(true);
			const cmd = 'masm-tasm.runASM';
			assert.ok(vscodecmds.includes(cmd));

			//assert message processed
			const _result = await vscode.commands.executeCommand(cmd, samplefile);
			const { message, diagnose } = _result as { message: string, diagnose: DIAGINFO | undefined };
			assert.strictEqual(diagnose?.code, diagcode, DIAGCODE[diagcode] + message);
		});
}

function shuffle<T>(arr: T[]): T[] {
	for (let i = 1; i < arr.length; i++) {
		const random = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[random]] = [arr[random], arr[i]];
	}
	return arr;
}