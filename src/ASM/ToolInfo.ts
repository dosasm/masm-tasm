import { workspace, Uri, FileType } from 'vscode';
import { inArrays } from './util';

export interface ToolInfo {
    uri: Uri;
    hasBoxasm: boolean;
    hasPlayerasm: boolean;
    hasDosbox: boolean;
    hasPlayer: boolean;
    hasDosboxConf?: boolean;
    hasMasm: boolean;
    hasTasm: boolean;
}
export async function customToolCheck(path: string): Promise<ToolInfo> {
    let uri: Uri = Uri.file(path);
    let fs = workspace.fs;
    let info: ToolInfo = {
        uri: uri,
        hasBoxasm: false,
        hasPlayerasm: false,
        hasDosbox: false,
        hasPlayer: false,
        hasMasm: false,
        hasTasm: false
    };
    let dir1 = await fs.readDirectory(uri);
    //console.log(inArrays(dir1, ["boxasm.bat", FileType.File]));
    if (inArrays(dir1, ["dosbox", FileType.Directory]) && process.platform === "win32") {
        let dir2 = await fs.readDirectory(Uri.joinPath(uri, './dosbox'));
        if (inArrays(dir2, ["dosbox.exe", FileType.File])) {
            info.hasDosbox = true;
        }
    }
    info.hasPlayer = inArrays(dir1, ["player", FileType.Directory]);
    if (info.hasPlayer) {
        let dir2 = await fs.readDirectory(Uri.joinPath(uri, './player'));
        if (inArrays(dir2, ["playerasm.bat", FileType.File])) {
            info.hasPlayerasm = true;
        }
    }
    info.hasBoxasm = inArrays(dir1, ["boxasm.bat", FileType.File]);
    info.hasMasm = inArrays(dir1, ["masm", FileType.Directory]);
    info.hasTasm = inArrays(dir1, ["tasm", FileType.Directory]);
    //console.log(dir1, info);
    return info;
}
;
