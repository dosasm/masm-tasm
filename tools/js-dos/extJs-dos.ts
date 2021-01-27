import { Cipher } from 'crypto';
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
    cmdQueue = ["set path=c:\\asm\\dir0;c:\\asm\\dir1", "mkdir code", "cd code"];
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

function jsdos2(wdosboxUrl: string, toolszip: string[]): VSCJSDOS {
    console.log('start jsdos2');
    let vscJsdos: VSCJSDOS = new VSCJSDOS;
    vscJsdos.updateStatus('preparing');

    const dosReady = async (fs: DosFS, main: jsdos.DosMainFn, opt?: ReadyOption) => {
        //0️⃣fileSystem: prepare files
        vscJsdos.updateStatus('fs');
        if (Array.isArray(opt?.writes)) {
            for (const w of opt.writes) {
                fs.createFile(w.path, w.body);
            }
        }
        let zips = toolszip.map(
            (val, idx) => { return { url: val, mountPoint: "/asm/dir" + idx.toString() }; }
        );
        console.log(zips);
        await fs.extractAll(zips).catch((r) => { console.error(r); });
        //1️⃣main: get the command interface to control wdosbox
        vscJsdos.updateStatus('main');
        let params = opt?.commands ? opt.commands : [];
        vscJsdos.ci = await main(params);
        //2️⃣running: the wdosbox is running and can be controlled with `ci`
        vscJsdos.updateStatus('running');
        vscJsdos.ci.shell(...vscJsdos.cmdQueue);

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

    const canvas = document.getElementById("jsdos") as HTMLCanvasElement;
    const option = {
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
                } else {
                    vscJsdos.cmdQueue.push(...message.commands);
                }
                break;
            case 'launch':
                Dos(canvas, option).ready(dosReady);
                break;
            case 'launch_wait_fs':
                try { Dos(canvas, option).ready((f, m) => dosReady(f, m, message.text)); }
                catch (e) { console.error(e); }
                break;
        }
    });
    return vscJsdos;
}

