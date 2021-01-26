import * as jsdos from 'js-dos';
import { DosCommandInterface } from 'js-dos/dist/typescript/js-dos-ci';
import { DosFS } from 'js-dos/dist/typescript/js-dos-fs';
declare function acquireVsCodeApi();
declare const Dos: jsdos.DosFactory;

const vscode = acquireVsCodeApi();

class VSCJSDOS {
    /**the status of wdosbox
     * TODO: figure out when the wdosbox exit*/
    status: 'preparing' | 'fs' | 'main' | 'running' | 'exit';
    /**currently usable in `running` status */
    ci?: DosCommandInterface;
    /**currently usable in `fs` status */
    fs?: DosFS;
    updateStatus(status: 'preparing' | 'fs' | 'main' | 'running' | 'exit') {
        this.status = status;
        //📤 send status message from webview to extension
        vscode.postMessage({
            command: 'jsdosStatus',
            text: status
        });
    }
}

export type ReadyOption = {
    writes?: { path: string, body: ArrayBuffer | Uint8Array | string }[],
    commands?: string[]
};

function jsdos2(wdosboxUrl: string, toolszip: string): VSCJSDOS {
    console.log('start jsdos2');
    let vscJsdos: VSCJSDOS = new VSCJSDOS;
    vscJsdos.updateStatus('preparing');

    let canvas = document.getElementById("jsdos") as HTMLCanvasElement;
    let option = {
        wdosboxUrl: wdosboxUrl,
        cycles: 1000,
        autolock: false,
        //📤 send the wdosbox console's stdout from webview to extension
        log: (message: string) => {
            vscode.postMessage({
                command: 'wdosbox console stdout',
                text: message
            });
        },
        //📤 send the wdosbox console's stderr from webview to extension
        onerror: (message: string) => {
            vscode.postMessage({
                command: 'wdosbox console stderr',
                text: message
            });
        },
    };
    const dosReady = async (fs: DosFS, main: jsdos.DosMainFn, opt?: ReadyOption) => {
        vscJsdos.updateStatus('fs');
        await fs.extractAll([
            { url: toolszip, mountPoint: "/asm" }]
        );
        if (Array.isArray(opt?.writes)) {
            for (const w of opt.writes) {
                fs.createFile(w.path, w.body);
            }
        }
        vscJsdos.updateStatus('main');
        vscJsdos.ci = await main(
            ["-c", "set path=c:\\asm\\masm;c:\\asm\\tasm", "-c", "mkdir code", "-c", "cd code"]
        );
        vscJsdos.updateStatus('running');
        //📤 send the wdosbox's stdout from webview to extension
        let stdout = "";
        vscJsdos.ci.listenStdout(
            (data) => {
                stdout += data;
                if (data === '\n\r\n') {
                    console.log(stdout);
                }
            }
        );
        let length = 0;
        setInterval(
            () => {
                if (stdout.length === length && length > 0) {
                    vscode.postMessage({
                        command: 'stdoutData',
                        text: stdout
                    });
                    stdout = "";
                }
                length = stdout.length;
            },
            880
        );
    };
    //📥 receive message from extension Handle the message inside the webview
    window.addEventListener('message', event => {
        const message = event.data; // The JSON data extension sent
        switch (message.command) {
            case 'writefile':
                if (vscJsdos.status === 'fs') {
                    vscJsdos.fs.createFile(message.path, message.body);
                }
                break;
            case 'execCommand':
                if (vscJsdos.status === 'running') {
                    vscJsdos.ci.shell(...message.commands);
                }
                break;
            case 'launch':
                Dos(canvas, option).ready(dosReady);
                break;
            case 'launch_wait_fs':
                Dos(canvas, option).ready((f, m) => dosReady(f, m, message.text));
                break;
        }
    });
    return vscJsdos;
}

