/**
 * https://code.visualstudio.com/api/working-with-extensions/testing-extension#custom-setup-with-vscodetestelectron
 */

import * as cp from 'child_process';
import * as path from 'path';
import * as fs from "fs";
import {
	downloadAndUnzipVSCode,
	resolveCliPathFromVSCodeExecutablePath,
	runTests
} from 'vscode-test';

async function main() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../../');
		const extensionTestsPath = path.resolve(__dirname, './suite/index');
		const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
		const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

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
		const p1 = cp.spawnSync(cliPath, ['--install-extension', ...extensions], {
			encoding: 'utf-8',
			stdio: 'inherit'
		});

		// Use cp.spawn / cp.exec for custom setup
		const p2 = cp.spawnSync(cliPath, ["--list-extensions", "--show-versions"], {
			encoding: 'utf-8',
			stdio: 'inherit'
		});

		console.log(p1, p2);

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
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();