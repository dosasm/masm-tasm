import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { DIAGCODE } from '../../ASM/diagnose';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	test('open dosbox test', function (done) {
		vscode.commands.executeCommand('masm-tasm.dosboxhere', undefined, 'exit').then(
			(val) => {
				assert.ok((val as any).exitcode === 0, 'start code success');
				done();
			}
		);
	});
	testAsmCode('1.asm', DIAGCODE.ok, true);
	testAsmCode('1err.asm', DIAGCODE.hasError, false);
	//testAsmCode('2.asm', 0, false);
});

//1err.asm
async function testAsmCode(file: string, diagcode: DIAGCODE, exeGen: boolean) {
	const MASMorTASM = [
		"MASM",
		"TASM",
	];
	const emulator: string[] = ["dosbox"];
	if (process.platform === 'win32') {
		emulator.push("msdos player", "auto");
	}
	const fn = () => {
		for (let emu of emulator) {
			for (let asm of MASMorTASM) {
				test(`run ${asm} via ${emu} ${diagcode}${exeGen}`, async function () {
					await vscode.workspace.getConfiguration('masmtasm').update(
						"dosbox.run", "exit"
					);
					await vscode.workspace.getConfiguration('masmtasm').update(
						"ASM.emulator", emu
					);
					await vscode.workspace.getConfiguration('masmtasm').update(
						"ASM.MASMorTASM", asm
					);
					let samplefile = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../../samples/' + file);
					await vscode.commands.executeCommand('vscode.open', samplefile);
					let a = (await vscode.commands.executeCommand('masm-tasm.runASM') as any);
					//console.log(a)
					assert.ok(a.diagCode === diagcode);
					assert.ok(a.exeGen === exeGen);
					return a;
				});
			}
		}
	};
	suite(`test file ${file}`, fn);
}

