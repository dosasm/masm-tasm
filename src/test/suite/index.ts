import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import * as vscode from 'vscode';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 2000,
		retries: 3,
	});

	if (process.platform === 'linux') {
		vscode.workspace.getConfiguration('vscode-dosbox').update(
			"command.dosboxX",
			"flatpak run com.dosbox_x.DOSBox-X -silent -nogui",
			vscode.ConfigurationTarget.Global
		);
	}

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((c, e) => {
		glob('**/*.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return e(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			} catch (err) {
				console.error(err);
				e(err);
			}
		});
	});
}
