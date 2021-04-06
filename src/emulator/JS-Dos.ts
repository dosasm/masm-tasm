import * as vscode from 'vscode';
import { Uri, window } from 'vscode';
import { ASMTYPE, Config, settingsStrReplacer, SRCFILE } from '../ASM/configration';
import { ASMCMD, ASMPREPARATION, EMURUN, MSGProcessor } from '../ASM/runcode';
import { compressAsmTools, compressDir } from './js-dos_zip';
import { JsdosPanel, LaunchOption } from './js-dos_Panel';

const fs = vscode.workspace.fs;

interface JsdosAsmConfig {
    "open": string[]; "masm": string[]; "tasm": string[];
    "run": string[]; "masm_debug": string[]; "tasm_debug": string[];
}

export class JSdosVSCodeConfig {
    private static get _target(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('masmtasm.jsdos');
    };
    public static get viewColumn(): vscode.ViewColumn {
        return JSdosVSCodeConfig._target.get("viewColumn") as vscode.ViewColumn;
    }
    public get wdosbox(): string {
        return JSdosVSCodeConfig._target.get("wdosbox") as string;
    }
    getAction(scope: keyof JsdosAsmConfig): string[] {
        const id = 'masmtasm.jsdos.more';
        const a = JSdosVSCodeConfig._target.get('more') as JsdosAsmConfig;
        if (a === null || a === undefined) {
            window.showErrorMessage(`${a} is not allowed in ${id}`);
        } else {
            let output = a[scope];
            if (Array.isArray(output)) {
                if (this.replacer) {
                    output = output.map(this.replacer);
                }
                return output;
            } else {
                window.showErrorMessage(`action ${scope} is undefined or not a array in ${id}`);
            }
        }
        throw new Error(`no ${scope} in ${id}:${JSON.stringify(a)}`);
    }
    replacer?: ((str: string) => string) | undefined;
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

export class JSDos implements EMURUN {
    private jsdosFolder: Uri;
    private _conf: Config;
    private _VscConf: JSdosVSCodeConfig;
    private _wsrc?: SRCFILE;
    private _launch: LaunchOption = { extracts: [], writes: [], options: [], shellcmds: [] };
    private _resourcesUri: Uri;
    forceCopy?: boolean;

    constructor(conf: Config) {
        this._conf = conf;
        this._VscConf = new JSdosVSCodeConfig();
        this.jsdosFolder = conf.Uris.jsdos;
        this._resourcesUri = Uri.joinPath(conf.Uris.globalStorage, 'jsdos');
    }

    private async copyDir(folder: Uri): Promise<void> {
        const entries = await fs.readDirectory(folder);
        for (const e of entries) {
            if (e[1] === vscode.FileType.File) {
                const file = Uri.joinPath(folder, e[0]);
                //TODO: find out files are binary file or text
                if (['.asm', '.ASM', '.inc', '.INC'].some(val => e[0].includes(val))) {
                    const doc = await fs.readFile(file);
                    const body = doc.toString().split('\n').map(val => val.replace(/^\s*;.*/, "")).join('\n');
                    this._launch.writes.push({ path: `/code/${e[0]}`, body });
                }
                else {
                    const body = await fs.readFile(file);
                    this._launch.writes.push({ path: `/code/${e[0]}`, body });
                }
            }
            else if (e[1] === vscode.FileType.Directory && e[0].match(/[\w\.]+/)) {
                const dstFile = Uri.joinPath(this._resourcesUri, `/codes/${e[0]}.zip`);
                const srcFolder = Uri.joinPath(folder, e[0]);
                compressDir(srcFolder, dstFile);
                this._launch.extracts.push([dstFile, `/code/${e[0]}`]);
            }
        }
        return;
    }

    async prepare(opt: ASMPREPARATION): Promise<boolean> {
        this.forceCopy = !opt.src.dosboxFsReadable && opt.act !== ASMCMD.OpenEmu;
        await fs.createDirectory(this._resourcesUri);
        await fs.createDirectory(Uri.joinPath(this._resourcesUri, 'codes'));
        JsdosPanel.createOrShow(this.jsdosFolder, this._resourcesUri);
        if (this._VscConf.wdosbox) {
            let uri: Uri;
            if (this._VscConf.wdosbox.includes('https')) {
                uri = Uri.parse(this._VscConf.wdosbox.trim());
            } else {
                uri = Uri.joinPath(Uri.parse('https://js-dos.com/6.22/current/'), this._VscConf.wdosbox.trim());
            }
            this._launch.wdosboxUrl = uri;
        }

        if (opt) {
            this._VscConf.replacer = (val: string): string => settingsStrReplacer(val, this._conf, this._wsrc);
        }

        this._launch.shellcmds.push(...this._VscConf.getAction('open'));
        await compressAsmTools(this._conf.Uris.tools, this._resourcesUri);
        this._launch.extracts.push(
            [Uri.joinPath(this._resourcesUri, 'tasm.zip'), '/ASM/TASM'],
            [Uri.joinPath(this._resourcesUri, 'masm.zip'), '/ASM/MASM']
        );
        return true;
    }
    async openEmu(folder: vscode.Uri): Promise<void> {
        if (JsdosPanel.currentPanel) {
            await this.copyDir(folder);
            await JsdosPanel.currentPanel.launchJsdos(this._launch);
        }
    }
    Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<unknown> {
        return this.runDebug(true, src, msgprocessor);
    }
    Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<unknown> {
        return this.runDebug(false, src, msgprocessor);
    }
    public async runDebug(runOrDebug: boolean, src: SRCFILE, msgprocessor: MSGProcessor): Promise<unknown> {
        if (JsdosPanel.currentPanel) {
            const v = Uri.joinPath(Uri.file('/code/'), `${src.filename}.${src.extname}`);
            this._wsrc = new SRCFILE(v);
            await this.copyDir(src.folder);

            const cmds = this._VscConf.AsmLinkRunDebugCmd(runOrDebug, this._conf.MASMorTASM);
            this._launch.shellcmds.push(...cmds);

            await JsdosPanel.currentPanel.launchJsdos(this._launch);
            console.log(this._launch.writes);
            const msg = await JsdosPanel.currentPanel.getStdout();
            //console.log(this._launch);

            await msgprocessor(msg, { preventWarn: true });
            return [this._launch.writes.map(val => val.path), JsdosPanel.currentPanel?.allWdosboxStdout, this._wsrc];
        }
        throw new Error(`no currentPanel`);//[ ,JsdosPanel.currentPanel?.jsdosStatus, JsdosPanel.currentPanel?.allWdosboxStdout, this._wsrc];
    }
}


