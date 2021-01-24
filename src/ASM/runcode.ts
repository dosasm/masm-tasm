import { Disposable, ExtensionContext, TextDocument, Uri, window, workspace } from 'vscode';
import * as nls from 'vscode-nls';
import { Config, DOSEMU, SRCFILE } from './configration';
import { AssemblerDiag, DIAGCODE } from './diagnose/diagnose';
import { AutoMode } from './emulator/auto-mode';
import { DOSBox } from './emulator/dosbox';
import { MsdosPlayer } from './emulator/msdos-player';
import { OutChannel } from './outputChannel';

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

/**interface for emulator */
export interface EMURUN {
    /**some process needed to do before action*/
    prepare(conf: Config): Promise<boolean> | boolean;
    /**open dosbox need*/
    openEmu(folder: Uri): Promise<any> | any;
    /**run code*/
    Run(src: SRCFILE, msgprocessor: (ASM: string, link?: string) => boolean): Promise<any>;
    /**debug code*/
    Debug(src: SRCFILE, msgprocessor: (ASM: string, link?: string) => boolean): Promise<any>;
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
    private _emulator: EMURUN;
    private landiag: AssemblerDiag;
    constructor(context: ExtensionContext) {
        this.ctx = context;
        this._config = new Config(context);
        this.landiag = new AssemblerDiag();
        this._emulator = AsmAction.getEmulator(this.emulator, this._config);
        this.update();
    }

    static getEmulator(emu: DOSEMU, conf: Config) {
        switch (emu) {
            case DOSEMU.dosbox:
                return new DOSBox(conf);
            case DOSEMU.auto:
                return new AutoMode();
            case DOSEMU.msdos:
                return new MsdosPlayer();
            default:
                window.showWarningMessage('use dosbox as emulator')
                return new DOSBox(conf);
        }
    }

    private update() {
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('masmtasm')) {
                this._config = new Config(this.ctx);
            }
        });
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
        let emu = this._emulator;
        if (emulator) {
            emu = AsmAction.getEmulator(emulator, this._config)
        }
        //open the emulator
        if (folder && await emu.prepare(this._config)) {
            let output = await emu.openEmu(folder);
            return output;
        }
        else {
            window.showWarningMessage('no folder to open \nThe extension use the activeEditor file\'s folder or workspace folder');
        }
    }

    /**Do the operation according to the input.*/
    public async runcode(command: ASMCMD, uri?: Uri) {
        //get the target file
        let src: SRCFILE | undefined, output: any, doc: TextDocument | undefined;
        if (uri) {
            src = new SRCFILE(uri);
        }
        else if (window.activeTextEditor?.document) {
            src = new SRCFILE(window.activeTextEditor.document.uri)
        }
        //construct the source code file class
        if (src && await this._emulator.prepare(this._config)) {
            if (this._config.Seperate) {
                await src.copyto(this._config.Uris.workspace);
            }
            if (this._config.Clean) {
                await src.cleanDir();
            }
            let doc = await workspace.openTextDocument(src.uri);
            const msgProcessor = (ASM: string) => {
                let daig = this.landiag.ErrMsgProcess(ASM, doc, this.ASM);
                return daig?.flag === DIAGCODE.ok
            }
            switch (command) {
                case ASMCMD.OpenEmu:
                    this._emulator.openEmu(src.folder);
                    break;
                case ASMCMD.run:
                    output = await this._emulator.Run(src, msgProcessor);
                    break;
                case ASMCMD.debug:
                    output = await this._emulator.Debug(src, msgProcessor);
                    break;
            };
        }
        else {
            window.showErrorMessage('no source file specified');
        }
        return output;
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


