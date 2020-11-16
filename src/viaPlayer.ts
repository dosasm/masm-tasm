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
}
let msdosTerminal: Terminal | null = null;
export function runPlayer(conf: PlayerConfig, filename: string): Promise<string> {
    let toolspath = conf.ASMtoolsUri.fsPath;
    let command = '"' + conf.playerbat + '" "' + toolspath + '" ' + conf.MASMorTASM + ' "' + filename + '" "' + conf.workUri.fsPath + '"';
    return new Promise<string>(
        (resolve, reject) => {
            let child = exec(
                command, { cwd: toolspath, shell: 'cmd.exe' }, (error, stdout, stderr) => {
                    if (error) {
                        reject(["exec msdos player error", error, stderr]);
                    }
                    else {
                        resolve(stdout);
                    }
                }
            );
            child.on('exit', (code) => {
                if (code && code !== 0) {
                    let msg = `Use playerasm.bat Failed\t exitcode${code}\t\nFilepath: ${conf.playerbat}`;
                    window.showErrorMessage(msg);
                }
            });
            let timeout: number = 3000;
            setTimeout(() => {
                if (child.exitCode === null) {
                    child.kill();
                    window.showErrorMessage(`Run playerasm.bat timeout after ${timeout}ms\t\nCommand: ${command}`);
                    console.log(child);
                }
            }, timeout);

        }
    );

}
export function outTerminal(run: boolean, conf: PlayerConfig) {
    let myenv = process.env, toolspath = conf.ASMtoolsUri.fsPath;
    let myenvPATH = myenv.PATH + ';' + toolspath + '\\player;' + toolspath + '\\tasm;' + toolspath + '\\masm;';
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
    else {
        msdosTerminal.sendText('msdos -v5.0 debug T.EXE');
    }
}
export function deactivate() {
    if (msdosTerminal) { msdosTerminal.dispose(); }
}