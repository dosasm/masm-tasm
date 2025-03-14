//methods for manipute jsdos-bundles
import * as JSZip from "jszip";
import * as vscode from "vscode";

const fs = vscode.workspace.fs;

export interface MountFs{
    type:"fs";
    dir: vscode.Uri; 
    disk: string 
    watch?:boolean
}

export interface MountZip{
    type:"zip";
    zip:JSZip|Uint8Array;
    root:string;
    disk:string;
}

export type MountOption=MountFs|MountZip

export interface CreateBundleOptions {
  sample?: string;
  boxConf?: string;
  mount?: MountOption[];
}

// Copy function
async function copyDirectory(sourceZip: JSZip, sourceDir: string, targetZip: JSZip, targetDir: string) {
    // Iterate through all files in the source JSZip
    for (const [relativePath, file] of Object.entries(sourceZip.files)){
        if (relativePath.startsWith(sourceDir)) {
            // Calculate the relative path of the target file
            const newRelativePath = relativePath.replace(sourceDir, targetDir);
            // If it's a directory, create a corresponding directory in the target JSZip
            if (file.dir) {
                targetZip.folder(newRelativePath);
            } else {
                // If it's a file, read the file content and create the same file in the target JSZip
                const content=await file.async('uint8array')
                targetZip.file(newRelativePath, content);
            }
        }
    }
    return targetZip;
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
        if(m.type==="fs"){
            await allFiles(m.dir, async (uri: vscode.Uri) => {
                const arr = await fs.readFile(uri);
                const dst =
                  m.disk + uri.path.replace(m.dir.path, "");///home/web_user
                zip.file(dst, arr);
              });
        }
        if (m.type==="zip"){
            if(m.zip instanceof Uint8Array){
                const source=await JSZip.loadAsync(m.zip)
                await copyDirectory(source,m.root,zip,m.disk)
            }else if(m.zip instanceof JSZip){
                await copyDirectory(m.zip,m.root,zip,m.disk)
            }
        }
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
    .getConfiguration("masmtasm")
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
