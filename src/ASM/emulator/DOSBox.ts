import { TextEncoder } from "util";
import { FileType, Uri, window, workspace } from 'vscode';
import * as nls from 'vscode-nls';
import { ASMTYPE, Config, SRCFILE, str_replacer } from '../configration';
import { Logger } from '../outputChannel';
import { ASMPREPARATION, EMURUN, MSGProcessor } from "../runcode";
import { writeBoxconfig } from './dosbox_conf';
import { DOSBox as dosbox_core, WINCONSOLEOPTION } from './dosbox_core';
const fs = workspace.fs;
//the limit of commands can be exec in dosbox, over this limit the commands will be write to a file
const DOSBOX_CMDS_LIMIT = 5;
//the time interval between launch dosbox and read asmlog file
const WAIT_AFTER_LAUNCH_DOSBOX = 8000;
const DOSBOX_CONF_FILENAME = 'VSC-ExtUse.conf';
const ASM_LOG_FILE = 'ASM.LOG';
const LINK_LOG_FILE = 'LINK.LOG';
const DELAY = (timeout: number) => new Promise((resolve, reject) => {
    setTimeout(resolve, timeout);
});

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class BoxVSCodeConfig {
    private get _target() {
        return workspace.getConfiguration('masmtasm.dosbox');
    };
    get config(): Object | undefined {
        return this._target.get('config');
    }
    get run(): string | undefined {
        return this._target.get('run');
    }
    get console() {
        return this._target.get('console');
    }
    get command(): string | undefined {
        let output = this._target.get('command');
        if (typeof output !== 'string') {
            return undefined;
        }
        return output;
    }
    getAction(scope: keyof DosboxAction) {
        let a = this._target.get('AsmConfig') as any;
        let key = scope.toLowerCase();
        let output = a[key];
        if (Array.isArray(output)) {
            if (this.replacer) {
                output = output.map(this.replacer);
            }
            return output;
        }
        window.showErrorMessage(`action ${key} hasn't been defined`);
        throw new Error(`action ${key} hasn't been defined`);
    }
    replacer?: (str: string) => string;
    public runDebugCmd(runOrDebug: boolean, ASM: ASMTYPE) {
        if (runOrDebug) {
            return this.getAction('run');
        }
        else {
            switch (ASM) {
                case ASMTYPE.MASM: return this.getAction('masm_debug');
                case ASMTYPE.TASM: return this.getAction('tasm_debug');
            }
        }
    }
    public AsmLinkRunDebugCmd(runOrDebug: boolean, ASM: ASMTYPE) {
        let asmlink: string[];
        switch (ASM) {
            case ASMTYPE.MASM: asmlink = this.getAction('masm'); break;
            case ASMTYPE.TASM: asmlink = this.getAction('tasm'); break;
        }
        return asmlink.concat(this.runDebugCmd(runOrDebug, ASM));
    }
}

interface DosboxAction {
    open: string[];
    masm: string[];
    tasm: string[];
    tasm_debug: string[];
    masm_debug: string[];
    run: string[];
    after_action: string[];
}

export class DOSBox extends dosbox_core implements EMURUN {
    //private dosboxChannel: OutputChannel = window.createOutputChannel('DOSBox console');
    private _BOXrun: string | undefined;
    private _conf: Config;
    private asmConfig: BoxVSCodeConfig;
    constructor(conf: Config) {
        let vscConf = new BoxVSCodeConfig();

        super(conf.Uris.dosbox.fsPath, vscConf.command);
        this.forceCopy = false;
        this._conf = conf;
        this.asmConfig = vscConf;
        //write the config file for extension
        this.confFile = Uri.joinPath(conf.Uris.globalStorage, DOSBOX_CONF_FILENAME);
        writeBoxconfig(conf.dosboxconfuri, vscConf.config);
        if (vscConf.command === undefined) {
            switch (vscConf.console) {
                case "min":
                    this.console = WINCONSOLEOPTION.min;
                    break;
                case "normal":
                    this.console = WINCONSOLEOPTION.normal;
                    break;
                case "noconsole":
                case "redirect(show)":
                case "redirect":
                default:
                    this.console = WINCONSOLEOPTION.noconsole;
                    break;
            }
        }

        this._BOXrun = vscConf.run;

        if (this.redirect) {
            this.stdoutHander = (message: string, text: string, code: number) => {
                Logger.send({
                    title: localize('dosbox.console.stdout', '[dosbox console stdout] No.{0}', code.toString()),
                    content: message
                });
                if (vscConf.console === 'redirect(show)') {
                    Logger.OutChannel.show(true);
                }
                else if (vscConf.console === 'redirect(hide)') {
                    Logger.OutChannel.hide();
                }
            };
            this.stderrHander = (message: string, text: string, code: number) => {
                Logger.send({
                    title: localize('dosbox.console.stderr', '[dosbox console stderr] No.{0}', code.toString()),
                    content: message
                });
            };
        }
    }
    //implement the interface 
    forceCopy: boolean;
    prepare(opt?: ASMPREPARATION): boolean {
        if (opt?.src) { this.forceCopy = !opt?.src.dosboxFsReadable; };
        this.asmConfig.replacer = (val: string) => str_replacer(val, this._conf, opt?.src);
        return true;
    }
    openEmu(folder: Uri): Promise<any> {
        return this.runDosbox(folder);
    }
    async Run(src: SRCFILE, msgprocessor?: MSGProcessor): Promise<any> {
        let { all, race } = await this.runDebug(src, true);
        let asm = await race;
        if (msgprocessor) { msgprocessor(asm, { preventWarn: true }); }
        await all;
    }
    async Debug(src: SRCFILE, msgprocessor?: MSGProcessor): Promise<any> {
        let { all, race } = await this.runDebug(src, true);
        let asm = await race;
        if (msgprocessor) { msgprocessor(asm, { preventWarn: true }); }
        await all;
    }
    /**
     * A function to run or debug ASM codes in DOSBox
     * @param runOrDebug true for run ASM code,false for debug
     * @param file the Uri of the file
     * @returns the Assembler's output
     */
    public async runDebug(src: SRCFILE, runOrDebug: boolean) {
        let asmloguri = Uri.joinPath(this._conf.Uris.globalStorage, ASM_LOG_FILE);
        let linkloguri = Uri.joinPath(this._conf.Uris.globalStorage, LINK_LOG_FILE);
        let dirs = await fs.readDirectory(this._conf.Uris.globalStorage);
        for (const dir of dirs) {
            if (dir[0] === ASM_LOG_FILE && dir[1] === FileType.File) { fs.delete(asmloguri); }
            if (dir[0] === LINK_LOG_FILE && dir[1] === FileType.File) { fs.delete(linkloguri); }
        }

        const readMsg = async (): Promise<{ asm: string; link: string; }> => {
            let asm = (await fs.readFile(asmloguri)).toString();
            let link = (await fs.readFile(linkloguri)).toString();
            return { asm, link };
        };
        const exitRead: Promise<{ asm: string; link: string; }> = new Promise(
            async (resolve, reject) => {
                await this.runDosbox(src.folder, this.asmConfig.AsmLinkRunDebugCmd(runOrDebug, this._conf.MASMorTASM), { exitwords: true });
                let msg = await readMsg();
                if (msg.asm.trim().length === 0) {
                    reject('empty log');
                } else {
                    resolve(msg);
                }
            }
        );
        const delayRead: Promise<{ asm: string; link: string; }> = new Promise(
            async (resolve, reject) => {
                await DELAY(WAIT_AFTER_LAUNCH_DOSBOX);
                let msg = await readMsg();
                if (msg.asm.trim().length === 0) {
                    reject('empty log');
                } else {
                    resolve(msg);
                }

            }
        );
        const all = Promise.all([exitRead, delayRead]);
        const race = Promise.race([exitRead, delayRead]);
        return { all, race };
    }

    /**open dosbox and do things about it
     * this function will mount the tools as `C:` and the workspace as `D:`
     * set paths for masm and tasm and switch to the disk
     * @param folder The uri of the folder needed to mount to disk `d`
     * @param more The commands needed to exec in dosbox
     */
    public async runDosbox(folder: Uri, more?: string[], opt?: { exitwords: boolean }) {
        let boxcmd: string[] = [];
        boxcmd.push(
            `@mount c \\\"${this._conf.Uris.tools.fsPath}\\\"`,//mount the tools folder as disk C
            `@mount d \\\"${folder.fsPath}\\\"`,//mount the folder of source file as disk D
            `@mount X \\\"${this._conf.Uris.globalStorage.fsPath}\\\"`,//mount a separate space as X for the extension to read logs
            "d:"//switch to the disk of source code file
        );

        if (more) { boxcmd.push(...more); }
        if (opt?.exitwords) { boxcmd.push(...this.boxruncmd); }
        //Logger.log(boxcmd);
        if (boxcmd.length > DOSBOX_CMDS_LIMIT) {
            let omit = boxcmd.slice(DOSBOX_CMDS_LIMIT - 1);
            let unit8 = new TextEncoder().encode(omit.join('\n'));
            let dst = Uri.joinPath(this._conf.Uris.globalStorage, 'more.bat');
            await fs.writeFile(dst, unit8);
            boxcmd.splice(DOSBOX_CMDS_LIMIT - 1, omit.length);
            boxcmd.push('@x:\\more.bat');
        }
        return this.run(boxcmd);
    }

    /** the command need to run in DOSBox after run the ASM code*/
    public get boxruncmd(): string[] {
        switch (this._BOXrun) {
            case "keep":
                return [];
            case "exit":
                return (['exit']);
            case 'pause':
                return ['pause', 'exit'];
            case "choose":
            default:
                return this.asmConfig.getAction('after_action');
        }
    }
}




