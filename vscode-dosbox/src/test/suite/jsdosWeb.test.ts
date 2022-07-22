import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as myExtension from "../../web/extension";
import { randomString } from "./util";

let api: myExtension.API;

export const jsdosWebTestSuite = suite(
  "test jsdos API running in Webview",
  function () {
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

    test("launch jsdos in webview with empty bundle", async function () {
      const panel = await api.jsdos.runInWebviewPanel(null);

      const testStr = randomString();

      const stdouts = await new Promise<string>((resolve, reject) => {
        let stdouts: string = "";
        const id = setInterval(() => {
          panel.webview.postMessage({
            command: "stdin",
            value: `echo ${testStr}\r`,
          });
        });

        panel.webview.onDidReceiveMessage((e) => {
          if (e.command === "stdout") {
            stdouts += e.value;
            if (stdouts.includes(testStr)) {
              clearInterval(id);
              resolve(stdouts);
            }
          }
        });
      });
      assert.ok(stdouts.length > 10, stdouts);
      panel.dispose();
    });

    test("launch jsdos in webview with https url", async function () {
      const uri = vscode.Uri.parse(
        "https://doszone-uploads.s3.dualstack.eu-central-1.amazonaws.com/original/2X/2/24b00b14f118580763440ecaddcc948f8cb94f14.jsdos"
      );
      const panel = await api.jsdos.runInWebviewPanel(uri);

      const stdouts = await new Promise<string[]>((resolve, reject) => {
        const stdouts: string[] = [];
        panel.webview.onDidReceiveMessage((e) => {
          if (e.command === "stdout") {
            stdouts.push(e.value);
            if (e.value.includes("C:\\>DIGGER.COM")) {
              resolve(stdouts);
            }
          }
        });
      });
      assert.ok(stdouts.length > 10, JSON.stringify(stdouts));
      panel.dispose();
    });
  }
);
