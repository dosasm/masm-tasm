import { TextEncoder } from "util";
import { Disposable, Uri, workspace } from 'vscode';
import * as nls from 'vscode-nls';
import { Config, SRCFILE } from '../configration';
import { writeBoxconfig } from './dosbox_conf';
import { DOSBox } from './dosbox_core';
import { logger, OutChannel } from '../outputChannel';

//the limit of commands can be exec in dosbox, over this limit the commands will be write to a file
const DOSBOX_CMDS_LIMIT = 5;
const WAIT_AFTER_LAUCH_DOSBOX = 8000;
const DELAY = (timeout: number) => new Promise((resolve, reject) => {
    setTimeout(resolve, timeout);
})

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class AsmDOSBox extends DOSBox implements Disposable {
    //private dosboxChannel: OutputChannel = window.createOutputChannel('DOSBox console');
    private _BOXrun: string | undefined;
    private _conf: Config;
    constructor(conf: Config) {
        super(conf.Uris.dosbox.fsPath, conf.dosboxconfuri);
        this._conf = conf;
        const configuration = workspace.getConfiguration('masmtasm.dosbox');
        writeBoxconfig(conf.dosboxconfuri, configuration.get('config'));
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
     * A function to run or debug ASM codes in DOSBox
     * @param runOrDebug true for run ASM code,false for debug
     * @param file the Uri of the file
     * @returns the Assembler's output
     */
    public async runDosbox2(src: SRCFILE, runOrDebug: boolean) {
        let loguri = Uri.joinPath(this._conf.Uris.globalStorage, 'asm.log');
        let AsmMsg: string = "";
        let boxcmd: string[] = [];
        let asm = this._conf.getBoxAction(this._conf.MASMorTASM, src);
        boxcmd.push(...Array.isArray(asm) ? asm : []);
        if (runOrDebug) {
            let run = this._conf.getBoxAction('run', src);
            boxcmd.push(...run);
        }
        else {
            let debug = this._conf.getBoxAction(this._conf.MASMorTASM + '_debug', src);
            if (Array.isArray(debug)) {
                boxcmd.push(...debug);
            }
        }
        this.runDosbox(src, boxcmd, { exitwords: true });
        await DELAY(WAIT_AFTER_LAUCH_DOSBOX);
        AsmMsg = (await workspace.fs.readFile(loguri)).toString();
        return AsmMsg;
    }

    /**open dosbox and do things about it
     * this function will mount the tools as `C:` and the workspace as `D:`
     * set paths for masm and tasm and switch to the disk
     * @param src The source code file
     * @param more The commands needed to exec in dosbox
     */
    public async runDosbox(src: SRCFILE, more?: string[], opt?: { exitwords: boolean }) {
        let boxcmd: string[] = [];
        boxcmd.push(
            `@mount c \\\"${this._conf.Uris.tools.fsPath}\\\"`,//mount the tools folder as disk C
            `@mount d \\\"${src.folder.fsPath}\\\"`,//mount the folder of source file as disk D
            `@mount X \\\"${this._conf.Uris.globalStorage.fsPath}\\\"`,//mount a seperate space as X for the extension to read logs
            "d:"//switch to the disk of source code file
        );

        if (more) { boxcmd.push(...more); }
        if (opt?.exitwords) { boxcmd.push(...this.boxruncmd); }
        console.log(boxcmd);
        if (boxcmd.length > DOSBOX_CMDS_LIMIT) {
            let omit = boxcmd.slice(DOSBOX_CMDS_LIMIT - 1);
            let unit8 = new TextEncoder().encode(omit.join('\n'));
            let dst = Uri.joinPath(this._conf.Uris.globalStorage, 'more.bat');
            await workspace.fs.writeFile(dst, unit8);
            boxcmd.splice(DOSBOX_CMDS_LIMIT - 1, omit.length);
            boxcmd.push('x:\\more.bat');
        }

        return this.run(boxcmd);
    }

    /**
    * opendosbox at the Editor's file's folder
    * @param conf config
    * @param the uri of the folder
    */
    public async BoxOpenFolder(uri: Uri, command?: string) {
        let boxcmd = [
            `@mount e \\\"${uri.fsPath}\\\"`,
            `@mount c \\\"${this._conf.Uris.tools.fsPath}\\\"`,
            '@set PATH=%%PATH%%;c:\\masm;c:\\tasm',
            'e:',
        ];
        if (command) {
            boxcmd.push(...command.split('\n'));
        }
        let a = await this.run(boxcmd);
        return a;
    }
    /** the command need to run in DOSBox after run the ASM code*/
    public get boxruncmd(): string[] {
        let command: string[] = [];
        switch (this._BOXrun) {
            case "keep": break;
            case "exit": command.push('exit'); break;
            case 'pause': command.push('pause', 'exit');
            case "choose":
            default: command = this._conf.getBoxAction('after_action'); break;
        }
        return command;
    }
    public dispose() {
    }


}




