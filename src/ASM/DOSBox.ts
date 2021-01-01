import { Uri, workspace, window, TextDocument, Disposable, OutputChannel } from 'vscode';
import { Config } from './configration';
import { DOSBox } from './dosbox_core';
import { writeBoxconfig } from './dosbox_conf';
import { logger, OutChannel } from './outputChannel';
import { watch as NODEwatch, readFile } from 'fs';
import * as nls from 'vscode-nls';

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();
const configuration = workspace.getConfiguration('masmtasm.dosbox');

export interface BOXCONFIG {
    /** the Uri of folder for scripts*/
    extScriptsUri: Uri;
    /** the Uri of folder for tools*/
    ASMtoolsUri: Uri;
    /**the information of custom tools folder*/
    customToolInfo: any;
    /**the Uri of the assembler's output via dosbox*/
    workloguri: Uri;
    /** the workspace's Uri*/
    workUri: Uri;
    /** the Uri for the dosbox.exe's folder */
    BOXfolder: Uri;
    /** the Uri of the dosbox conf file for the extension to use*/
    dosboxconfuri: Uri;
}
export class AsmDOSBox extends DOSBox implements Disposable {
    //private dosboxChannel: OutputChannel = window.createOutputChannel('DOSBox console');
    private _BOXrun: string | undefined;
    private _conf: Config;
    constructor(conf: Config) {
        super(conf.BOXfolder.fsPath, conf.dosboxconfuri);
        writeBoxconfig(conf.dosboxconfuri, configuration.get('config'));

        this._conf = conf;
        this.update(configuration);
        this._BOXrun = configuration.get('run');

        if (this.redirect) {
            this.stdoutHander = (message: string, text: string, code: number) => {
                logger({
                    title: localize('dosbox.console.stdout', '[dosbox console stdout] No.{0}', code.toString()),
                    content: message
                });
                if (this.console === 'redirect(show)') {
                    OutChannel.show();
                }
                else if (this.console === 'redirect(hide)') {
                    OutChannel.hide();
                }
            };
            this.stderrHander = (message: string, text: string, code: number) => {
                logger({
                    title: localize('dosbox.console.stderr', '[dosbox console stderr] No.{0}', code.toString()),
                    content: message
                });
            };
        }
    }

    /**
     * A function used when using boxasm.bat to run or debug ASM codes in DOSBox
     * make sure there is a `T.asm` in workspace
     * @param runOrDebug true for run ASM code,false for debug
     * @returns the Assembler's output
     */
    public async runDosbox2(runOrDebug: boolean, ASM: 'MASM' | 'TASM') {
        let loguri = Uri.joinPath(this._conf.workUri, 'T.TXT');
        let AsmMsg: string = "";
        await manageBat(this._conf, runOrDebug);
        // //code from here doesn't work
        // let watcher = NODEwatch(this._conf.workUri.fsPath,
        //     (event, filename) => {
        //         // console.log(event, filename);
        //         if (filename === 'T.TXT') {
        //             readFile(loguri.fsPath, { encoding: 'utf8' },
        //                 (error, data) => {
        //                     if (error) {
        //                         console.error(error);
        //                     }
        //                     //console.log(data);
        //                     if (data.length > 10) {
        //                         // console.log(data);
        //                         watcher.removeAllListeners;
        //                         AsmMsg = data;
        //                     }
        //                 });
        //         }
        //     }
        // );
        await this.runDosbox([boxasmCommand(runOrDebug, ASM, this._BOXrun)]);
        AsmMsg = (await workspace.fs.readFile(loguri)).toString();
        return AsmMsg;
    }
    /**open dosbox and do things about it
     * this function will mount the tools as `C:` and the workspace as `D:`
     * set paths for masm and tasm and switch to the disk
     * @param more The commands needed to exec in dosbox
     * @param doc If defined, copy this file to workspace as T.xxx(xxx is the files extension) using terminal commands
     */
    public runDosbox(more?: string[], doc?: TextDocument) {
        let p = runDosbox(this._conf, more, doc);
        return this.run(p.boxcmd, p.opt);
    }
    /**
    * opendosbox at the Editor's file's folder
    * @param conf config
    * @param the uri of the folder
    */
    public async BoxOpenFolder(uri: Uri, command?: string) {
        let cmd = BoxOpenFolder(this._conf, uri);
        if (command) {
            cmd.push(...command.split('\n'));
        }
        let a = await this.run(cmd);
        return a;
    }

    public dispose() {
    }
}

/**
 * the command to send to dosbox command to operate ASM codes
 * @param runOrDebug true to run code, false to debug
 */
function boxasmCommand(runOrDebug: boolean, MASMorTASM: 'MASM' | 'TASM', BOXrun?: string,): string {

    let str = "c:\\boxasm.bat " + MASMorTASM;
    if (runOrDebug) {
        let param: string = ' ';
        switch (BOXrun) {
            case "keep": param = 'k'; break;
            case "exit": param = 'e'; break;
            case "pause":
            default: param = 'p'; break;
        }
        str += " run " + param;
    }
    else {
        str += " debug ";
    }
    return str;
}

/**
 * the param need to use with batch in DOSBox after run the ASM code
 */
function boxrunbat(BOXrun: string): string {
    let param: string = ' ';
    switch (BOXrun) {
        case "keep": param = 'k'; break;
        case "exit": param = 'e'; break;
        case "pause":
        default: param = 'p'; break;
    }
    return param;
}

async function manageBat(conf: BOXCONFIG, runOrDebug: boolean) {
    let fs = workspace.fs;
    let src: Uri = Uri.joinPath(conf.extScriptsUri, "./boxasm.bat");
    let target: Uri = Uri.joinPath(conf.ASMtoolsUri, "./boxasm.bat");
    //if there is a `boxasm.bat` file in the user's tools folder, use it
    //Otherwise, copy the file packaged inside to the user's folder
    if (!conf.customToolInfo?.hasBoxasm) { await fs.copy(src, target, { overwrite: true }); }
}

function runDosbox(conf: BOXCONFIG, more?: string[], doc?: TextDocument) {
    let preCommand: string = "";
    let boxcmd: string[] = ['@echo off'];
    boxcmd.push(
        `mount c \\\"${conf.ASMtoolsUri.fsPath}\\\"`,
        `mount d \\\"${conf.workUri.fsPath}\\\"`,//mount the necessary path
        "set PATH=%%PATH%%;c:\\tasm;c:\\masm",//switch to the working space and add path\
        "d:"//switch to the disk
    );
    if (doc) {
        let filename = doc?.fileName;
        let fileext = filename?.substring(filename.lastIndexOf("."), filename.length);
        boxcmd.push(`echo Your file has been copied as D:\\T${fileext}`);
        if (process.platform === 'win32') {
            preCommand = `del/Q T*.* & copy "${filename}" "T${fileext}" & `;
        }
        else {
            preCommand = `rm -f [Tt]*.*;cp "${filename}" T${fileext};'`;
        }
    };
    boxcmd.push("@echo on");
    if (more) { boxcmd.push(...more); }//add extra commands
    let opt = {
        preOpen: preCommand,
    };
    return { boxcmd, opt };
}

function BoxOpenFolder(conf: BOXCONFIG, uri: Uri, command?: string) {
    let boxcmd = [
        `mount e \\\"${uri.fsPath}\\\"`,
        `mount c \\\"${conf.ASMtoolsUri.fsPath}\\\"`,
        'set PATH=%%PATH%%;c:\\masm;c:\\tasm',
        'e:',
    ];
    if (command) {
        boxcmd?.push(...command.split('\n'));
    }
    return boxcmd;
}