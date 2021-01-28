import * as assert from 'assert';
import { execSync } from 'child_process';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { DIAGCODE } from '../../ASM/diagnose/diagnose';
import { DOSEMU, ASMTYPE } from '../../ASM/configration';
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
	}
	try {
		let msg = execSync('dosbox -version', { encoding: 'utf8' });
		if (msg.includes('version') && process.platform !== 'win32') {
			emulator.push(DOSEMU.dosbox);
		}
	}
	catch (e) {
		console.warn(e);
	}
	const filelist: [string, DIAGCODE][] = [
		['1.asm', DIAGCODE.ok],
		['1err.asm', DIAGCODE.hasError]
	];
	for (const file of filelist) {
		for (const emu of emulator) {
			for (const asm of MASMorTASM) {
				testAsmCode(file[0], file[1], emu, asm);
			}
		}
	}
});

function testAsmCode(file: string, diagcode: DIAGCODE, emu: DOSEMU, asm: ASMTYPE) {
	test(`test file ${file} in ${emu} use ${asm} want ${DIAGCODE[diagcode]} ${diagcode}`,
		async function () {
			this.timeout('35s');
			//open test file. NOTE: the extension will be activated when open .asm file
			let samplefile = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../../samples/' + file);
			await vscode.commands.executeCommand('vscode.open', samplefile);

			await vscode.workspace.getConfiguration('masmtasm').update(
				"dosbox.run", "exit"
			);
			await vscode.workspace.getConfiguration('masmtasm').update(
				"ASM.emulator", emu
			);
			await vscode.workspace.getConfiguration('masmtasm').update(
				"ASM.MASMorTASM", asm
			);
			let vscodecmds = await vscode.commands.getCommands(true);
			let cmd = 'masm-tasm.runASM';
			let a = (await vscode.commands.executeCommand(cmd) as any);
			assert.ok(vscodecmds.includes(cmd));//assert the extension activated and command contributed
			assert.strictEqual(DIAGCODE[a.diagCode], DIAGCODE[diagcode]);//error message processed
			;
		});
}

