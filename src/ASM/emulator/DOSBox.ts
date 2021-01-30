import { TextEncoder } from "util";
import { FileType, Uri, window, workspace, WorkspaceConfiguration } from 'vscode';
import * as nls from 'vscode-nls';
import { ASMTYPE, Config, SRCFILE, settingsStrReplacer } from '../configration';
import { Logger } from '../outputChannel';
import { ASMPREPARATION, ASSEMBLERMSG, EMURUN, MSGProcessor } from "../runcode";
import { inDirectory } from "../util";
import { writeBoxconfig } from './dosbox_conf';
import { DOSBox as dosboxCore, WINCONSOLEOPTION, DOSBoxStd } from './dosbox_core';
const fs = workspace.fs;
/**the limit of commands can be exec in dosbox, over this limit the commands will be write to a file*/
const DOSBOX_CMDS_LIMIT = 5;
/**the time interval between launch dosbox and read asmlog file*/
const WAIT_AFTER_LAUNCH_DOSBOX = 8000;
/**the file name of dosbox conf file for use */
const DOSBOX_CONF_FILENAME = 'VSC-ExtUse.conf';
/**the file name of log of assembler */
const ASM_LOG_FILE = 'ASM.LOG';
/**the file name of log of linker */
const LINK_LOG_FILE = 'LINK.LOG';
const DELAY = (timeout: number): Promise<void> => new Promise((resolve, reject) => {
    setTimeout(resolve, timeout);
});

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

/**interface for configurations from vscode settings */
interface DosboxAction {
    open: string[];
    masm: string[];
    tasm: string[];
    tasm_debug: string[];
    masm_debug: string[];
    run: string[];
    after_action: string[];
}

/**class for configurations from VSCode settings */
class BoxVSCodeConfig {
    private get _target(): WorkspaceConfiguration {
        return workspace.getConfiguration('masmtasm.dosbox');
    };
    get config(): { [id: string]: string } | undefined {
        return this._target.get('config');
    }
    get run(): string | undefined {
        return this._target.get('run');
    }
    get console(): string {
        return this._target.get('console') as string;
    }
    get command(): string | undefined {
        const output = this._target.get('command');
        if (typeof output !== 'string') {
            return undefined;
        }
        return output;
    }
    getAction(scope: keyof DosboxAction): string[] {
        const a = this._target.get('more') as DosboxAction;
        let output = a[scope];
        if (Array.isArray(output)) {
            if (this.replacer) {
                output = output.map(this.replacer);
            }
            return output;
        }
        window.showErrorMessage(`action ${scope} hasn't been defined`);
        throw new Error(`action ${scope} hasn't been defined`);
    }
    replacer?: (str: string) => string;
    public runDebugCmd(runOrDebug: boolean, ASM: ASMTYPE): string[] {
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
    public AsmLinkRunDebugCmd(runOrDebug: boolean, ASM: ASMTYPE): string[] {
        let asmlink: string[];
        switch (ASM) {
            case ASMTYPE.MASM: asmlink = this.getAction('masm'); break;
            case ASMTYPE.TASM: asmlink = this.getAction('tasm'); break;
        }
        return asmlink.concat(this.runDebugCmd(runOrDebug, ASM));
    }
}

export class DOSBox extends dosboxCore implements EMURUN {
    //private dosboxChannel: OutputChannel = window.createOutputChannel('DOSBox console');
    private _BOXrun: string | undefined;
    private _conf: Config;
    private vscConfig: BoxVSCodeConfig;
    constructor(conf: Config) {
        const vscConf = new BoxVSCodeConfig();
        let boxconsole: WINCONSOLEOPTION | undefined = undefined;
        if (vscConf.command === undefined || vscConf.command.length === 0) {
            switch (vscConf.console) {
                case "min":
                    boxconsole = WINCONSOLEOPTION.min;
                    break;
                case "normal":
                    boxconsole = WINCONSOLEOPTION.normal;
                    break;
                case "noconsole":
                case "redirect(show)":
                case "redirect":
                default:
                    boxconsole = WINCONSOLEOPTION.noconsole;
                    break;
            }
        }
        super(conf.Uris.dosbox.fsPath, vscConf.command, boxconsole);
        this.forceCopy = false;
        this._conf = conf;
        this.vscConfig = vscConf;

        this._BOXrun = vscConf.run;

        if (this.redirect) {
            this.stdoutHander = (message: string, text: string, code: number): void => {
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
            this.stderrHander = (message: string, _text: string, code: number): void => {
                Logger.send({
                    title: localize('dosbox.console.stderr', '[dosbox console stderr] No.{0}', code.toString()),
                    content: message
                });
            };
        }
    }
    //implement the interface 
    forceCopy: boolean;
    async prepare(opt?: ASMPREPARATION): Promise<boolean> {
        //write the config file for extension
        this.confFile = Uri.joinPath(this._conf.Uris.globalStorage, DOSBOX_CONF_FILENAME);
        await writeBoxconfig(this.confFile, this.vscConfig.config);

        if (opt?.src) { this.forceCopy = !opt?.src.dosboxFsReadable; };
        this.vscConfig.replacer = (val: string): string => settingsStrReplacer(val, this._conf, opt?.src);
        return true;
    }
    openEmu(folder: Uri): Promise<unknown> {
        const commands = this.vscConfig.getAction('open');
        return this.runDosbox(folder, commands);
    }
    async Run(src: SRCFILE, msgprocessor?: MSGProcessor): Promise<void> {
        const { all, race } = await this.runDebug(src, true);
        const asm = await race;
        if (msgprocessor) { msgprocessor(asm, { preventWarn: true }); }
        await all;
    }
    async Debug(src: SRCFILE, msgprocessor?: MSGProcessor): Promise<void> {
        const { all, race } = await this.runDebug(src, true);
        const asm = await race;
        if (msgprocessor) { msgprocessor(asm, { preventWarn: true }); }
        await all;
    }
    /**
     * A function to run or debug ASM codes in DOSBox
     * @param runOrDebug true for run ASM code,false for debug
     * @param file the Uri of the file
     * @returns the Assembler's output
     */
    public async runDebug(src: SRCFILE, runOrDebug: boolean): Promise<{ all: Promise<ASSEMBLERMSG | undefined>; race: Promise<ASSEMBLERMSG> }> {
        //clean logs file for asm and link
        const dirs = await fs.readDirectory(this._conf.Uris.globalStorage);
        let dir = inDirectory(dirs, [ASM_LOG_FILE, FileType.File]);
        if (dir) {
            const asmloguri = Uri.joinPath(this._conf.Uris.globalStorage, dir[0]);
            await fs.delete(asmloguri);
        }
        dir = inDirectory(dirs, [LINK_LOG_FILE, FileType.File]);
        if (dir) {
            const asmloguri = Uri.joinPath(this._conf.Uris.globalStorage, dir[0]);
            await fs.delete(asmloguri);
        }
        //launch dosbox and read logs
        /**read logs file and make sure asm log is not empty*/
        const readMsg = async (): Promise<undefined | { asm: string; link: string }> => {
            const dirs = await fs.readDirectory(this._conf.Uris.globalStorage);
            const asmlog = inDirectory(dirs, [ASM_LOG_FILE, FileType.File]);
            const linklog = inDirectory(dirs, [LINK_LOG_FILE, FileType.File]);
            if (asmlog && linklog) {
                const asmloguri = Uri.joinPath(this._conf.Uris.globalStorage, asmlog[0]);
                const linkloguri = Uri.joinPath(this._conf.Uris.globalStorage, linklog[0]);
                const asm = (await fs.readFile(asmloguri)).toString();
                const link = (await fs.readFile(linkloguri)).toString();
                if (asm.trim().length > 0) {
                    return { asm, link };
                }
            }
            return undefined;
        };
        /**read logs after DOSBox exit*/
        const exitRead: Promise<{ asm: string; link: string } | undefined> = new Promise(
            async (resolve) => {
                await this.runDosbox(src.folder, this.vscConfig.AsmLinkRunDebugCmd(runOrDebug, this._conf.MASMorTASM), { exitwords: true });
                const msg = await readMsg();
                resolve(msg);
            }
        );
        /**read logs at two time 
         * 1. WAIT_AFTER_LAUNCH_DOSBOX ms after launch DOSBox
         * 2. after DOSBox exit
         */
        const race: Promise<{ asm: string; link: string }> = new Promise(
            async (resolve, reject) => {
                await DELAY(WAIT_AFTER_LAUNCH_DOSBOX);
                let msg = await readMsg();
                if (msg) {
                    resolve(msg);
                } else {
                    msg = await exitRead;
                    if (msg) {
                        resolve(msg);
                    }
                    else {
                        reject('no log readed');
                    }
                }

            }
        );
        return { all: exitRead, race };
    }

    /**open dosbox and do things about it
     * this function will mount the tools as `C:` and the workspace as `D:`
     * set paths for masm and tasm and switch to the disk
     * @param folder The uri of the folder needed to mount to disk `d`
     * @param more The commands needed to exec in dosbox
     */
    public async runDosbox(folder: Uri, more?: string[], opt?: { exitwords: boolean }): Promise<DOSBoxStd> {
        const boxcmd: string[] = [];
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
            const omit = boxcmd.slice(DOSBOX_CMDS_LIMIT - 1);
            const unit8 = new TextEncoder().encode(omit.join('\n'));
            const dst = Uri.joinPath(this._conf.Uris.globalStorage, 'more.bat');
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
                return this.vscConfig.getAction('after_action');
        }
    }
}




