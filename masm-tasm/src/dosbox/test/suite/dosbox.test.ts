import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as Jszip from "jszip";
import * as myExtension from "../../extension";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { randomString } from "./util";

const testFolderName = Math.floor(Math.random() * 10 ** 10).toString();
const testDir = path.join(os.tmpdir(), testFolderName);
fs.mkdirSync(testDir, { recursive: true });
console.log(`use ${testDir} as test dir`);

let api: myExtension.API | undefined = undefined;

suite("test DOSBox-like API", function () {
  this.beforeEach(async function () {
    //dosbox-X should install via flatpak so update configuration
    if (process.platform === "linux") {
      vscode.workspace
        .getConfiguration("vscode-dosbox")
        .update(
          "command.dosboxX",
          "flatpak run com.dosbox_x.DOSBox-X -silent -nogui",
          vscode.ConfigurationTarget.Global
        );
    }
    const extension = vscode.extensions.getExtension("xsro.vscode-dosbox");
    api = await extension?.activate();
    assert.ok(
      api !== undefined,
      api ? Object.keys(api).toString() : "api can't get"
    );
  });

  test("test dosbox API", async function () {
    if (api) {
      const data = randomString();
      const fileName = "DOSBOX.TXT";
      api.dosbox.updateAutoexec([
        `mount c ${testDir}`,
        "c:",
        `echo ${data} >${fileName}`,
        "exit",
      ]);
      await api.dosbox.run();
      const testFile = path.join(testDir, fileName);
      assert.ok(fs.existsSync(testFile));
      const data2 = fs.readFileSync(testFile, { encoding: "utf-8" });
      assert.equal(data, data2.trim());
    }
  });

  test("test dosbox-x API", async function () {
    //according to https://github.com/flathub/com.dosbox.DOSBox#limitations
    //For security reasons, this Flatpak is sandboxed and only has access to the user's Documents folder.
    let testDir2 = testDir;
    if (process.platform === "linux") {
      testDir2 = __dirname;
      console.log("make and use " + testDir2);
    }
    if (api) {
      const data = randomString();
      const fileName = "DOSBOXX.TXT";
      api.dosboxX.updateAutoexec([
        `mount c ${testDir2}`,
        "c:",
        `echo ${data} > ${fileName}`,
        "exit",
      ]);
      const r = await api.dosboxX.run();
      const testFile = path.join(testDir2, fileName);
      console.log(JSON.stringify(r));
      assert.ok(
        fs.existsSync(testFile),
        fs.readdirSync(testDir2, { encoding: "utf-8" }).join("\n")
      );
      const data2 = fs.readFileSync(testFile, { encoding: "utf-8" });
      assert.equal(data, data2.trim());
    }
  });

  test("start from jsdos bundle", async function () {
    const zip = new Jszip();
    const data = randomString();
    const testFolder = vscode.Uri.file(
      path.resolve(testDir, "dosbox-from-bundle")
    );
    const fileName = "TEST.TXT";
    zip.file(
      ".jsdos/dosbox.conf",
      `
        [autoexec]
        mount c .
        echo ${data} >C:\\${fileName}
        exit`
    );
    const bundleData = await zip.generateAsync({ type: "uint8array" });
    if (api) {
      await api.dosbox.fromBundle(bundleData, testFolder, true);
      await api.dosbox.run();
    }
    const testFile = path.join(testFolder.fsPath, fileName);
    assert.ok(fs.existsSync(testFile));
    const data2 = fs.readFileSync(testFile, { encoding: "utf-8" });
    assert.equal(data, data2.trim());
  });
});
