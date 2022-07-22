import * as Jszip from "jszip";
import * as vscode from "vscode";

const fs = vscode.workspace.fs;

/**
 * open dosbox-like emulator from bundle
 *
 * @param bundle bundle data
 * @param tempFolder the folder for exact all files to
 * @returns the dosbox.conf file in the jsdos bundle
 */
export async function fromBundle(
  bundle: Uint8Array,
  tempFolder: vscode.Uri
): Promise<string | undefined> {
  const zip = new Jszip();
  await zip.loadAsync(bundle);
  Object.keys(zip.files).forEach(async function (filename) {
    const e = zip.files[filename];
    const data = await e.async("uint8array");
    const dest = vscode.Uri.joinPath(tempFolder, filename);
    if (e.dir === false) {
      await fs.writeFile(dest, data);
    }
  });
  const filename = ".jsdos/dosbox.conf";
  if (zip.file(filename)) {
    const data = await zip.files[filename].async("string");
    return data.replace(/mount\s+c\s+\./g, `mount c "${tempFolder.fsPath}"`);
  }
}
