import { Disposable, ExtensionContext, FileType, languages, OutputChannel, TextDocument, Uri, window, workspace, } from 'vscode';
import { Config } from './configration';
import { inArrays } from "./util";
import { AsmDOSBox } from './DOSBox';
import * as MSDos from './viaPlayer';
import * as nls from 'vscode-nls';
import { AssemblerDiag, DIAGCODE } from './diagnose';
nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();
export class AsmAction implements Disposable {
    private readonly extOutChannel: OutputChannel;
    private extUri: Uri;
    private _config: Config;
    private dosbox: AsmDOSBox;
    private landiag: AssemblerDiag;
    constructor(context: ExtensionContext) {
        this.extUri = context.extensionUri
        this.extOutChannel = window.createOutputChannel('Masm-Tasm');
        this._config = new Config(context.extensionUri, this.extOutChannel);
        this.landiag = new AssemblerDiag();
        this.dosbox = new AsmDOSBox(this._config);
        this.update();
    }

    private update() {
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('masmtasm')) {
                this._config = new Config(this.extUri, this.extOutChannel);
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
        let openemumsg = localize("openemu.msg", "\nMASM/TASM>>Openthis.dosbox:{0}", doc.fileName);
        this.extOutChannel.appendLine(openemumsg);
        CleanCopy(doc.uri, this._config.workUri);
        if (this._config.DOSemu === 'msdos player') {
            MSDos.outTerminal(this._config);
        }
        else {
            this.dosbox.runDosbox();
        }
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
        if (runOrDebug) { msg = localize("run.msg", "\n{0}({1})>>Run:{2}", this._config.MASMorTASM, this._config.DOSemu, doc.fileName); }
        else { msg = localize("debug.msg", "\n{0}({1})>>Debug:{2}", this._config.MASMorTASM, this._config.DOSemu, doc.fileName); }
        this.extOutChannel.appendLine(msg);
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
                if (diagCode === DIAGCODE.hasError) { this.extOutChannel.show(true); }
                let collectmessage: string = localize("diag.msg", "{0} Error,{1}  Warning, collected. The following is the output of assembler and linker'", diag.error.toString(), diag.warn);
                this.extOutChannel.appendLine(collectmessage);
                let stdout_output = stdout.replace(/\r\n\r\n/g, '\r\n').replace(/\n\n/g, '\n').replace(/\n/g, '\n  ');
                this.extOutChannel.append(stdout_output);
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
                    stdout = stdout.replace(/\r\n\r\n/g, "\n");
                    this.extOutChannel.append('\n===error message===\n' + stdout + '\n======\n');
                    this.extOutChannel.show();
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
        this.extOutChannel.dispose();
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