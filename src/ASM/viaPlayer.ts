import { window, Terminal, Uri } from 'vscode';
import { exec } from 'child_process';
export interface PlayerConfig {
    /**
     * the path of the playerasm.bat
     */
    playerbat: string;
    /**
     * the workspace path
     */
    workUri: Uri;
    /**
     * the Uri of the folder of ASM tools
     */
    ASMtoolsUri: Uri;
    /**
     * "MASM" or "TASM"
     */
    MASMorTASM: 'MASM' | 'TASM';
    /**
     * folder of the msdos.exe
     */
    Playerfolder: Uri;
}
let msdosTerminal: Terminal | null = null;
export function runPlayer(conf: PlayerConfig): Promise<string> {
    let toolspath = conf.ASMtoolsUri.fsPath;
    let myenv: NodeJS.ProcessEnv = {
        "path": conf.Playerfolder.fsPath + ';' + toolspath + '\\tasm;' + toolspath + '\\masm;'
    };
    let command = '"' + conf.playerbat + '" "' + toolspath + '" ' + conf.MASMorTASM + ' "' + conf.workUri.fsPath + '"';
    return new Promise<string>(
        (resolve, reject) => {
            let timeout: number = 3000;
            let child = exec(
                command, { cwd: toolspath, timeout: timeout, env: myenv },
                (error, stdout, stderr) => {
                    if (error) {
                        reject(["exec msdos player error", error, stderr]);
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
                    console.log(child);
                }
                else if (code !== 0) {
                    let msg = `Use playerasm.bat Failed\t exitcode${code}\t\n  command:${command}`;
                    window.showErrorMessage(msg);
                }
            });
        }
    );
}
export function outTerminal(conf: PlayerConfig, run?: boolean,) {
    let myenv = process.env, toolspath = conf.ASMtoolsUri.fsPath;
    let myenvPATH = myenv.PATH + ';' + conf.Playerfolder.fsPath + ';' + toolspath + '\\tasm;' + toolspath + '\\masm;';
    if (msdosTerminal?.exitStatus || msdosTerminal === null) {
        msdosTerminal = window.createTerminal({
            cwd: conf.workUri.fsPath,
            env: {
                "PATH": myenvPATH
            },
            shellPath: "cmd.exe",
            hideFromUser: false,
        });
    }
    msdosTerminal.show();
    if (run) {
        msdosTerminal.sendText('msdos T.EXE');
    }
    else if (run === false) {
        msdosTerminal.sendText('msdos -v5.0 debug T.EXE');
    }
}
export function deactivate() {
    if (msdosTerminal) { msdosTerminal.dispose(); }
}