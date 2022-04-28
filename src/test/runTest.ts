/**
 * https://code.visualstudio.com/api/working-with-extensions/testing-extension#custom-setup-with-vscodetestelectron
 */

import * as cp from 'child_process';
import * as path from 'path';
import * as fs from "fs";
import {
	downloadAndUnzipVSCode,
	resolveCliArgsFromVSCodeExecutablePath,
	runTests
} from '@vscode/test-electron';

const extensionDevelopmentPath = path.resolve(__dirname, '../../');
const extensionTestsPath = path.resolve(__dirname, './suite/index.js');

async function test(version:string){
	const vscodeExecutablePath = await downloadAndUnzipVSCode(version);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

	const extensions = [
		"xsro.vscode-dosbox"
	];

	const vscedosbox = path.resolve(__dirname, "../..", "..", "vscode-dosbox");
	if (fs.existsSync(vscedosbox)) {
		const dirs = await fs.promises.readdir(vscedosbox);
		const dir = dirs.find(val => val.includes(`vscode-dosbox-${process.platform}-${process.arch}`));
		if (dir) {
			console.log("found " + dir);
			extensions[0] = path.resolve(vscedosbox, dir);
		}
	}

	// Use cp.spawn / cp.exec for custom setup
	cp.spawnSync(cli, [...args,'--install-extension', ...extensions], {
		encoding: 'utf-8',
		stdio: 'inherit'
	});

	const sampleFolder = path.resolve(__dirname, '../../samples');
	const launchArgs: string[] = [
		"--disable-workspace-trust",
		sampleFolder
	];

	// Run the extension test
	await runTests({
		// Use the specified `code` executable
		vscodeExecutablePath,
		extensionDevelopmentPath,
		extensionTestsPath,
		launchArgs
	});
}

async function main() {
	try {
		await test('stable');
		const pack=fs.readFileSync(path.resolve( extensionDevelopmentPath,"package.json"),"utf-8")
		const least=JSON.parse(pack).engines.vscode.replace("^","");
		await test(least);
		
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();