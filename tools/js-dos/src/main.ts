import * as jsdos from 'js-dos';
import { DosCommandInterface } from 'js-dos/dist/typescript/js-dos-ci';
import { DosFS } from 'js-dos/dist/typescript/js-dos-fs';

declare const Dos: jsdos.DosFactory;

interface DosOptions {
    wdosboxUrl?: string;
    cycles?: number | string;
    autolock?: boolean;
}

interface JSDOSCREATEFILE {
    path: string;
    body: ArrayBuffer | Uint8Array | string;
}

/**the interface send to wdosbox to laungh dosbox */
interface ReadyOption {
    /**the file need to write */
    writes?: JSDOSCREATEFILE[];
    /**the file need to write */
    extracts?: Array<[string, string] | string>;
    /**the comands send to wdosbox option */
    options?: string[];
    /**the commands send to wdosbox's shell after launch*/
    shellcmds?: string[];
};

interface LaunchOption extends DosOptions, ReadyOption { }

enum JSDosSTATUS {
    preparing,
    /**fs avaliable */
    fs,
    main,
    /**ci avaliable */
    running,
    exit
}

/**record the status of jsdos */
class VSCJSDOS {
    postMessage = (val: any) => undefined;
    /**the status of wdosbox
     * TODO: figure out when the wdosbox exit*/
    status: JSDosSTATUS;
    /**currently usable in `running` status */
    ci?: DosCommandInterface;
    /**currently usable in `fs` status */
    fs?: DosFS;
    cmdQueue = [];

    updateStatus(status: JSDosSTATUS) {
        this.status = status;
        //📤 send status message from webview to extension
        this.postMessage({
            command: 'jsdosStatus',
            text: status
        });
        if (this.StatusChange !== undefined) {
            this.StatusChange(status)
        }
        console.log(`jsdos status ${JSDosSTATUS[status]}`);
    }
    public StatusChange: ((val: JSDosSTATUS) => void) | undefined = undefined;
    public launchJSDos(opt: LaunchOption): Promise<void> {
        console.dir(opt);
        this.updateStatus(JSDosSTATUS.preparing);
        Dos(
            document.getElementById("jsdos") as HTMLCanvasElement,
            {
                wdosboxUrl: opt.wdosboxUrl,
                cycles: opt.cycles,
                autolock: opt.autolock,
                // //📤 send the wdosbox console's stdout from webview to extension
                // log: (message: string) => {
                //     this.postMessage({
                //         command: 'wdosbox console stdout',
                //         text: message
                //     });
                // },
                // //📤 send the wdosbox console's stderr from webview to extension
                // onerror: (message: string) => {
                //     this.postMessage({
                //         command: 'wdosbox console stderr',
                //         text: message
                //     });
                // },
            })
            .ready(
                async (fs: DosFS, main: jsdos.DosMainFn) => {

                    //0️⃣fileSystem: prepare files
                    this.updateStatus(JSDosSTATUS.fs);
                    //write files
                    if (Array.isArray(opt.writes)) {
                        for (const w of opt.writes) {
                            fs.createFile(w.path, w.body);
                        }
                    }
                    //extract zips
                    if (Array.isArray(opt.extracts)) {
                        let count = 0;
                        const zips = opt.extracts.map(
                            val => {
                                if (typeof (val) === 'string') {
                                    count++;
                                    return { url: val, mountPoint: "/asm/dir" + count.toString() };
                                }
                                else {
                                    return {
                                        url: val[0],
                                        mountPoint: val[1]
                                    };
                                }
                            }
                        );
                        await fs.extractAll(zips)
                    }

                    //1️⃣main: get the command interface to control wdosbox
                    this.updateStatus(JSDosSTATUS.main);
                    this.ci = await main(opt ? opt.options : []);

                    //2️⃣running: the wdosbox is running and can be controlled with `ci`
                    this.updateStatus(JSDosSTATUS.running);
                    if (Array.isArray(opt.shellcmds)) {
                        this.cmdQueue.push(...opt.shellcmds);
                    }
                    this.ci.shell(...this.cmdQueue);

                    //📤 send the wdosbox's stdout from webview to extension
                    this.ci.listenStdout(
                        data => {
                            this.postMessage({
                                command: 'stdoutData',
                                text: data
                            });
                        }
                    );
                }).catch(r => { console.error(r) });
        return new Promise(
            resolve => {
                this.StatusChange = val => {
                    if (val === JSDosSTATUS.running) {
                        resolve();
                        this.StatusChange = undefined;
                    }
                }
            }
        )
    }
}

declare function acquireVsCodeApi();
(function () {
    console.time('connect')
    let vscode = undefined;
    //try to get the vscode API
    try { vscode = acquireVsCodeApi(); } catch (e) { console.log(`no vscode api`) }// (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : undefined;
    //Emmm, I spend two day to find this bug, in version 1.49-1.52, the commented part is not workable
    const postMessage = (val: unknown) => {
        if (vscode) {
            vscode.postMessage(val);
        }
        console.log(`post: ${vscode ? 'via vscode' : ''}`, val);
    }

    let vscJsdos: VSCJSDOS | undefined = undefined;
    (window as any).vscJsdos = vscJsdos;

    //listen the console.log information to get the SDL_Quit message
    var oldLog = console.log;
    console.log = function (message: any) {
        switch (message) {
            case 'SDL_Quit called (and ignored)':
                if (vscode === undefined) {
                    alert(message);
                }
                if (vscJsdos) {
                    vscJsdos.updateStatus(JSDosSTATUS.exit);
                }
                break
        }
        oldLog.apply(console, arguments);
    };

    const jsdosReadyPost = vscode ? setInterval(
        () => {
            console.count('listenning Commands')
            postMessage({
                command: 'listenning Commands',
                text: null
            })
        }, 500
    ) : undefined;

    //📥 listen message from extension Handle the message inside the webview
    window.addEventListener('message', event => {
        const message = event.data as MESSAGE; // The JSON data extension sent
        if (Object.keys(message).includes('command')) {
            console.log('get', message);
        }
        switch (message.command) {
            case "message received":
                switch (message.text) {
                    case 'listenning Commands':
                        console.timeEnd('connect')
                        if (jsdosReadyPost) {
                            clearInterval(jsdosReadyPost);
                        }
                }
                break
            case 'launch wDOSBox':
                try {
                    vscJsdos = new VSCJSDOS();
                    vscJsdos.postMessage = postMessage;
                    vscJsdos.launchJSDos(message.text);
                }
                catch (e) { console.error(e); }
                break;
            case 'wDosbox shell Command':
                if (vscJsdos.status === JSDosSTATUS.running) {
                    vscJsdos.ci.shell(...message.text);
                } else {
                    vscJsdos.cmdQueue.push(...message.text);
                }
                break;
        }
    });
})();

export interface LaunchCommand {
    command: 'launch wDOSBox',
    text: LaunchOption
}

export interface shellCommand {
    command: 'wDosbox shell Command',
    text: string[]
}

export interface messageReceived {
    command: 'message received',
    text: string
}
type MESSAGE = LaunchCommand | shellCommand | messageReceived




