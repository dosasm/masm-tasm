import * as vscode from 'vscode';
import { Config } from './configration';
import * as DOSBox from './DOSBox';
import { MSDOSplayer } from './viaPlayer';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();
import { AssemblerDiag } from './language/diagnose';
export class AsmAction {
    private readonly extOutChannel: vscode.OutputChannel;
    private _config: Config;
    private msdosplayer: MSDOSplayer;
    private landiag: AssemblerDiag;
    constructor(context: vscode.ExtensionContext) {
        this.extOutChannel = vscode.window.createOutputChannel('Masm-Tasm');
        this._config = new Config(context);
        this.msdosplayer = new MSDOSplayer();
        this.landiag = new AssemblerDiag(this.extOutChannel);
        vscode.workspace.onDidChangeConfiguration((event) => { this._config = new Config(context); }, this._config);
    }
    /**
     * open the emulator(currently just the DOSBox)
     * @param doc The vscode document to be copied to the workspace
     */
    private Openemu(doc: vscode.TextDocument) {
        let openemumsg = localize("openemu.msg", "\nMASM/TASM>>Open DOSBox:{0}", doc.fileName);
        this.extOutChannel.appendLine(openemumsg);
        DOSBox.runDosbox(this._config, undefined, doc);
    }
    /**
     * run the ASM code
     * @param doc The vscode document to be compiled to run
     */
    private Run(doc: vscode.TextDocument) {
        let runmsg = localize("run.msg", "\n{0}({1})>>Run:{2}", this._config.MASMorTASM, this._config.DOSemu, doc.fileName);
        this.extOutChannel.appendLine(runmsg);
        switch (this._config.DOSemu) {
            case 'msdos player': this.msdosplayer.PlayerASM(this._config, true, true, this.landiag, doc); break;
            case 'dosbox':
                DOSBox.runDosbox2(this._config, true, doc, this.landiag);
                break;
            case 'auto': this.msdosplayer.PlayerASM(this._config, true, false, this.landiag, doc); break;
            default: throw new Error("未指定emulator");
        }
    }
    /**
     * debug the ASM code
     * @param doc The vscode document to be compiled and debug
     */
    private Debug(doc: vscode.TextDocument) {
        let debugmsg = localize("debug.msg", "\n{0}({1})>>Debug:{2}", this._config.MASMorTASM, this._config.DOSemu, doc.fileName);
        this.extOutChannel.appendLine(debugmsg);
        if (this._config.DOSemu === 'msdos player' && this._config.MASMorTASM === 'MASM') {
            this.msdosplayer.PlayerASM(this._config, false, true, this.landiag, doc);
        }
        else if (this._config.DOSemu === 'auto') {
            let inplayer: boolean = false;
            if (this._config.MASMorTASM === 'MASM') { inplayer = true; }
            this.msdosplayer.PlayerASM(this._config, false, inplayer, this.landiag, doc);
        }
        else {
            DOSBox.runDosbox2(this._config, false, doc, this.landiag);
        }
    }
    public cleanalldiagnose() {
        this.landiag.cleandiagnose('both');
    }
    public deactivate() {
        this.extOutChannel.dispose();
        this.msdosplayer.deactivate();
    }
    /**Do the operation according to the input.
     * "opendosbox": open DOSBOX at a separated space;
     * "here": open dosbox at the vscode editor file's folder;
     * "run": compile and run the ASM code ;
     * "debug": compile and debug the ASM code;
     * @param command "opendosbox" or "run" or "debug" or "here"
     */
    public runcode(command: string) {
        let document = vscode.window.activeTextEditor?.document;
        if (document) {
            if (this._config.savefirst && vscode.window.activeTextEditor?.document.isDirty) {
                document.save().then(() => { if (document) { this.asmit(command, document); } });
            }
            else { this.asmit(command, document); }
        }
    }

    private asmit(command: string, doc: vscode.TextDocument) {
        switch (command) {
            case 'opendosbox': this.Openemu(doc); break;
            case 'run': this.Run(doc); break;
            case 'debug': this.Debug(doc); break;
            case 'here': DOSBox.BoxOpenCurrentFolder(this._config, doc);
        }
    }
}