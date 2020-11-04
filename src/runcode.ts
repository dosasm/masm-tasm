import { ExtensionContext, FileType, OutputChannel, TextDocument, Uri, window, workspace, } from 'vscode';
import { Config, inArrays } from './configration';
import * as DOSBox from './DOSBox';
import * as MSDos from './viaPlayer';
import * as nls from 'vscode-nls';
nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

import { AssemblerDiag } from './language/diagnose';
export class AsmAction {
    private readonly extOutChannel: OutputChannel;
    private _config: Config;
    private landiag: AssemblerDiag;
    constructor(context: ExtensionContext) {
        this.extOutChannel = window.createOutputChannel('Masm-Tasm');
        this._config = new Config(context);
        this.landiag = new AssemblerDiag(this.extOutChannel);
        workspace.onDidChangeConfiguration(() => { this._config = new Config(context); }, this._config);
    }
    /**
     * open the emulator(currently just the DOSBox)
     * @param doc The vscode document to be copied to the workspace
     */
    private Openemu(doc: TextDocument) {
        let openemumsg = localize("openemu.msg", "\nMASM/TASM>>Open DOSBox:{0}", doc.fileName);
        this.extOutChannel.appendLine(openemumsg);
        CleanCopy(doc.uri, this._config.workUri);
        DOSBox.runDosbox(this._config);
    }
    public async RunDebug(doc: TextDocument, runOrDebug: boolean) {
        await CleanCopy(doc.uri, this._config.workUri);
        let msg: string, DOSemu: string = this._config.DOSemu, MASMorTASM = this._config.MASMorTASM;
        let stdout: string | undefined = undefined;
        if (runOrDebug) { msg = localize("run.msg", "\n{0}({1})>>Run:{2}", this._config.MASMorTASM, this._config.DOSemu, doc.fileName); }
        else { msg = localize("debug.msg", "\n{0}({1})>>Debug:{2}", this._config.MASMorTASM, this._config.DOSemu, doc.fileName); }
        this.extOutChannel.appendLine(msg);
        if (DOSemu === "dosbox") {
            stdout = await DOSBox.runDosbox2(this._config, runOrDebug);
        }
        else if (DOSemu === "auto" || DOSemu === "msdos player") {
            stdout = await MSDos.runPlayer(this._config, doc.fileName);
        }
        //process the error information from assembler
        if (stdout) {
            let code = this.landiag.ErrMsgProcess(doc.getText(), stdout, doc.uri, MASMorTASM);
            let goon: boolean = false;
            switch (code) {
                case 0:
                    let Errmsgwindow = localize("runcode.error", "{0} Error,Can't generate .exe file\nSee Output panel for information", MASMorTASM);
                    window.showErrorMessage(Errmsgwindow);
                    break;
                case 1:
                    let warningmsgwindow = localize("runcode.warn", "{0} Warning,successfully generate .exe file,but assembler has some warning message", MASMorTASM);
                    let Go_on = localize("runcode.continue", "continue");
                    let Stop = localize("runcode.stop", "stop");
                    window.showInformationMessage(warningmsgwindow, Go_on, Stop).then(result => {
                        if (result === Go_on) { goon = true; }
                    });
                    break;
                case 2:
                    goon = true;
                    break;
            }
            if (goon && (DOSemu === "msdos player" || DOSemu === "auto")) {
                let flag: boolean = DOSemu === "msdos player";
                //msdos mode:  TASM debug command `TD` can only run in dosbox;(I do this inside `MSDos.RunDebug`)
                //auto mode: run in dosbox,`TD` in dosbox,MASM debug command `debuq` in player
                flag = (MASMorTASM === "MASM" && runOrDebug === false && DOSemu === "auto") || flag;
                MSDos.RunDebug(this._config, flag, runOrDebug);
            };
        }
    }
    public cleanalldiagnose() {
        this.landiag.cleandiagnose('both');
    }
    public deactivate() {
        this.extOutChannel.dispose();
        MSDos.deactivate();
    }
    /**Do the operation according to the input.
     * "opendosbox": open DOSBOX at a separated space;
     * "here": open dosbox at the vscode editor file's folder;
     * "run": compile and run the ASM code ;
     * "debug": compile and debug the ASM code;
     * @param command "opendosbox" or "run" or "debug" or "here"
     */
    public runcode(command: string) {
        let document = window.activeTextEditor?.document;
        if (document) {
            if (this._config.savefirst && window.activeTextEditor?.document.isDirty) {
                document.save().then(() => { if (document) { this.asmit(command, document); } });
            }
            else { this.asmit(command, document); }
        }
    }

    private asmit(command: string, doc: TextDocument) {
        switch (command) {
            case 'opendosbox': this.Openemu(doc); break;
            case 'run': this.RunDebug(doc, true); break;
            case 'debug': this.RunDebug(doc, false); break;
            case 'here': DOSBox.BoxOpenCurrentFolder(this._config, doc);
        }
    }
}
const delList = [
    "T.exe",
    "T.map",
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
    fs.copy(file, Uri.joinPath(dir, "./T.ASM"), { overwrite: true });
}
const foudFile = (data: [string, FileType][], arr: [string, FileType], _ignoreCases: boolean) => {
    for (let i = 0; i < data.length; i++) {
        if (arr === data[i]) {
            return data[i];
            break;
        }
    }
};