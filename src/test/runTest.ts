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

		const DELAY = (timeout: number) => new Promise((resolve) => { setTimeout(resolve, timeout); });
		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs });
		await DELAY(2000);
		//test in version September 2020 (version 1.50) https://code.visualstudio.com/updates/v1_50
		await runTests({ version: '1.50.1', extensionDevelopmentPath, extensionTestsPath, launchArgs });
		//test in version March 2020 (version 1.44) https://code.visualstudio.com/updates/v1_44
		await runTests({ version: '1.44.1', extensionDevelopmentPath, extensionTestsPath, launchArgs });
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
