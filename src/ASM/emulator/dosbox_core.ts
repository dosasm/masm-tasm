import { exec, ExecOptions } from 'child_process';
import { window, WorkspaceConfiguration, workspace, Uri, FileType } from 'vscode';
import { inArrays } from '../util';

export class DOSBox {
    private _core: string = 'dosbox';
    private _cwd?: string;
    private _confFile?: Uri;
    private _stdout: string = "";
    private _stderr: string = "";
    private _console: string | undefined;
    private _count: number = 0;
    constructor(cwd?: string, confFile?: Uri) {
        this._confFile = confFile;
        this._cwd = cwd;
    }
    public update(extCONF: WorkspaceConfiguration) {
        this._console = extCONF.get('console');
        let command: string | undefined = extCONF.get('commmand');
        this._core = OpenDosboxCmd(this._console, command);
    }
    private cmdBuild(boxcmd: string[], opt?: DOSBoxOption): string {
        let command = this._core;
        if (opt?.preOpen) {
            command = opt.preOpen + command;
        }
        if ((typeof opt?.confFile) === 'string') {
            command += ` -conf "${opt?.confFile}"`;
        }
        else if (opt?.confFile === undefined) {
            command += ` -conf "${this._confFile?.fsPath}"`;
        }
        if (opt?.param) {
            command += ' ' + opt.param;
        }
        if (boxcmd.length > 0) {
            command += ' -c "' + boxcmd.join('" -c "') + '"';
        }
        return command;
    }
    public run(boxcmd: string[], opt?: DOSBoxOption) {
        return this.cp_run(this.cmdBuild(boxcmd, opt));
    }
    public get console() {
        return this._console;
    }
    public get redirect() {
        let redirect: boolean = false;
        if (this._console?.includes('redirect(show)')) {
            redirect = true;
        }
        return redirect;
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
    param?: string
}

interface DOSBoxStd {
    stdout: string;
    stderr: string;
    flag: BoxStdNOTE;
    exitcode: number | null | undefined
}
/**
 * 
 */
function OpenDosboxCmd(boxconsole?: string, custom?: string): string {
    //command for open dosbox
    let command: string = "dosbox";
    //First, use the user-defined command;
    if (custom) {
        return custom + " ";
    }
    //for windows,using different command according to dosbox's path and the choice of the console window
    switch (process.platform) {
        case 'win32':
            switch (boxconsole) {
                case "min": command = 'start/min/wait "" dosbox'; break;
                case "normal": command = 'dosbox'; break;
                case "noconsole":
                default: command = 'dosbox -noconsole'; break;
            }
            break;
        case 'darwin':
            command = "open -a DOSBox --args ";
            break;
        default:
            command = 'dosbox';
    }
    return command;
}
