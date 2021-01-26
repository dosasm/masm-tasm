import { exec, ExecOptions } from 'child_process';
import { window, WorkspaceConfiguration, workspace, Uri, FileType } from 'vscode';
import { inArrays } from '../util';

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
    protected console: WINCONSOLEOPTION = WINCONSOLEOPTION.noconsole;
    public get redirect() {
        if (process.platform === 'win32') {
            return this.console === WINCONSOLEOPTION.noconsole;
        }
        return true;
    }
    private _stdout: string = "";
    private _stderr: string = "";
    private _count: number = 0;
    constructor(cwd?: string, core: string = 'dosbox') {
        if (core) {
            this._core = core;
        }
        else {
            this._core = OpenDosboxCmd(this.console);
        }
        this._cwd = cwd;
    }
    public run(boxcmd: string[], opt?: DOSBoxOption) {
        let preOpen = opt?.preOpen ? opt?.preOpen : "";
        let param = [];
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
            let mapper = (val: string) => `-c "${val}"`;
            param.push(...boxcmd.map(mapper));
        }
        return this.cp_run(preOpen + this._core + ' ' + param.join(" "));
    }
    public stdoutHander: (message: string, text: string, No: number) => void = (message: string) => {
        console.log('stdout message', message);
    };
    public stderrHander: (message: string, text: string, No: number) => void = (message: string) => {
        console.log('stderr message', message);
    };
    private cp_run(command: string, ignoreWinStd?: boolean): Promise<DOSBoxStd> {
        //console.log(command);
        this._count++;
        let execOption: ExecOptions = { cwd: this._cwd };
        let output: DOSBoxStd = {
            flag: BoxStdNOTE.normal,
            stdout: "",
            stderr: '',
            exitcode: undefined
        };
        return new Promise(
            (resolve, reject) => {
                const callback = (error: any, stdout: string, stderr: string) => {
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
                };

                let child = exec(command, execOption, callback);

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

async function winReadConsole(folder: string) {
    let cwd = Uri.file(folder);
    let fs = workspace.fs;
    if (process.platform === 'win32') {
        let dirs = await fs.readDirectory(cwd);
        let output = { stdout: "", stderr: "" };

        if (inArrays(dirs, ['stderr.txt', FileType.File])) {
            output.stderr = (await fs.readFile(Uri.joinPath(cwd, 'stderr.txt'))).toString();
        }
        if (inArrays(dirs, ['stdout.txt', FileType.File])) {
            output.stdout = (await fs.readFile(Uri.joinPath(cwd, 'stdout.txt'))).toString();
        }
        return output;
    }
    return;
}
interface DOSBoxOption {
    /**
     * the command may be need to exec before open dosbox*/
    preOpen?: string,
    confFile?: string,
    param?: string[]
}

interface DOSBoxStd {
    stdout: string;
    stderr: string;
    flag: BoxStdNOTE;
    exitcode: number | null | undefined
}


/**default command for open dosbox */
function OpenDosboxCmd(boxconsole?: WINCONSOLEOPTION): string {
    //command for open dosbox
    let command: string = "dosbox";
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
