import { Disposable, ExtensionContext, FileType, languages, OutputChannel, TextDocument, Uri, window, workspace, } from 'vscode';
import { Config } from './configration';
import { inArrays } from "./util";
import { AsmDOSBox } from './DOSBox';
import * as MSDos from './viaPlayer';
import * as nls from 'vscode-nls';
import { AssemblerDiag, DIAGCODE } from './diagnose';
import { logger, OutChannel } from './outputChannel';

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class AsmAction implements Disposable {
    private extUri: Uri;
    private _config: Config;
    private dosbox: AsmDOSBox;
    private landiag: AssemblerDiag;
    constructor(context: ExtensionContext) {
        this.extUri = context.extensionUri

        this._config = new Config(context.extensionUri);
        this.landiag = new AssemblerDiag();
        this.dosbox = new AsmDOSBox(this._config);
        this.update();
    }

    private update() {
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('masmtasm')) {
                this._config = new Config(this.extUri, OutChannel);
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
    public async runcode(command: string, uri?: Uri) {//TODO: make it possible to use uri
        let doc = window.activeTextEditor?.document;
        let output: any;
        if (doc) {
            if (this._config.savefirst && doc.isDirty) {
                await doc.save();
            }
            switch (command) {
                case 'opendosbox': this.Openemu(doc); break;
                case 'run': output = await this.RunDebug(doc, true); break;
                case 'debug': output = await this.RunDebug(doc, false); break;
            };
        }
        else {
            window.showErrorMessage('no activeTextEditor document');
        }
        return output;
    }

    /**
     * open the emulator(currently just thethis.dosbox)
     * @param doc The vscode document to be copied to the workspace
     */
    private Openemu(doc: TextDocument) {
        let openemumsg: string = "";
        CleanCopy(doc.uri, this._config.workUri);
        if (this._config.DOSemu === 'msdos player') {

            openemumsg = localize("openemu.msdos", "\n[execute]Open cmd(add msdos to path) and copy file");
            MSDos.outTerminal(this._config);
        }
        else {
            openemumsg = localize("openemu.dosbox", "\n[execute]Open dosbox and copy file");
            this.dosbox.runDosbox();
        }
        logger(
            {
                title: openemumsg,
                content: '"' + doc.fileName + '"'
            }
        );
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
    public async RunDebug(doc: TextDocument, runOrDebug: boolean) {
        let msg: string, DOSemu: string = this._config.DOSemu, MASMorTASM = this._config.MASMorTASM;
        let stdout: string | undefined = undefined;
        //show message
        if (runOrDebug) {
            msg = localize("run.msg", "\n[execute]use {0} in {1} to Run ASM code file:", this._config.MASMorTASM, this._config.DOSemu);
        }
        else {
            msg = localize("debug.msg", "\n[execute]use {0} in {1} to Debug ASM code file:", this._config.MASMorTASM, this._config.DOSemu);
        }
        logger(
            {
                title: runOrDebug ?
                    localize("run.msg", "\n[execute]use {0} in {1} to Run ASM code file:", this._config.MASMorTASM, this._config.DOSemu)
                    : localize("debug.msg", "\n[execute]use {0} in {1} to Debug ASM code file:", this._config.MASMorTASM, this._config.DOSemu),
                content: '"' + doc.fileName + '"'
            }
        );
        //clean files and copy the file to workspace AS `T.ASM`
        await CleanCopy(doc.uri, this._config.workUri);
        //get the output of assembler
        if (DOSemu === "dosbox") {
            stdout = await this.dosbox.runDosbox2(runOrDebug, MASMorTASM);
        }
        else if (DOSemu === "auto" || DOSemu === "msdos player") {
            stdout = await MSDos.runPlayer(this._config);
        }
        //process and output the output of the assembler
        let diagCode: DIAGCODE | undefined = undefined;
        if (stdout) {
            let diag = this.landiag.ErrMsgProcess(stdout, doc, MASMorTASM);
            diagCode = diag?.flag;
            if (diag) {
                if (diagCode === DIAGCODE.hasError) { OutChannel.show(true); }
                logger({
                    title: localize("diag.msg", "[assembler's message] {0} Error,{1}  Warning collected", diag.error.toString(), diag.warn),
                    content: stdout
                });
            }
        }
        //check whether the EXE file generated
        let workFolder = await workspace.fs.readDirectory(this._config.workUri);
        let exeGenerated: boolean = inArrays(workFolder, ["t.exe", FileType.File], true);
        if (exeGenerated === false) {

            let Errmsg: string;
            if (diagCode === DIAGCODE.hasError) {
                Errmsg = localize("runcode.error", "{0} Error,Can't generate .exe file\nSee Output panel for information", MASMorTASM);
            }
            else {
                Errmsg = "EXE file generate failed";
                if (stdout) {
                    logger({
                        title: "[this should not happen]Can't generate .exe file but no error scaned",
                        content: stdout
                    });
                    console.log(stdout);
                }
            }
            window.showErrorMessage(Errmsg);
        }
        else if (exeGenerated === true && (DOSemu === "msdos player" || DOSemu === "auto")) {
            let goon: boolean = false;
            if (diagCode === 1) {
                let warningmsgwindow = localize("runcode.warn", "{0} Warning,successfully generate .exe file,but assembler has some warning message", MASMorTASM);
                let Go_on = localize("runcode.continue", "continue");
                let Stop = localize("runcode.stop", "stop");
                window.showInformationMessage(warningmsgwindow, Go_on, Stop).then(result => {
                    if (result === Go_on) { goon = true; }
                });
            }
            else {
                goon = true;
            }
            if (goon) {
                let viaPlayer: boolean = DOSemu === "msdos player";
                //use msdos for debug.exe when debugging code via MASM
                if (MASMorTASM === "MASM" && runOrDebug === false && DOSemu === "auto") { viaPlayer = true; }
                //use dosbox for TD.exe when debugging code with TASM
                if (MASMorTASM === "TASM" && runOrDebug === false && DOSemu === "msdos player") { viaPlayer = false; }
                if (viaPlayer) {
                    MSDos.outTerminal(this._config, runOrDebug);
                }
                else {
                    if (runOrDebug) {
                        await this.dosbox.runDosbox(['T.EXE', ...this._config.boxruncmd]);
                    }
                    else {
                        let debug: string[] = [];
                        if (MASMorTASM === 'TASM') {
                            debug.push('if exist c:\\tasm\\TDC2.TD copy c:\\tasm\\TDC2.TD TDCONFIG.TD', 'TD T.EXE');
                        }
                        else {
                            debug.push('DEBUG T.EXE');
                        }
                        await this.dosbox.runDosbox(debug);
                    }
                }
            }
        }
        return {
            ASMmsg: stdout,
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


const delList = [
    "t.exe",
    "t.map",
    "T.obj",
    "T.TXT",
    "T.TR",
    "TDCONFIG.TD"
];


async function CleanCopy(file: Uri, dir: Uri) {
    let fs = workspace.fs;
    let dirInfo = await fs.readDirectory(dir);
    //delete files to avoid this files confusing the codes
    delList.forEach(
        async (value) => {
            if (inArrays(dirInfo, [value, FileType.File])) {
                await fs.delete(Uri.joinPath(dir, value), { recursive: false, useTrash: false });
            }
        }
    );
    await fs.copy(file, Uri.joinPath(dir, "./T.ASM"), { overwrite: true });
}