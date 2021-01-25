import { workspace, window, Uri, Disposable, Terminal, commands } from 'vscode';
import { ASMTYPE, Config, SRCFILE, str_replacer } from '../configration';
import { ASMCMD, ASMPREPARATION, EMURUN, MSGProcessor } from '../runcode';
import { exec } from 'child_process';

/**the config from VSCode settings `masmtasm.msdos`*/
class MsdosVSCodeConfig {
    private get _target() {
        return workspace.getConfiguration('masmtasm.msdos');
    };
    getAction(scope: MsdosActionKey) {
        let a = this._target.get('AsmConfig') as any;
        let key = scope.toLowerCase();
        let output = a[key];
        if (typeof (output) === 'string') {
            if (this.replacer) {
                output = this.replacer(output)
            }
            return output
        }
        window.showErrorMessage(`action ${key} hasn't been defined`)
        throw new Error(`action ${key} hasn't been defined`)
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

export class MsdosPlayer implements EMURUN, Disposable {
    copyUri?: Uri;
    forceCopy?: boolean;
    private _conf: Config;
    private _vscConf: MsdosVSCodeConfig;
    static msdosTerminal: Terminal | undefined = undefined;
    constructor(conf: Config) {
        this._conf = conf;
        this._vscConf = new MsdosVSCodeConfig();
        let ws = this._vscConf.getAction('workspace');
        this.copyUri = ws ? Uri.file(ws) : undefined;
    }

    prepare(opt: ASMPREPARATION): boolean {
        if (this._conf.MASMorTASM === ASMTYPE.TASM && opt?.act === ASMCMD.debug) {
            let msg = `disabled for tasm's TD is hardly runable in msdos`;
            window.showErrorMessage(msg);
            return false;
        }
        this._vscConf.replacer = (
            (val: string) => str_replacer(val, this._conf, opt.src)
        )
        this.forceCopy = opt.src?.filename.includes(' ');
        return true;
    }
    openEmu(folder: Uri, command?: string): boolean {
        let re = folder.fsPath.match(/([a-zA-Z]):/);
        let disk = re ? `${re[1]}:` : ``;
        let cmd = [
            `${disk}`,
            `cd ${folder.fsPath}`,
        ]
        if (command) {
            cmd.push(command);
        }
        this.outTerminal(cmd.join(' & '))
        return true;
    }
    async Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any> {
        let msg = await this.runPlayer(this._conf);
        if (await msgprocessor(msg)) {
            this.openEmu(src.folder, `${this._vscConf.getAction('run')}`)
            return 'command sended to terminal'
        }
        return;
    }
    async Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any> {
        let msg = await this.runPlayer(this._conf);
        if (await msgprocessor(msg)) {
            let act = this._vscConf.getAction('masm_debug');
            this.openEmu(src.folder, `${act}`)
            return 'command sended to terminal'
        }
        return;
    }

    private outTerminal(command?: string) {
        let env: NodeJS.ProcessEnv = process.env;
        let envPath = env.PATH + ';' + this._vscConf.getAction('path');
        if (MsdosPlayer.msdosTerminal?.exitStatus || MsdosPlayer.msdosTerminal === undefined) {
            MsdosPlayer.msdosTerminal = window.createTerminal({
                env: { PATH: envPath },
                shellPath: "cmd.exe",
                hideFromUser: false,
            });
        }
        if (MsdosPlayer.msdosTerminal) {
            MsdosPlayer.msdosTerminal.show();
            if (command) {
                MsdosPlayer.msdosTerminal.sendText(command);
            }
        }
    }
    public runPlayer(conf: Config): Promise<string> {
        let command = this._vscConf.getAction(conf.MASMorTASM.toLowerCase() as 'masm' | 'tasm');
        return new Promise<string>(
            (resolve, reject) => {
                let timeout: number = 3000;
                let child = exec(
                    command,
                    {
                        cwd: conf.Uris.tools.fsPath, timeout: timeout
                    },
                    (error, stdout, stderr) => {
                        if (error) {
                            (error as any).note = "exec msdos player error";
                            reject(error);
                        }
                        else {
                            resolve(stdout);
                        }
                    }
                );
                child.on('exit', (code) => {
                    if (code === null) {
                        child.kill();
                        window.showErrorMessage(`Run playerasm.bat timeout after ${timeout}ms\t\nCommand: ${command}`);
                        //console.log(child);
                    }
                    else if (code !== 0) {
                        let msg = `Use playerasm.bat Failed\t exitcode${code}\t\n  command:${command}`;
                        window.showErrorMessage(msg);
                    }
                });
            }
        );
    }
    dispose() {
        // MsdosPlayer.msdosTerminal?.dispose();
    }
}