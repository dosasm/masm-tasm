import { exec } from 'child_process';
import { FileType, Uri, window, workspace } from 'vscode';
import { inDirectory } from '../ASM/util';

/**defines the option to do with dosbox's console message **in windows system**.
 * - For **windows**, if in **noconsole** mode,the dosbox will redirect the console message to files in the *dosbox.exe*'s folder.
 * and the extension will put them to VSCode's outputChannel
 * - NOTE: the message is put after DOSBox exit in windows;
 * - For **other OS**, dosbox will put it's console message in shell's stdout and stderr.
 * So the extension will put them to VSCode's outputChannel
 */
export enum WINCONSOLEOPTION {
    /**use the `this._core` directly use `dosbox` directly.
     * For windos, dosbox will create a console window.
     * For other OS, dosbox will output the console message in shell.*/
    normal,
    /**for windows using `start /min dosbox`
     * this will create and minimize the console window*/
    min,
    /**for windows using `dosbox -nocosle`
     * dosbox will redirect the console message to files
     * NOTE: for the extension, it will try to redirect the message to outputchannel*/
    noconsole,
}

export class DOSBox {
    public readonly _core: string;//the core command for run dosbox
    public readonly _cwd?: string;//the cwd for child_process, usually as the folder of dosbox
    protected confFile: Uri | undefined = undefined;
    protected console: WINCONSOLEOPTION;
    public get redirect(): boolean {
        if (process.platform === 'win32') {
            return this.console === WINCONSOLEOPTION.noconsole;
        }
        return true;
    }
    private _stdout = "";
    private _stderr = "";
    private _count = 0;
    constructor(cwd?: string, core?: string, winconsole?: WINCONSOLEOPTION) {
        if (core && core.length > 0) {
            this._core = core;
        }
        else {
            this._core = OpenDosboxCmd(winconsole);
        }
        this._cwd = cwd;
        this.console = winconsole ? winconsole : WINCONSOLEOPTION.noconsole;
    }
    public run(boxcmd: string[], opt?: DOSBoxOption): Promise<DOSBoxStd> {
        const preOpen = opt?.preOpen ? opt?.preOpen : "";
        const param = [];
        if (this.console === WINCONSOLEOPTION.noconsole) {
            param.push('-noconsole');
        }
        if ((typeof opt?.confFile) === 'string') {
            param.push(`-conf "${opt?.confFile}"`);
        }
        else if (opt?.confFile === undefined) {
            param.push(`-conf "${this.confFile?.fsPath}"`);
        }
        if (opt?.param && opt?.param.length > 0) {
            param.push(...opt.param);
        }
        if (boxcmd.length > 0) {
            const mapper = (val: string): string => `-c "${val}"`;
            param.push(...boxcmd.map(mapper));
        }
        return this.runViaChildProcess(preOpen + this._core + ' ' + param.join(" "));
    }
    public stdoutHander: (message: string, text: string, No: number) => void = (message: string) => {
        console.log('stdout message', message);
    };
    public stderrHander: (message: string, text: string, No: number) => void = (message: string) => {
        console.log('stderr message', message);
    };
    private runViaChildProcess(command: string, ignoreWinStd?: boolean): Promise<DOSBoxStd> {
        //console.log(command);
        this._count++;
        const output: DOSBoxStd = {
            flag: BoxStdNOTE.normal,
            stdout: "",
            stderr: '',
            exitcode: undefined
        };
        return new Promise(
            (resolve, reject) => {
                const child = exec(
                    command,
                    {
                        cwd: this._cwd,
                    },
                    (error, stdout, stderr): void => {
                        if (error) {
                            reject(error);
                        }
                        else if (process.platform === 'win32' && this.redirect && this._cwd && ignoreWinStd !== true) {
                            winReadConsole(this._cwd).then(
                                (value) => {
                                    if (value) {
                                        output.stderr = value.stderr;
                                        output.stdout = value.stdout;
                                        resolve(output);
                                        this.stderrHander(value.stderr, value.stderr, this._count);
                                        this.stdoutHander(value.stdout, value.stdout, this._count);
                                    }
                                });
                        }
                        else {
                            output.stdout = stdout;
                            output.stderr = stderr;
                            if (process.platform === 'win32') {
                                if (this.redirect === false) {
                                    output.flag = BoxStdNOTE.winNonoconsole;
                                }
                                else if (this._cwd === undefined) {
                                    output.flag = BoxStdNOTE.noCwd;
                                }
                                // else if (ignoreWinStd === false) {
                                //     output.flag = BoxStdNOTE.winCancelled;
                                // }
                                else if (ignoreWinStd === true) {
                                    output.flag = BoxStdNOTE.winCancelledByUser;
                                }

                            }
                            resolve(output);
                        }
                    });

                child.on('exit', (code) => {
                    output.exitcode = code;
                    if (code !== 0) {
                        let msg = `Open dosbox Failed with exitcode ${code} `;
                        msg += 'executing shell command:' + command;
                        window.showErrorMessage(msg);
                    }
                });
                if (this.redirect && process.platform !== 'win32') {
                    child.stdout?.on('data', (data) => {
                        this._stdout += data;
                        this.stdoutHander(data, this._stdout, this._count);
                    });
                    child.stderr?.on('data', (data) => {
                        this._stderr += data;
                        this.stderrHander(data, this._stderr, this._count);
                    });
                }
            }
        );
    }
}

enum BoxStdNOTE {
    /**no 'noconsole' parameter
     * The stdout and stderr are the output of shell command and
     * it is not the console info for dosbox */
    winNonoconsole,
    /**Cancelled for win32
     * The stdout and stderr are the output of shell command and
     * it is not the console info for dosbox */
    winCancelled,
    winCancelledByUser,
    /** the stdout and stderr should be right */
    noCwd,
    normal
}

/**read the dosbox's console std information for win32
 * @param folder the folder to store stdout and stderr, usually the folder of dosbox.exe
 */
async function winReadConsole(folder: string): Promise<{ stdout: string; stderr: string }> {
    const cwd = Uri.file(folder);
    const fs = workspace.fs;
    const dirs = await fs.readDirectory(cwd);
    const output = { stdout: "", stderr: "" };
    let file = inDirectory(dirs, ['stderr.txt', FileType.File]);
    if (file) {
        output.stderr = (await fs.readFile(Uri.joinPath(cwd, file[0]))).toString();
    }
    file = inDirectory(dirs, ['stdout.txt', FileType.File]);
    if (file) {
        output.stdout = (await fs.readFile(Uri.joinPath(cwd, file[0]))).toString();
    }
    return output;
}
interface DOSBoxOption {
    /**
     * the command may be need to exec before open dosbox*/
    preOpen?: string;
    confFile?: string;
    param?: string[];
}

export interface DOSBoxStd {
    stdout: string;
    stderr: string;
    flag: BoxStdNOTE;
    exitcode: number | null | undefined;
}


/**default command for open dosbox */
function OpenDosboxCmd(boxconsole?: WINCONSOLEOPTION): string {
    //command for open dosbox
    let command = "dosbox";
    //for windows,using different command according to dosbox's path and the choice of the console window
    switch (process.platform) {
        case 'win32':
            switch (boxconsole) {
                case WINCONSOLEOPTION.min:
                    command = 'start/min/wait "" dosbox'; break;
                case WINCONSOLEOPTION.normal:
                case WINCONSOLEOPTION.noconsole:
                default: command = 'dosbox'; break;
            }
            break;
        case 'darwin':
            command = "open -a DOSBox --args";
            break;
        default:
            command = 'dosbox';
    }
    return command;
}
