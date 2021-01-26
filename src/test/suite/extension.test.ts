import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { DIAGCODE } from '../../ASM/diagnose/diagnose';
import { DOSEMU, ASMTYPE } from '../../ASM/configration';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	testAsmCode('1.asm', DIAGCODE.ok);
	testAsmCode('1err.asm', DIAGCODE.hasError);
	//testAsmCode('2.asm', 0, false);
});

//1err.asm
function testAsmCode(file: string, diagcode: DIAGCODE) {
	const MASMorTASM = [
		ASMTYPE.MASM,
		ASMTYPE.TASM,
	];
	const emulator = [DOSEMU.jsdos, DOSEMU.dosbox];
	if (process.platform === 'win32') {
		emulator.push(DOSEMU.msdos, DOSEMU.auto);
	}
	const testfile = async function (asm: ASMTYPE, emu: DOSEMU) {
		test(`run ${asm} via ${emu} ${diagcode}`, async function () {
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
			if (vscodecmds.includes(cmd)) {
				let a = (await vscode.commands.executeCommand(cmd) as any);
				assert.ok(a.diagCode === diagcode);
				return a;
			} else {
				console.error('no command' + cmd);
			}
			return null;
		});
	};
	suite(`test file ${file}`, () => {
		for (let emu of emulator) {
			for (let asm of MASMorTASM) {
				testfile(asm, emu);
			}
		}
	});
}

