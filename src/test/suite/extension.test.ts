
import * as assert from 'assert';
import { execSync } from 'child_process';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { DIAGCODE } from '../../ASM/diagnose/diagnose';
import { DOSEMU, ASMTYPE } from '../../ASM/configration';
import { RUNCODEINFO } from '../../ASM/runcode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', function () {
	vscode.window.showInformationMessage('Start all tests.');
	const MASMorTASM = [
		ASMTYPE.MASM,
		ASMTYPE.TASM,
	];
	const emulator: DOSEMU[] = [
		DOSEMU.jsdos
	];
	if (process.platform === 'win32') {
		emulator.push(
			DOSEMU.dosbox,
			DOSEMU.msdos,
			DOSEMU.auto
		);
	} else {
		try {
			const msg = execSync('dosbox -version', { encoding: 'utf8' });
			if (msg.includes('version')) {
				emulator.push(DOSEMU.dosbox);
			}
		}
		catch (e) {
			console.warn('disable dosbox test for no dosbox installed');
		}
	}
	const filelist: [string, DIAGCODE][] = [
		['1.asm', DIAGCODE.ok],
		['2.asm', DIAGCODE.ok],
		['3中文路径hasError.asm', DIAGCODE.hasError]
	];
	function shuffle<T>(arr: T[]): T[] {
		for (let i = 1; i < arr.length; i++) {
			const random = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[random]] = [arr[random], arr[i]];
		}
		return arr;
	}
	const args: [string, DIAGCODE, DOSEMU, ASMTYPE][] = [];
	for (const file of filelist) {
		for (const emu of emulator) {
			for (const asm of MASMorTASM) {
				args.push([file[0], file[1], emu, asm]);
			}
		}
	}
	shuffle(args).forEach((val) => { testAsmCode(...val); });
});

function testAsmCode(file: string, diagcode: DIAGCODE, emu: DOSEMU, asm: ASMTYPE): void {
	test(`test file ${file} in ${emu} use ${asm} want ${DIAGCODE[diagcode]} ${diagcode}`,
		async function () {
			this.timeout('120s');
			this.slow('10s');
			//skip azure pipeline test for this condition
			if (file === '3中文路径hasError.asm' && emu === DOSEMU.msdos && asm === ASMTYPE.MASM && !process.env.LANG?.includes('zh_CN')) {
				this.skip();
			}

			//open test file. NOTE: the extension will be activated when open .asm file
			const samplefile = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../../samples/' + file);
			await vscode.commands.executeCommand('vscode.open', samplefile);

			//update settings
			await vscode.workspace.getConfiguration('masmtasm').update("dosbox.run", "exit");
			await vscode.workspace.getConfiguration('masmtasm').update("ASM.emulator", emu);
			await vscode.workspace.getConfiguration('masmtasm').update("ASM.MASMorTASM", asm);

			//assert the extension activated and command contributed
			const vscodecmds = await vscode.commands.getCommands(true);
			const cmd = 'masm-tasm.runASM';
			assert.ok(vscodecmds.includes(cmd));

			//assert message processed
			const result = (await vscode.commands.executeCommand(cmd) as RUNCODEINFO);
			assert.strictEqual(DIAGCODE[result.diagCode], DIAGCODE[diagcode], JSON.stringify(result, null, 4));
		});
}

