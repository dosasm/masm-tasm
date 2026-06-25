import * as vscode from "vscode";
import * as Jszip from 'jszip';
import * as conf from '../utils/configuration';
import { getFiles, uriUtils } from "../utils/util";
import * as path from "path";
import { Jsdos } from "./jsdos/main";
import { CommandInterface } from "@xsro/emulators";

export async function runJsdos(jsdos:Jsdos,bundleData:Uint8Array,
    useX:boolean,
    workspaceFolderUri: vscode.Uri, fileUri: vscode.Uri|undefined,mountMode: conf.MountMode,
    manipulateAutoexec?:(autoexec:string[],fileInJsdos:string)=>void)
    : Promise<CommandInterface> {
    const jszip=await Jszip.loadAsync(bundleData);

    let fileInJsdos = "";
    if (mountMode === conf.MountMode.workspace) {
        for await (const f of getFiles(workspaceFolderUri)) {
            const rel = path.relative(workspaceFolderUri.fsPath, f.fsPath);
            const dst = path.posix.join('code/', rel);
            const _data = await vscode.workspace.fs.readFile(f);
            jszip.file(dst, _data);
        }
        if(fileUri){
            const rel = path.relative(
            workspaceFolderUri.fsPath,
            fileUri.fsPath,
        );
        fileInJsdos = "D:\\"+ rel.replace(/\//g,"\\");
        }
        
    } else if (mountMode === conf.MountMode.single) {
        const doc=vscode.window.activeTextEditor?.document;
        if (doc){
            jszip.file('code/test' + uriUtils.extname(doc.uri), doc.getText());
            fileInJsdos = "D:\\test" + uriUtils.extname(doc.uri);
        }
    }

    const autoexec = [
        `mount c .`,
        `mount d ./code`,
        'd:'
    ];
    const before = conf.extConf.action.before;
    if (before) {
        autoexec.push(...before);
    }

    if(manipulateAutoexec){
        manipulateAutoexec(autoexec,fileInJsdos)
    }

    jsdos.updateAutoexec(autoexec);
    jsdos.jszip=jszip;
    const ci = await jsdos.runInHost(useX);
    return ci;
}