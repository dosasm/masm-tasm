import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	test('open dosbox test', function (done) {
		vscode.commands.executeCommand('masm-tasm.dosboxhere', undefined, 'exit').then(
			(val) => {
				assert.ok((val as any).code === 0, 'start code success');
				done();
			}
		);
	});
	testAsmCode('1.asm', 2, true);
	testAsmCode('1err.asm', 0, false);
	//testAsmCode('2.asm', 0, false);
});

//1err.asm
async function testAsmCode(file: string, diagcode: number, exeGen: boolean) {
	const MASMorTASM = [
		"MASM",
		"TASM",
	];
	const emulator = ["dosbox"];
	if (process.platform === 'win32') {
		emulator.push("msdos player", "auto");
	}
	const fn = () => {
		emulator.forEach(
			(emu) => {
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
						let a = await vscode.commands.executeCommand('masm-tasm.runASM');
						//console.log(a)
						assert.ok((a as any).diagCode === diagcode);
						assert.ok((a as any).exeGen === exeGen);
						return a;
					});

				}
			}
		);
	};
	suite(`test file ${file}`, fn);
}

