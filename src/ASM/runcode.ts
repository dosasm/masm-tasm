import { Disposable, ExtensionContext, FileSystemError, TextDocument, Uri, window, workspace } from 'vscode';
import * as nls from 'vscode-nls';
import { Config, DOSEMU, SRCFILE } from './configration';
import { AssemblerDiag, DIAGCODE } from './diagnose/diagnose';
import { AutoMode } from './emulator/auto-mode';
import { DOSBox } from './emulator/dosbox';
import { JSDos } from './emulator/JS-Dos';
import { MsdosPlayer } from './emulator/msdos-player';
import { logger, OutChannel } from './outputChannel';

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

/**message processor return true if no error message*/
export type MSGProcessor = (message: string | { asm: string, link: string }, opt?: { preventWarn: boolean }) => Promise<boolean> | boolean;
export type ASMPREPARATION = { src: SRCFILE, act: ASMCMD }
/**interface for emulator */
export interface EMURUN {
    /**some process needed to do before action*/
    prepare(opt?: ASMPREPARATION): Promise<boolean> | boolean;
    /**open dosbox need*/
    openEmu(folder: Uri): Promise<any> | any;
    /**run code*/
    Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any>;
    /**debug code*/
    Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any>;
    /**return a uri that needed to copy the file to instead of default one in extension globalstorage*/
    copyUri?: Uri;
    /**if true force to copy the sourcecode file to [workspcae](## workspace) */
    forceCopy?: boolean;
}

/**the commands of action*/
export enum ASMCMD {
    OpenEmu,
    debug,
    run
}

/**class for actions of ASM
 * including run and debug code
 */
export class AsmAction implements Disposable {
    private ctx: ExtensionContext;
    private _config: Config;
    private landiag: AssemblerDiag;
    constructor(context: ExtensionContext) {
        this.ctx = context;
        this._config = new Config(context);
        this.landiag = new AssemblerDiag();
    }

    static getEmulator(emu: DOSEMU, conf: Config): EMURUN {
        switch (emu) {
            case DOSEMU.dosbox:
                return new DOSBox(conf);
            case DOSEMU.auto:
                return new AutoMode(conf);
            case DOSEMU.msdos:
                return new MsdosPlayer(conf);
            case DOSEMU.jsdos:
                return new JSDos(conf);
            default:
                window.showWarningMessage('use dosbox as emulator')
                return new DOSBox(conf);
        }
    }

    /**open the dosbox and switch to the needed folder*/
    public async BoxHere(uri?: Uri, emulator?: DOSEMU) {
        //get the folder need to open
        let folder: Uri | undefined = undefined;
        if (uri) {
            folder = uri;
        }
        else {
            if (window.activeTextEditor?.document) {
                folder = Uri.joinPath(window.activeTextEditor?.document.uri, '../');
            }
            else if (workspace.workspaceFolders) {
                if (workspace.workspaceFolders.length === 1) {
                    folder = workspace.workspaceFolders[0].uri;
                }
                else if (workspace.workspaceFolders.length > 1) {
                    let a = await window.showWorkspaceFolderPick();
                    if (a) { folder = a.uri; }
                }
            }
        }
        //choose the emulator
        let dosemu = emulator ? emulator : this._config.DOSemu;
        let emu = AsmAction.getEmulator(dosemu, this._config);
        //open the emulator
        if (folder && await emu.prepare()) {
            let output = await emu.openEmu(folder);
            return output;
        }
        else {
            window.showWarningMessage('no folder to open \nThe extension use the activeEditor file\'s folder or workspace folder');
        }
    }

    /**Do the operation according to the input.*/
    public async runcode(command: ASMCMD, uri?: Uri) {
        const emulator = AsmAction.getEmulator(this._config.DOSemu, this._config);
        let output: any = {};
        //get the target file
        let src: SRCFILE | undefined;
        if (uri) {
            src = new SRCFILE(uri);
        }
        else if (window.activeTextEditor?.document) {
            src = new SRCFILE(window.activeTextEditor.document.uri)
        }
        //construct the source code file class
        if (!src) {
            window.showErrorMessage('no source file specified');
        }
        else if (!await emulator.prepare({ src: src, act: command })) {
            console.warn(this._config.DOSemu + ' emulator is not ready');
        }
        else {
            const doc = await workspace.openTextDocument(src.uri);
            if (doc.isDirty && this._config.savefirst) {
                await doc.save();
            }
            //output the message of the command
            let msg = { title: "", content: src.pathMessage() };
            switch (command) {
                case ASMCMD.OpenEmu:
                    msg.title = localize("openemu.msg", "\n[execute]Open emulator and prepare environment");
                    break;
                case ASMCMD.run:
                    msg.title = localize("run.msg", "\n[execute]use {0} in {1} to Run ASM code file:", this._config.MASMorTASM, this._config.DOSemu);
                    break;
                case ASMCMD.debug:
                    msg.title = localize("debug.msg", "\n[execute]use {0} in {1} to Debug ASM code file:", this._config.MASMorTASM, this._config.DOSemu);
                    break;
            }
            if (this._config.Seperate || emulator.forceCopy) {
                let dst = emulator.copyUri === undefined ? this._config.Uris.workspace : emulator.copyUri;
                await src.copyto(dst);
                msg.content += `\ncopied as "${src.uri.fsPath}"`;
            }
            if (this._config.Clean) {
                await src.cleanDir();
            }
            logger(msg);
            const msgProcessor: MSGProcessor =
                (message: string | { asm: string; link: string; }, opt?: { preventWarn: boolean }) => {
                    let msg = typeof (message) === 'string' ? message : message.asm;
                    let diag = this.landiag.ErrMsgProcess(msg, doc, this.ASM);
                    output.diaginfo = diag;
                    if (diag) {
                        logger({
                            title: localize("diag.msg", "[assembler's message] {0} Error,{1}  Warning collected", diag.error.toString(), diag.warn),
                            content: msg
                        });
                    }
                    switch (diag?.flag) {
                        case DIAGCODE.ok:
                            return true;
                        case DIAGCODE.hasWarn:
                            return this.showWarnInfo()
                        case DIAGCODE.hasError:
                            this.showErrorInfo();
                            OutChannel.show(true);
                            return false;
                    }
                    return false;
                }
            switch (command) {
                case ASMCMD.OpenEmu:
                    output.emulator = emulator.openEmu(src.folder);
                    break;
                case ASMCMD.run:
                    output.emulator = await emulator.Run(src, msgProcessor);
                    break;
                case ASMCMD.debug:
                    output.emulator = await emulator.Debug(src, msgProcessor);
                    break;
            };
            //show information for diagnose
            output.diagCode = output.diaginfo?.flag;

        }
        return output;
    }
    private async showWarnInfo() {
        let warningmsgwindow = localize("runcode.warn", "{0} Warning,successfully generate .exe file,but assembler has some warning message", this.ASM);
        let Go_on = localize("runcode.continue", "continue");
        let Stop = localize("runcode.stop", "stop");
        let result = await window.showInformationMessage(warningmsgwindow, Go_on, Stop);
        if (result === Go_on) {
            return true;
        }
        return false;
    }
    private async showErrorInfo() {
        let Errmsg = localize("runcode.error", "{0} Error,Can't generate .exe file\nSee Output panel for information", this._config.MASMorTASM);
        await window.showErrorMessage(Errmsg);
    }
    public cleanalldiagnose() {
        this.landiag.cleandiagnose('both');
    }
    public dispose() {
        OutChannel.dispose();
        this.cleanalldiagnose();
    }
    public get ASM() { return this._config.MASMorTASM; }
    public get emulator() { return this._config.DOSemu; }
}


