import { Uri, workspace, window, TextDocument } from 'vscode';
import { Config } from './configration';
import { exec, ExecOptions } from 'child_process';
/**
 * A function used when using boxasm.bat to run or debug ASM codes in DOSBox
 * @param conf The config information
 * @param runOrDebug true for run ASM code,false for debug
 */
export async function runDosbox2(conf: Config, runOrDebug: boolean): Promise<string> {
    let fs = workspace.fs;
    let src: Uri = Uri.joinPath(conf.extScriptsUri, "./boxasm.bat");
    let target: Uri = Uri.joinPath(conf.toolsUri, "./boxasm.bat");
    if (!conf.customToolInfo?.hasBoxasm) { await fs.copy(src, target, { overwrite: true }); }
    await runDosbox(conf, conf.boxasmCommand(runOrDebug));
    let stdout: Uint8Array = await fs.readFile(conf.workloguri)
    return stdout.toString();
}
/**open dosbox and do things about it
 * @param conf The config information
 * @param more The commands needed to exec in dosbox
 * @param doc If defined, copy this file to workspace as T.xxx(xxx is the files extension) using terminal commands
 */
export function runDosbox(conf: Config, more?: string, doc?: TextDocument): Promise<string> {
    let preCommand: string = "";
    let boxcmd: string = '@echo off\n';
    boxcmd += `mount c \\\"${conf.toolsUri.fsPath}\\\"\nmount d \\\"${conf.workUri.fsPath}\\\"\n`;//mount the necessary path
    boxcmd += "d:\nset PATH=%%PATH%%;c:\\tasm;c:\\masm\n";//switch to the working space and add path\
    if (doc) {
        let filename = doc?.fileName;
        let fileext = filename?.substring(filename.lastIndexOf("."), filename.length);
        boxcmd += `echo Your file has been copied as D:\\T${fileext}\n`;
        if (process.platform === 'win32') {
            preCommand = `del/Q T*.* & copy "${filename}" "T${fileext}" & `;
        }
        else {
            preCommand = `rm -f [Tt]*.*;cp "${filename}" T${fileext};'`;
        }
    };
    boxcmd += "@echo on";
    if (more) { boxcmd += "\n" + more; }//add extra commands
    let opt: OPTS = {
        cwd: conf.workUri.fsPath,
        preOpen: preCommand,
        core: conf.OpenDosbox,
        boxcmd: boxcmd,
        parameter: ' -conf "' + conf.dosboxconfuri.fsPath + '" '
    };
    return openDosbox(opt);
}
/**
 * opendosbox at the Editor's file's folder
 * @param conf config
 * @param doc the doc
 */
export function BoxOpenCurrentFolder(conf: Config, doc: TextDocument) {
    let folderpath: string = Uri.joinPath(doc.uri, '../').fsPath;
    let opt: OPTS = {
        cwd: conf.workUri.fsPath,
        core: conf.OpenDosbox,
        boxcmd: `mount e \\\"${folderpath}\\\"\nmount c \\\"${conf.path}\\\"\nset PATH=%%PATH%%;c:\\masm;c:\\tasm\ne:`,
        parameter: ' -conf "' + conf.dosboxconfuri.fsPath + '" '
    };
    openDosbox(opt);
}
/**
 * options for open dosbox
 */
interface OPTS {
    /**
     * the cwd of child_process
     */
    cwd: string,
    /**
     * the core command,usually the command for open dosbox
     */
    core: string
    /**
     * the command exec before the core command
     */
    preOpen?: string,
    /**
     * the parameter for dosbox command
     */
    parameter?: string,
    /**
     * the command need to exec inside dosbox
     */
    boxcmd?: string
}
/**
 * open DOSBox through child_process
 * @param opt options
 */
function openDosbox(opt: OPTS): Promise<string> {
    let str = opt.core + opt.parameter;
    if (opt.preOpen) {
        str = opt.preOpen + str;
    }
    if (opt.boxcmd) {
        let cmd = opt.boxcmd.replace(/\n/g, '" -c "');
        cmd = '-c "' + cmd + '"';
        str += cmd;
    }
    let execOption: ExecOptions;
    if (process.platform === 'win32') {
        execOption = { cwd: opt.cwd, shell: 'cmd.exe' };
    }
    else {
        execOption = { cwd: opt.cwd };
    }
    return new Promise(
        (resolve, reject) => {
            let child = exec(str, execOption, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(stdout);
                }
            });
            child.on('exit', (code) => {
                if (code !== 0) {
                    let msg = `Open dosbox Failed\t exitcode${code}\n`;
                    if (process.platform !== "win32") {
                        msg += 'PLEASE make sure DOSBox can be opened by terminal command "dosbox"';
                    }
                    window.showErrorMessage(msg);
                }
            })
        }
    );
}




