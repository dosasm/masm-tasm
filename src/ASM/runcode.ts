import { Disposable, ExtensionContext, FileType, TextDocument, Uri, window, workspace } from 'vscode';
import * as nls from 'vscode-nls';
import { Config, SRCFILE } from './configration';
import { AssemblerDiag, DIAGCODE } from './diagnose';
import { AsmDOSBox } from './DOSBox';
import { logger, OutChannel } from './outputChannel';
import { inArrays } from "./util";
import * as MSDos from './viaPlayer';

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export enum ASMCMD {
    OpenEmu,
    debug,
    run
}

export class AsmAction implements Disposable {
    private ctx: ExtensionContext;
    private _config: Config;
    private dosbox: AsmDOSBox;
    private landiag: AssemblerDiag;
    constructor(context: ExtensionContext) {
        this.ctx = context;
        this._config = new Config(context);
        this.landiag = new AssemblerDiag();
        this.dosbox = new AsmDOSBox(this._config);
        this.update();
    }

    private update() {
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('masmtasm')) {
                this._config = new Config(this.ctx);
                this.dosbox = new AsmDOSBox(this._config);
            }
            if (e.affectsConfiguration('masmtasm.dosbox')) {
                this.dosbox.update(workspace.getConfiguration('masmtasm.dosbox'));
            }
        });
    }

    public async BoxHere(uri?: Uri, command?: string) {
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
        if (folder) {
            let output = await this.dosbox.BoxOpenFolder(folder, command);
            return output;
        }
        else {
            window.showWarningMessage('no folder to open \nThe extension use the activeEditor file\'s folder or workspace folder');
        }
    }

    /**Do the operation according to the input.
     * "opendosbox": open DOSBOX at a separated space;
     * "here": open dosbox at the vscode editor file's folder;
     * "run": compile and run the ASM code ;
     * "debug": compile and debug the ASM code;
     * @param command "opendosbox" or "run" or "debug" or "here"
     */
    public async runcode(command: ASMCMD, uri?: Uri) {
        let sourceFile = uri, output: any, doc: TextDocument | undefined;
        if (uri === undefined) {
            doc = window.activeTextEditor?.document;
            if (doc) {
                if (this._config.savefirst && doc.isDirty) {
                    await doc.save();
                }
                sourceFile = doc.uri;
            }
        }
        if (sourceFile && await this._config.prepare()) {
            let src = new SRCFILE(sourceFile);
            if (this._config.Seperate) {
                if (this._config.DOSemu === 'dosbox') {
                    await src.copyto(this._config.Uris.workspace, { clean: this._config.Seperate });
                }
                else {
                    let path = this._config.getPlayerAction('workspace');
                    let uri = Uri.file(path);
                    await src.copyto(uri);
                }
            }
            src.doc = doc ? doc : undefined;
            let msg = { title: "", content: src.pathMessage() };
            switch (command) {
                case ASMCMD.OpenEmu:
                    if (this._config.DOSemu === 'msdos player') {
                        msg.title = localize("openemu.msdos", "\n[execute]Open cmd(add msdos to path)");
                    }
                    else {
                        msg.title = localize("openemu.dosbox", "\n[execute]Open dosbox");
                    }
                    break;
                case ASMCMD.run:
                    msg.title = localize("run.msg", "\n[execute]use {0} in {1} to Run ASM code file:", this._config.MASMorTASM, this._config.DOSemu);
                    break;
                case ASMCMD.debug:
                    msg.title = localize("debug.msg", "\n[execute]use {0} in {1} to Debug ASM code file:", this._config.MASMorTASM, this._config.DOSemu);
                    break;
            }
            if (!src.dosboxFsReadable && this._config.DOSemu === 'dosbox') {
                await src.copyto(this._config.Uris.workspace);
                msg.content += `\ncopied as "${src.uri.fsPath}" for dosbox can only process short filename`;
            }
            logger(msg);
            switch (command) {
                case ASMCMD.OpenEmu: this.Openemu(src); break;
                case ASMCMD.run: output = await this.RunDebug(src, true, this._config); break;
                case ASMCMD.debug: output = await this.RunDebug(src, false, this._config); break;
            };
        }
        else {
            window.showErrorMessage('no source file specified');
        }
        return output;
    }

    /**
     * open the emulator
     * @param src the source code file
     */
    private Openemu(src: SRCFILE) {
        let openemumsg: string = "";
        if (this._config.DOSemu === 'msdos player') {
            MSDos.outTerminal(this._config);
        }
        else {
            let cmd = this._config.getBoxAction("open", src);
            this.dosbox.runDosbox(src, Array.isArray(cmd) ? cmd : []);
        }
        logger({
            title: openemumsg,
            content: '"' + src.folder.fsPath + '"'
        });
    }

    /**
     *  `msdos (player) mode`: use msdos for run and debug,but TASM debug command `TD` can only run in dosbox
     *  `auto mode`: run in dosbox,`TD` in dosbox,MASM debug command `debug` in player 
     * 
     *  | feature | MASM run | MASM debug | TASM run | TASM TD |
     *  | ------- | -------- | ---------- | -------- | ------- |
     *  | msdos   | msdos    | msdos      | msdos    | dosbox  |
     *  | auto    | dosbox   | msdos      | dosbox   | dosbox  |
     */
    public async RunDebug(src: SRCFILE, runOrDebug: boolean, conf: Config) {

        //get the output of assembler
        let asmlog: string | undefined = undefined;
        if (conf.DOSemu === "dosbox") {
            asmlog = await this.dosbox.runDosbox2(src, runOrDebug);
        }
        else if (conf.DOSemu === "auto" || conf.DOSemu === "msdos player") {
            asmlog = await MSDos.runPlayer(src, this._config);
        }

        //process and output the output of the assembler
        let diagCode: DIAGCODE | undefined = undefined;
        if (asmlog && src.doc) {
            let diag = this.landiag.ErrMsgProcess(asmlog, src.doc, conf.MASMorTASM);
            diagCode = diag?.flag;
            if (diag) {
                if (diagCode === DIAGCODE.hasError) { OutChannel.show(true); }
                logger({
                    title: localize("diag.msg", "[assembler's message] {0} Error,{1}  Warning collected", diag.error.toString(), diag.warn),
                    content: asmlog
                });
            }
        }
        //check whether the EXE file generated
        let workFolder = await workspace.fs.readDirectory(src.folder);
        let exeGenerated: boolean = inArrays(workFolder, [src.filename + ".exe", FileType.File], true);

        //judge whether it is ok to continue
        let goon: boolean = false;
        //no exe finded
        if (!exeGenerated) {
            if (diagCode === DIAGCODE.hasError) {
                let Errmsg = localize("runcode.error", "{0} Error,Can't generate .exe file\nSee Output panel for information", conf.MASMorTASM);
                window.showErrorMessage(Errmsg);
            }
            else {
                let Errmsg = "EXE file generate failed";
                logger({
                    title: "[this should not happen]",
                    content: "Can't generate .exe file but no error scaned"
                });
                window.showErrorMessage(Errmsg);
            }
        }
        //exe finded. NOTE: the exe file may not be the one generated from source code
        else if ((conf.DOSemu === "msdos player" || conf.DOSemu === "auto")) {
            switch (diagCode) {
                case DIAGCODE.hasWarn:
                    let warningmsgwindow = localize("runcode.warn", "{0} Warning,successfully generate .exe file,but assembler has some warning message", conf.MASMorTASM);
                    let Go_on = localize("runcode.continue", "continue");
                    let Stop = localize("runcode.stop", "stop");
                    let result = await window.showInformationMessage(warningmsgwindow, Go_on, Stop);
                    if (result === Go_on) { goon = true; }
                    break;
                case DIAGCODE.ok:
                    goon = true;
                    break;
            }
        }

        //continue if goon is true
        if (goon) {
            let viaPlayer: boolean = conf.DOSemu === "msdos player";
            //use msdos for debug.exe when debugging code via MASM
            if (conf.MASMorTASM === "MASM" && runOrDebug === false && conf.DOSemu === "auto") { viaPlayer = true; }
            //use dosbox for TD.exe when debugging code with TASM
            if (conf.MASMorTASM === "TASM" && runOrDebug === false && conf.DOSemu === "msdos player") { viaPlayer = false; }
            if (viaPlayer) {
                MSDos.runDebug(runOrDebug, this._config, src);
            }
            else {
                if (!src.dosboxFsReadable) {
                    src.copyEXEto(this._config.Uris.workspace);
                }
                if (runOrDebug) {
                    let run = this._config.getBoxAction('run', src);
                    await this.dosbox.runDosbox(src, run, { exitwords: true });
                }
                else {
                    let debug: string[] = this._config.getBoxAction(conf.MASMorTASM + '_debug', src);
                    if (debug) {
                        await this.dosbox.runDosbox(src, debug);
                    }
                }
            }
        }
        return {
            ASMmsg: asmlog,
            diagCode: diagCode,
            exeGen: exeGenerated
        };
    }

    public cleanalldiagnose() {
        this.landiag.cleandiagnose('both');
    }
    public dispose() {
        OutChannel.dispose();
        MSDos.deactivate();
        this.dosbox.dispose();
        this.cleanalldiagnose();
    }
    public get ASM() { return this._config.MASMorTASM; }
    public get emulator() { return this._config.DOSemu; }
}


