import { window, Terminal } from 'vscode';
import { Config } from './configration';
import { exec } from 'child_process';

let msdosTerminal: Terminal | null = null;
export function runPlayer(conf: Config, filename: string): Promise<string> {
    let command = '"' + conf.msbatpath + '" "' + conf.path + '" ' + conf.MASMorTASM + ' "' + filename + '" "' + conf.workUri.fsPath + '"';
    return new Promise<string>(
        (resolve, reject) => {
            let child = exec(
                command, { cwd: conf.path, shell: 'cmd.exe' }, (error, stdout, stderr) => {
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
                    let msg = `Use playerasm.bat Failed\t exitcode${code}\t\nFilepath: ${conf.msbatpath}`;
                    window.showErrorMessage(msg);
                }
            });
            let timeout: number = 3000;
            setTimeout(() => {
                if (child.exitCode === null) {
                    child.kill();
                    window.showErrorMessage(`Run playerasm.bat timeout after ${timeout}ms\t\nFilepath: ${conf.msbatpath}`);
                    console.log(child);
                }
            }, timeout);

        }
    );

}
export function outTerminal(run: boolean, conf: Config) {
    let myenv = process.env;
    let myenvPATH = myenv.PATH + ';' + conf.path + '\\player;' + conf.path + '\\tasm;' + conf.path + '\\masm;';
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