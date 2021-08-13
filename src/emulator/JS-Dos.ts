import * as vscode from 'vscode';
import { Uri, window } from 'vscode';
import { ASMTYPE, Config, settingsStrReplacer, SRCFILE } from '../ASM/configration';
import { ASMCMD, ASMPREPARATION, EMURUN, MSGProcessor } from '../ASM/runcode';
import { JsdosPanel } from './js-dos_Panel';
import { createBundle } from './bundle';

interface JsdosAsmConfig {
    "open": string[]; "masm": string[]; "tasm": string[];
    "run": string[]; "masm_debug": string[]; "tasm_debug": string[];
}

export class JSdosVSCodeConfig {
    private static get _target(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('masmtasm.jsdos');
    };
    public static get viewColumn(): vscode.ViewColumn {
        switch (JSdosVSCodeConfig._target.get("viewColumn")) {
            case 'Beside':
                return vscode.ViewColumn.Beside;
            case 'Active':
                return vscode.ViewColumn.Active;

        }
        return vscode.ViewColumn.Beside;
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
    private _conf: Config;
    private _VscConf: JSdosVSCodeConfig;
    forceCopy?: boolean;

    constructor(conf: Config) {
        this._conf = conf;
        this._VscConf = new JSdosVSCodeConfig();
    }

    private async genBundle(folder: Uri, autoexec: string[]): Promise<void> {
        autoexec.unshift(
            'mount y ./',
            'y:',
            'mount c ./asm',
            'mount d ./codes',
            'set path=c:\;%PATH%',
            "d:"
        );
        await createBundle(this._conf.asAbsolutePath('web/res/test.jsdos'),
            '[AUTOEXEC]\r\n' + autoexec.join('\r\n'),
            [
                {
                    from: folder.fsPath,
                    to: 'codes'
                },
                {
                    from: this._conf.asAbsolutePath('tools/' + this._conf.MASMorTASM.toLowerCase()),
                    to: "asm"
                }
            ]);
        return;
    }

    async prepare(opt: ASMPREPARATION): Promise<boolean> {
        this.forceCopy = !opt.src.dosboxFsReadable && opt.act !== ASMCMD.OpenEmu;
        return true;
    }

    async openEmu(folder: vscode.Uri): Promise<void> {
        await this.genBundle(folder, []);
        JsdosPanel.createOrShow(this._conf);
    }

    Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<unknown> {
        return this.runDebug(true, src, msgprocessor);
    }
    Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<unknown> {
        return this.runDebug(false, src, msgprocessor);
    }
    public async runDebug(runOrDebug: boolean, src: SRCFILE, msgprocessor: MSGProcessor): Promise<string> {
        const v = Uri.joinPath(Uri.file('/codes/'), `${src.filename}.${src.extname}`);
        const wsrc = new SRCFILE(v);
        this._VscConf.replacer = (val: string): string => settingsStrReplacer(val, this._conf, wsrc);
        const cmds = this._VscConf.AsmLinkRunDebugCmd(runOrDebug, this._conf.MASMorTASM);
        await this.genBundle(src.folder, cmds);
        JsdosPanel.createOrShow(this._conf);
        const p = new Promise<string>(
            (resolve, reject) => {
                if (JsdosPanel.currentPanel?.onWdosboxStdout) {
                    JsdosPanel.currentPanel.onWdosboxStdout =
                        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
                        (_, all) => {
                            const re = all.join('').match(/D:([\s\S]*Assembling[\s\S]*?)D:/);
                            if (re && re[1]) {
                                resolve(re[1]);
                                if (JsdosPanel.currentPanel?.onWdosboxStdout) {
                                    JsdosPanel.currentPanel.onWdosboxStdout = (): undefined => undefined;
                                }
                            }
                        };
                }
                setTimeout(reject, 10000);
            }
        );
        const msg = await p;
        await msgprocessor(msg);
        return msg;
    }
}