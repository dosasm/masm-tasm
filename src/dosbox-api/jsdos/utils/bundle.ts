//methods for manipute jsdos-bundles
import * as JSZip from "jszip";
import * as vscode from "vscode";

const fs = vscode.workspace.fs;

export interface CreateBundleOptions {
  sample?: string;
  boxConf?: string;
  mount?: { dir: vscode.Uri; disk: string }[];
}

/**create a jsdos bundle file by add new files to the sample.
 * powered by https://stuk.github.io/jszip/
 */
export async function createBundle({
  sample,
  boxConf,
  mount,
}: CreateBundleOptions): Promise<JSZip> {
  const zip = new JSZip();
  if (sample) {
    const zipdata = await fs.readFile(vscode.Uri.file(sample));
    await zip.loadAsync(zipdata);
  }

  zip.file(".jsdos/dosbox.conf", boxConf ? boxConf : "");

  if (mount) {
    for (const m of mount) {
      await allFiles(m.dir, async (uri: vscode.Uri) => {
        const arr = await fs.readFile(uri);
        const dst =
          "/home/web_user/" + m.disk + uri.path.replace(m.dir.path, "");
        zip.file(dst, arr);
      });
    }
  }

  return zip;
}

async function allFiles(
  dir: vscode.Uri,
  callback: (file: vscode.Uri) => Promise<void>
) {
  const dirs = await fs.readDirectory(dir);
  const r: string[] | undefined = vscode.workspace
    .getConfiguration("vscode-dosbox")
    .get("jsdos.ignore");
  const regs = r ? r.map((val) => new RegExp(val)) : [/\.git/, /\.vscode/];
  for (const [term, type] of dirs) {
    const uri = vscode.Uri.joinPath(dir, term);
    if (regs.some((val) => term.match(val))) {
      continue;
    }
    if (type === vscode.FileType.File) {
      await callback(uri);
    } else if (type === vscode.FileType.Directory) {
      await allFiles(uri, callback);
    }
  }
}
