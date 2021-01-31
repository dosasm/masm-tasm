import { exec } from 'child_process';
import { Terminal, Uri, window, workspace, WorkspaceConfiguration } from 'vscode';
import { ASMTYPE, Config, DOSEMU, settingsStrReplacer, SRCFILE } from '../configration';
import { ASMCMD, ASMPREPARATION, EMURUN, MSGProcessor } from '../runcode';

/**the config from VSCode settings `masmtasm.msdos`*/
class MsdosVSCodeConfig {
    private get _target(): WorkspaceConfiguration {
        return workspace.getConfiguration('masmtasm.msdos');
    };
    getAction(scope: MsdosActionKey): string {
        const a = this._target.get('more') as { [id: string]: string };
        const key = scope.toLowerCase();
        let output = a[key];
        if (typeof (output) === 'string') {
            if (this.replacer) {
                output = this.replacer(output);
            }
            return output;
        }
        window.showErrorMessage(`action ${key} hasn't been defined`);
        throw new Error(`action ${key} hasn't been defined`);
    }
    replacer: ((str: string) => string) | undefined = undefined;
}

interface MsdosAction {
    workspace: string;
    path: string;
    masm: string;
    tasm: string;
    masm_debug: string;
    run: string;
}

type MsdosActionKey = keyof MsdosAction;

export class MsdosPlayer implements EMURUN {
    copyUri?: Uri;
    forceCopy?: boolean;
    private _conf: Config;
    private _vscConf: MsdosVSCodeConfig;
    static msdosTerminal: Terminal | undefined = undefined;
    constructor(conf: Config) {
        this._conf = conf;
        this._vscConf = new MsdosVSCodeConfig();
        const ws = this._vscConf.getAction('workspace');
        this.copyUri = ws ? Uri.file(ws) : undefined;
    }

    prepare(opt?: ASMPREPARATION): boolean {
        if (opt) {
            if (this._conf.MASMorTASM === ASMTYPE.TASM && opt.act === ASMCMD.debug && this._conf.DOSemu === DOSEMU.msdos) {
                const msg = `disabled for tasm's TD is hardly runable in msdos`;
                window.showErrorMessage(msg);
                return false;
            }
            this.forceCopy = opt.src.filename.includes(' ');
        }
        this._vscConf.replacer = (
            (val: string): string => settingsStrReplacer(val, this._conf, opt ? opt.src : undefined)
        );
        return true;
    }
    openEmu(folder: Uri, command?: string): boolean {
        const re = folder.fsPath.match(/([a-zA-Z]):/);
        const disk = re ? `${re[1]}:` : ``;
        const cmd = [
            `${disk}`,
            `cd ${folder.fsPath}`,
        ];
        if (command) {
            cmd.push(command);
        }
        this.outTerminal(cmd.join(' & '));
        return true;
    }
    async Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<boolean> {
        const msg = await this.runPlayer(this._conf).catch((e) => { throw new Error(e); });
        if (await msgprocessor(msg)) {
            this.openEmu(src.folder, `${this._vscConf.getAction('run')}`);
            return true;//'command sended to terminal'
        }
        return false;
    }
    async Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<boolean> {
        const msg = await this.runPlayer(this._conf);
        if (await msgprocessor(msg)) {
            const act = this._vscConf.getAction('masm_debug');
            this.openEmu(src.folder, `${act}`);
            return true;
        }
        return false;
    }

    private outTerminal(command?: string): void {
        const env: NodeJS.ProcessEnv = process.env;
        const envPath = env.PATH + ';' + this._vscConf.getAction('path');
        if (MsdosPlayer.msdosTerminal?.exitStatus || MsdosPlayer.msdosTerminal === undefined) {
            MsdosPlayer.msdosTerminal = window.createTerminal({
                env: { PATH: envPath },
                shellPath: "cmd.exe",
                hideFromUser: false,
            });
        }
        if (MsdosPlayer.msdosTerminal) {
            MsdosPlayer.msdosTerminal.show(true);
            if (command) {
                MsdosPlayer.msdosTerminal.sendText(command);
            }
        }
    }
    public runPlayer(conf: Config): Promise<string> {
        const command = this._vscConf.getAction(conf.MASMorTASM.toLowerCase() as 'masm' | 'tasm');
        return new Promise<string>(
            (resolve, reject) => {
                const timeout = 3000;
                const child = exec(
                    command,
                    {
                        cwd: conf.Uris.tools.fsPath, timeout
                    },
                    (error, stdout, stderr) => {
                        if (stderr) {
                            console.warn({ stderr, stdout, command });
                        }
                        if (error) {
                            reject(error);
                        }
                        else if (stdout.length > 0) {
                            resolve(stdout);
                        }
                    }
                );
                child.on('exit', (code) => {
                    if (code === null) {
                        child.kill();
                        window.showErrorMessage(`Run playerasm.bat timeout after ${timeout}ms\t\nCommand: ${command}`);
                    }
                    else if (code !== 0) {
                        const msg = `Use playerasm.bat Failed\t exitcode${code}\t\n  command:${command}`;
                        window.showErrorMessage(msg);
                    }
                });
            }
        );
    }
    static dispose(): void {
        MsdosPlayer.msdosTerminal?.dispose();
    }
}