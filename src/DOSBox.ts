import { Uri, workspace, window, TextDocument, FileType } from 'vscode';
import { Config } from './configration';
import { exec, ExecOptions } from 'child_process';
import { AssemblerDiag } from './language/diagnose';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();
/**
 * A function used when using boxasm.bat
 * @param conf The config information
 * @param runOrDebug true for run ASM code,false for debug
 * @param doc the source ASM file
 * @param diag using its `diag.ErrMsgProcess` to process the assembler's output
 */
export function runDosbox2(conf: Config, runOrDebug: boolean, doc: TextDocument, diag: AssemblerDiag) {
    let fs = workspace.fs;
    let src: Uri = Uri.joinPath(conf.extScriptsUri, "./boxasm.bat");
    let target: Uri = Uri.joinPath(conf.toolsUri, "./boxasm.bat");
    fs.copy(src, target, { overwrite: conf.toolsBuiltin }).then(
        () => {
            runDosbox(conf, conf.boxasmCommand(runOrDebug), doc).then(
                (stdout) => { BOXdiag(conf, diag, doc); }
            );
        },
        (reason) => {
            console.log(reason);
            runDosbox(conf, conf.boxasmCommand(runOrDebug), doc).then(
                (stdout) => { BOXdiag(conf, diag, doc); }
            );
        }
    );
}
/**open dosbox and do things about it
 * @param conf The config information
 * @param more The commands needed to exec in dosbox
 * @param doc If defined, copy this file to workspace as T.xxx(xxx is the files extension)
 */
export function runDosbox(conf: Config, more?: string, doc?: TextDocument): Promise<string> {
    let filename = doc?.fileName;
    let fileext = filename?.substring(filename.lastIndexOf("."), filename.length);
    let preCommand: string = "";
    let boxcmd: string = '@echo off\n';
    boxcmd += `mount c \\\"${conf.path}\\\"\nmount d \\\"${conf.workpath}\\\"\n`;//mount the necessary path
    boxcmd += "d:\nset PATH=%%PATH%%;c:\\tasm;c:\\masm\n";//switch to the working space and add path\
    if (doc) {
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
        cwd: conf.workpath,
        preOpen: preCommand,
        core: conf.OpenDosbox,
        boxcmd: boxcmd,
        parameter: ' -conf "' + conf.dosboxconfuri.fsPath + '" '
    };
    return openDosbox(opt);
}
export function BoxOpenCurrentFolder(conf: Config, doc: TextDocument) {
    let folderpath: string = Uri.joinPath(doc.uri, '../').fsPath;
    let opt: OPTS = {
        cwd: conf.workpath,
        core: conf.OpenDosbox,
        boxcmd: `mount e \\\"${folderpath}\\\"\nmount c \\\"${conf.path}\\\"\nset PATH=%%PATH%%;c:\\masm;c:\\tasm\ne:`,
        parameter: ' -conf "' + conf.dosboxconfuri.fsPath + '" '
    };
    openDosbox(opt);
}
interface OPTS {
    cwd: string,
    core: string
    preOpen?: string,
    parameter?: string,
    boxcmd?: string
}
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
            exec(str, execOption, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(stdout);
                }
            });
        }
    );
}
function BOXdiag(conf: Config, diag: AssemblerDiag, doc: TextDocument): string {
    let info: string = ' ', content: string;
    if (doc) {
        content = doc.getText();
        workspace.fs.readFile(conf.workloguri).then(
            (text) => {
                info = text.toString();
                if (diag.ErrMsgProcess(content, info, doc.uri, conf.MASMorTASM) === 0) {
                    let Errmsgwindow = localize("dosbox.errmsg", '{0} Failed to compile. See the output for more information', conf.MASMorTASM);
                    window.showErrorMessage(Errmsgwindow);
                }
            },
            () => { console.error('read dosbox mode T.txt FAILED'); }
        );
    }
    return info;
}



