import { Uri, workspace, window, TextDocument, Disposable, OutputChannel } from 'vscode';
import { Config } from './configration';
import { DOSBox } from './dosbox_core';
import { writeBoxconfig } from './dosbox_conf';

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
    private dosboxChannel: OutputChannel = window.createOutputChannel('DOSBox console');
    private _BOXrun: string | undefined
    private _conf: Config;
    constructor(conf: Config) {
        super(conf.BOXfolder.fsPath, conf.dosboxconfuri);
        writeBoxconfig(conf.dosboxconfuri, configuration.get('config'));

        this._conf = conf;
        this.update(configuration);
        this._BOXrun = configuration.get('run')

        if (this.redirect) {
            this.stdoutHander = (message: string) => {
                this.dosboxChannel.append(message);
                if (this.console === 'redirect(show)') {
                    this.dosboxChannel.show(true);
                }
                else if (this.console === 'redirect(hide)') {
                    this.dosboxChannel.hide();
                }
            };
            this.stderrHander = (message: string) => {
                this.dosboxChannel.append(message);
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
        await manageBat(this._conf, runOrDebug);
        this.runDosbox([boxasmCommand(runOrDebug, ASM, this._BOXrun)]);
        //TODO: it seems we can read the file when generated instead of reading it after the dosbox exit
        let stdout: Uint8Array = await workspace.fs.readFile(Uri.joinPath(this._conf.workUri, 'T.TXT'));
        return stdout.toString();
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
        this.dosboxChannel.dispose();
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