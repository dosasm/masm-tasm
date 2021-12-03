import * as vscode from 'vscode';
import { DosEmulatorType, MountMode } from '../../utils/configuration';

import assert = require("assert");
import { AsmResult } from "../../ASM/manager";

export const testAsmCommand = function ([file, shouldErr]: [string, number], emu: DosEmulatorType, asm: string, mode = MountMode.single): [string, Mocha.Func] {
	const title = `test file ${file} in ${emu} use ${asm} should ${shouldErr} error [${mode}]`;
	return [
		title,
		async function () {
			if (false
				//|| emu !== DosEmulatorType.dosbox
				//|| title !== "test file multi/2.asm in dosbox use TASM should 0 error [workspace]"
			) {
				this.skip();
			}

			//open test file. NOTE: the extension will be activated when open .asm file
			const samplefile = vscode.Uri.joinPath(samplesUri, file);

			//update settings
			const target = vscode.ConfigurationTarget.Workspace;
			await vscode.workspace.getConfiguration('masmtasm').update("dosbox.run", "exit", target);
			await vscode.workspace.getConfiguration('masmtasm').update("ASM.mode", mode, target);
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

export const samplesUri = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../../samples/');

const profileId: string[] = [
	'MASM-v5.00',
	'MASM-v6.11',
	"TASM",
];
const emulator: DosEmulatorType[] = [
	DosEmulatorType.dosbox,
	DosEmulatorType.dosboxX,
	DosEmulatorType.jsdos,
];

if (!process.platform) {
	emulator.shift();
	emulator.shift();
}

const filelist: [string, number][] = [
	['1.asm', 0],
	['3中文路径hasError.asm', 1],
	['multi/2.asm', 0],
];

export const singleFileTestSuite = suite("single file mode test", function () {
	this.timeout('60s');
	this.slow('20s');
	for (const emu of emulator) {
		suite(`test in ${emu}`, async function () {
			this.beforeAll(async function () {
				await vscode.commands.executeCommand('workbench.action.closeAllEditors');
			});
			for (const [file, shouldErr] of [filelist[0], filelist[1]]) {
				for (const asm of profileId) {
					const _test = testAsmCommand([file, shouldErr], emu, asm, MountMode.single);
					test(_test[0], _test[1]);
				}
			}
		});
	}
});

export const workspaceTestSuite = suite("workspace mode test", function () {
	this.timeout('60s');
	this.slow('20s');
	for (const emu of emulator) {
		suite(`test in ${emu}`, async function () {
			this.beforeAll(async function () {
				await vscode.commands.executeCommand('workbench.action.closeAllEditors');
			});
			for (const [file, shouldErr] of [filelist[0], filelist[2]]) {
				for (const asm of profileId) {
					const _test = testAsmCommand([file, shouldErr], emu, asm, MountMode.workspace);
					test(_test[0], _test[1]);
				}
			}
		});
	}
});

if (process.platform === 'win32') {
	const emu = DosEmulatorType.msdos;
	suite(`test in ${emu}`, async function () {
		this.timeout("60s");
		this.beforeAll(async function () {
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		});
		for (const asm of [profileId[0]]) {
			for (const [file, shouldErr] of [filelist[0], filelist[1]]) {
				const _test = testAsmCommand([file, shouldErr], emu, asm, MountMode.single);
				test(_test[0], _test[1]);
			}
			for (const [file, shouldErr] of [filelist[0], filelist[2]]) {
				const _test = testAsmCommand([file, shouldErr], emu, asm, MountMode.workspace);
				test(_test[0], _test[1]);
			}
		}
	});
}

