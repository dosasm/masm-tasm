import * as path from 'path';

import { runTests } from 'vscode-test';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		const sampleFolder = path.resolve(__dirname, '../../samples');
		const launchArgs: string[] = [sampleFolder];

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs });
		await runTests({ version: '1.47.0', extensionDevelopmentPath, extensionTestsPath, launchArgs });
		await runTests({ version: '1.48.0', extensionDevelopmentPath, extensionTestsPath, launchArgs });
		await runTests({ version: '1.49.0', extensionDevelopmentPath, extensionTestsPath, launchArgs });
		await runTests({ version: '1.50.0', extensionDevelopmentPath, extensionTestsPath, launchArgs });
		await runTests({ version: '1.51.0', extensionDevelopmentPath, extensionTestsPath, launchArgs });
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
