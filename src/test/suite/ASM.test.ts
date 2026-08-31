import * as vscode from 'vscode';
import { DosEmulatorType } from '../../ASM3/types';

import * as assert from "assert";
import { AsmResult } from "../../ASM3/main";

/** Simple delay function used to introduce gaps between tests */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const folders = vscode.workspace.workspaceFolders;
if (folders === undefined) { throw new Error(); }
const samplesUri = process.platform
	? vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../../samples/')
	: folders[0].uri;

export const testAsmCommand = function ([file, shouldErr]: [string, number], emu: DosEmulatorType, asm: string): [string, Mocha.Func] {
	const title = `test file ${file} in ${emu} use ${asm} should ${shouldErr} error`;
	return [
		title,
		async function () {

			//open test file. NOTE: the extension will be activated when open .asm file
			const samplefile = vscode.Uri.joinPath(samplesUri, file);

			//update settings
			const target = vscode.ConfigurationTarget.Workspace;
			await vscode.workspace.getConfiguration('masmtasm').update("dosbox.run", "exit", target);
			await vscode.workspace.getConfiguration('masmtasm').update("ASM.emulator", emu, target);
			await vscode.workspace.getConfiguration('masmtasm').update("ASM.assembler", asm, target);

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
			assert.ok(_result, JSON.stringify(_result));
			const { message, error } = _result as AsmResult;
			assert.strictEqual(error, shouldErr, message);
		}
	];
};

const profileId: string[] = [
	'MASM-v5.00',
	'MASM-v6.11',
	"TASM",
];
const emulator: DosEmulatorType[] = [
	// DosEmulatorType.dosbox,
	DosEmulatorType.dosboxX,
	DosEmulatorType.jsdos,
	DosEmulatorType.jsdosX
];

if (!process.platform) {
	emulator.shift();
	emulator.shift();
}

const filelist: [string, number][] = [
	['1.asm', 0],
	['3中文路径hasError.asm', 1],
];

export const singleFileTestSuite = suite("single file mode test", function () {
	this.timeout('20s');
	this.slow('10s');
	for (const emu of emulator) {
		suite(`test in ${emu}`, async function () {
			this.beforeEach(async function () {
				await vscode.commands.executeCommand('workbench.action.closeAllEditors');
				// 0.5s gap between each test to avoid resource contention or log interleaving during consecutive execution
				await sleep(500);
			});
			for (const [file, shouldErr] of filelist) {
				for (const asm of profileId) {
					const _test = testAsmCommand([file, shouldErr], emu, asm);
					test(_test[0], _test[1]);
				}
			}
		});
	}
});

export const jsoncModeTestSuite = suite("dosasm.jsonc mode test", function () {
	this.timeout('20s');
	this.slow('10s');
	for (const emu of emulator) {
		suite(`test in ${emu}`, async function () {
			this.beforeEach(async function () {
				await vscode.commands.executeCommand('workbench.action.closeAllEditors');
				// 0.5s gap between each test to avoid resource contention or log interleaving during consecutive execution
				await sleep(500);
			});
			// multi/2.asm has a dosasm.jsonc in the same directory
			for (const asm of profileId) {
				const _test = testAsmCommand(['multi/2.asm', 0], emu, asm);
				test(_test[0], _test[1]);
			}
		});
	}
});
