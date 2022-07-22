import * as path from "path";

import { runTests } from "vscode-test";

async function main(): Promise<void> {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    const launchArgs: string[] = [];

    const DELAY = (timeout: number): Promise<undefined> =>
      new Promise((resolve) => {
        setTimeout(resolve, timeout);
      });
    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
    });

    //test in all supported version of vscode
    //last test says ok with 1.47.1 but the platform specified extension should be over 1.61, so the following make no sense now
    for (let ver = 60; ver >= 61; ver--) {
      await DELAY(20000);
      await runTests({
        version: `1.${ver.toString()}.1`,
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs,
      });
      await DELAY(20000);
    }
  } catch (err) {
    console.error("Failed to run tests");
    process.exit(1);
  }
}

main();
