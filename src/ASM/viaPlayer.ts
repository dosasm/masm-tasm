import { window, Terminal, Uri, workspace } from 'vscode';
import { exec } from 'child_process';
import { Config, SRCFILE } from './configration';

let msdosTerminal: Terminal | null = null;

export function runPlayer(src: SRCFILE, conf: Config): Promise<string> {
    let command = conf.getPlayerAction(conf.MASMorTASM, src);
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

export function runDebug(runOrDebug: boolean, conf: Config, src: SRCFILE) {
    let debugcmd = conf.getPlayerAction('masm_debug', src);
    let runcmd = conf.getPlayerAction('run', src);
    let command = runOrDebug ? runcmd : debugcmd;
    outTerminal(conf, `${src.disk}: & cd \"${src.folder.fsPath}\"`);
    outTerminal(conf, command);

}

export function outTerminal(conf: Config, command?: string) {
    let env: NodeJS.ProcessEnv = process.env;
    let envPath = env.PATH + ';' + conf.getPlayerAction('path');
    if (msdosTerminal?.exitStatus || msdosTerminal === null) {
        msdosTerminal = window.createTerminal({
            env: { PATH: envPath },
            shellPath: "cmd.exe",
            hideFromUser: false,
        });
    }
    msdosTerminal.show();
    if (command) {
        msdosTerminal.sendText(command);
    }
}
export function deactivate() {
    if (msdosTerminal) { msdosTerminal.dispose(); }
}