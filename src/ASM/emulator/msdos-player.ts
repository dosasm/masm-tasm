import { workspace, window, Uri, Disposable, Terminal, commands } from 'vscode';
import { ASMTYPE, Config, SRCFILE, str_replacer } from '../configration';
import { ASMCMD, EMURUN } from '../runcode';
import { exec } from 'child_process';

class MsdosVSCodeConfig {
    private get _target() {
        return workspace.getConfiguration('masmtasm.msdos');
    };
    getAction(scope: string) {
        let a = this._target.get('AsmConfig') as any;
        let output = a[scope];
        if (typeof (output) === 'string') {
            if (this.replacer) {
                output = this.replacer(output)
            }
            return output
        }
        window.showErrorMessage(`action ${scope} hasn't been defined`)
        throw new Error(`action ${scope} hasn't been defined`)
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

export class MsdosPlayer implements EMURUN, Disposable {
    copyUri?: Uri;
    private _conf: Config;
    private _vscConf: MsdosVSCodeConfig;
    private msdosTerminal: Terminal | undefined = undefined;
    constructor(conf: Config) {
        this._conf = conf;
        this._vscConf = new MsdosVSCodeConfig();
    }

    prepare(conf: Config, opt: { act: ASMCMD, src: SRCFILE }): boolean {
        if (conf.MASMorTASM === ASMTYPE.TASM && opt?.act === ASMCMD.debug) {
            let msg = `disabled for tasm's TD is hardly runable in msdos`;
            window.showErrorMessage(msg);
            return false;
        }
        this._conf = conf;
        this._vscConf.replacer = (
            (val: string) => str_replacer(val, conf, opt.src)
        )
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
    async Run(src: SRCFILE, msgprocessor: (ASM: string, link?: string) => boolean): Promise<any> {
        let msg = await this.runPlayer(src, this._conf);
        if (msgprocessor(msg)) {
            this.openEmu(src.folder, `${this._vscConf.getAction('run')}`)
            return 'command sended to terminal'
        }
        return;
    }
    async Debug(src: SRCFILE, msgprocessor: (ASM: string, link?: string) => boolean): Promise<any> {
        let msg = await this.runPlayer(src, this._conf);
        if (msgprocessor(msg)) {
            this.openEmu(src.folder, `${this._vscConf.getAction(this._conf.MASMorTASM + '_debug')}`)
            return 'command sended to terminal'
        }
        return;
    }

    private outTerminal(command?: string) {
        let env: NodeJS.ProcessEnv = process.env;
        let envPath = env.PATH + ';' + this._vscConf.getAction('path');
        if (this.msdosTerminal?.exitStatus || this.msdosTerminal === undefined) {
            this.msdosTerminal = window.createTerminal({
                env: { PATH: envPath },
                shellPath: "cmd.exe",
                hideFromUser: false,
            });
        }
        if (this.msdosTerminal) {
            this.msdosTerminal.show();
            if (command) {
                this.msdosTerminal.sendText(command);
            }
        }
    }
    private runPlayer(src: SRCFILE, conf: Config): Promise<string> {
        let replacer = (val: string) => str_replacer(val, this._conf, src);
        let command = this._vscConf.getAction(conf.MASMorTASM);
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
        this.msdosTerminal?.dispose();
    }
}