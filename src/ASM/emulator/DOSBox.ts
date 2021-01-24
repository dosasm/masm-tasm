import { TextEncoder } from "util";
import { Uri, window, workspace } from 'vscode';
import * as nls from 'vscode-nls';
import { Config, SRCFILE, str_replacer } from '../configration';
import { logger, OutChannel } from '../outputChannel';
import { EMURUN } from "../runcode";
import { writeBoxconfig } from './dosbox_conf';
import { DOSBox as dosbox_core, WINCONSOLEOPTION } from './dosbox_core';

//the limit of commands can be exec in dosbox, over this limit the commands will be write to a file
const DOSBOX_CMDS_LIMIT = 5;
//the time interval between launch dosbox and read asmlog file
const WAIT_AFTER_LAUNCH_DOSBOX = 8000;
const DOSBOX_CONF_FILENAME = 'VSC-ExtUse.conf';
const DELAY = (timeout: number) => new Promise((resolve, reject) => {
    setTimeout(resolve, timeout);
})

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class DOSBox implements EMURUN {
    private _asmdosbox: AsmDOSBox;
    constructor(conf: Config) {
        this._asmdosbox = new AsmDOSBox(conf);
    }
    prepare(conf: Config): boolean {
        this._asmdosbox = new AsmDOSBox(conf);
        return true;
    }
    openEmu(folder: Uri): Promise<any> {
        return this._asmdosbox.runDosbox(folder);
    }
    async Run(src: SRCFILE, msgprocessor: (ASM: string, link?: string) => boolean): Promise<any> {
        let asm = await this._asmdosbox.runDebug(src, true);
        msgprocessor(asm);
    }
    async Debug(src: SRCFILE, msgprocessor: (ASM: string, link?: string) => boolean): Promise<any> {
        let asm = await this._asmdosbox.runDebug(src, false);
        msgprocessor(asm);
    }
}

class BoxVSCodeConfig {
    private get _target() {
        return workspace.getConfiguration('masmtasm.dosbox');
    };
    get config(): Object | undefined {
        return this._target.get('config')
    }
    get run(): string | undefined {
        return this._target.get('run')
    }
    get console() {
        return this._target.get('console')
    }
    get command(): string | undefined {
        let output = this._target.get('command');
        if (typeof output !== 'string') {
            return undefined;
        }
        return output;
    }
    get ASMconfig(): DosboxAction {
        let a = this._target.get('AsmConfig') as any;
        console.log(a);
        console.log(a.masm);
        console.log(a.get('masm'))
        return this._target.get('AsmConfig') as DosboxAction
    }
    AsmConfigReplace(src?: SRCFILE, conf?: Config): DosboxAction {
        let act = this.ASMconfig as any;
        for (const key in act) {
            for (const id in act[key]) {
                act[key][id] = str_replacer(act[key][id], conf, src);
            }
        }
        return act;
    }
    getAction(scope: string, replacer?: (str: string) => string) {
        let a = this._target.get('AsmConfig') as any;
        let output = a[scope];
        if (Array.isArray(output)) {
            if (replacer) {
                output = output.map(replacer)
            }
            return output
        }
        window.showErrorMessage(`action ${scope} hasn't been defined`)
        throw new Error(`action ${scope} hasn't been defined`)
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

class AsmDOSBox extends dosbox_core {
    //private dosboxChannel: OutputChannel = window.createOutputChannel('DOSBox console');
    private _BOXrun: string | undefined;
    private _conf: Config;
    private asmConfig: BoxVSCodeConfig;
    constructor(conf: Config) {
        let vscConf = new BoxVSCodeConfig();

        super(conf.Uris.dosbox.fsPath, vscConf.command);
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
                logger({
                    title: localize('dosbox.console.stdout', '[dosbox console stdout] No.{0}', code.toString()),
                    content: message
                });
                if (vscConf.console === 'redirect(show)') {
                    OutChannel.show();
                }
                else if (vscConf.console === 'redirect(hide)') {
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
    public async runDebug(src: SRCFILE, runOrDebug: boolean) {
        let loguri = Uri.joinPath(this._conf.Uris.globalStorage, 'asm.log');
        let AsmMsg: string = "";
        let boxcmd: string[] = [];
        let replacer = (str: string) => str_replacer(str, this._conf, src);
        let asm = this.asmConfig.getAction(this._conf.MASMorTASM, replacer)//action[this._conf.MASMorTASM];
        boxcmd.push(...asm);
        if (runOrDebug) {
            boxcmd.push(...this.asmConfig.getAction('run', replacer));
        }
        else {
            boxcmd.push(...this.asmConfig.getAction(this._conf.MASMorTASM + '_debug', replacer));
        }
        this.runDosbox(src.folder, boxcmd, { exitwords: true });
        await DELAY(WAIT_AFTER_LAUNCH_DOSBOX);
        AsmMsg = (await workspace.fs.readFile(loguri)).toString();
        return AsmMsg;
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
                return this.asmConfig.getAction('after_action')
        }
    }
}




