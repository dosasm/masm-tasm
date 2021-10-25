/**
 * https://code.visualstudio.com/api/working-with-extensions/testing-extension#custom-setup-with-vscodetestelectron
 */

import * as cp from 'child_process';
import * as path from 'path';
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

		// Use cp.spawn / cp.exec for custom setup
		cp.spawnSync(cliPath, ['--install-extension', 'xsro.vscode-dosbox'], {
			encoding: 'utf-8',
			stdio: 'inherit'
		});

		// Run the extension test
		await runTests({
			// Use the specified `code` executable
			vscodeExecutablePath,
			extensionDevelopmentPath,
			extensionTestsPath
		});
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();