import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as myExtension from "../../extension";
import { randomString } from "./util";

let api: myExtension.API;

export const jsdosHostTestSuite = suite("test jsdos API", function () {
  this.beforeEach(async function () {
    const extension = vscode.extensions.getExtension("xsro.vscode-dosbox");
    if (api === undefined) {
      api = await extension?.activate();
    }
    assert.ok(
      api !== undefined,
      api ? Object.keys(api).toString() : "api can't get"
    );
  });

  test("launch jsdos in extension host direct", async function () {
    const ci = await api.jsdos.runInHost(undefined, false);
    assert.ok(typeof ci.width() === "number");

    if (!process.platform) {
      this.timeout(10000);
      this.retries(3);
    }
    const t = ci.terminal();
    t.show();
    const testStr = randomString();
    t.sendText(`echo ${testStr}\r`);
    const p = new Promise<string>((resolve) => {
      let stdout = "";
      ci.events().onStdout((val) => {
        stdout += val;
        if (stdout.includes(testStr)) {
          setTimeout(() => {
            resolve(stdout);
          });
        }
      });
    });
    const stdout = await p;
    assert.ok(stdout, stdout);
    ci.exit();
    t.dispose();
  });

  test("launch jsdos in extension host webworker", async function () {
    if (process.platform !== undefined) {
      this.skip();
    }
    const ci = await api.jsdos.runInHost(undefined, true);
    assert.ok(typeof ci.width() === "number");
    ci.exit();
  });
});
