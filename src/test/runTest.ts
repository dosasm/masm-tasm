import * as path from 'path';
import * as os from 'os';

import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		// Use a unique user data directory to avoid "another instance running" error
		const uniqueDataDir = path.join(os.tmpdir(), `vscode-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		process.env.VSCODE_USER_DATA_DIR = uniqueDataDir;

		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Download VS Code, unzip it and run the integration test
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [path.resolve(__dirname, '../../samples')],
		});
	} catch (err) {
		console.error('Failed to run tests:', err);
		process.exit(1);
	}
}

main();