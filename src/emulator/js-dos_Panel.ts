import * as vscode from 'vscode';
import { JSdosVSCodeConfig } from './JS-Dos';

export interface LaunchOption {
    wdosboxUrl?: vscode.Uri;
    cycles?: number | 'auto' | 'max';
    autolock?: boolean;
    /**the file need to write */
    writes: {
        path: string;
        body: ArrayBuffer | Uint8Array | string;
    }[];
    /**the file need to write */
    extracts: Array<[vscode.Uri, string]>;
    /**the comands send to wdosbox option */
    options?: string[];
    /**the commands send to wdosbox's shell after launch*/
    shellcmds: string[];
}

export enum JSDosSTATUS {
    preparing,
    /**fs avaliable */
    fs,
    main,
    /**ci avaliable */
    running,
    exit
}

/**
 * Manages Js-dos webview panels
 */
export class JsdosPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: JsdosPanel | undefined;

    public static readonly viewType = 'Jsdos wdosbox';


    public static wDOSBoxpath?: string;

    public static createOrShow(jsdosUri: vscode.Uri, resources: vscode.Uri): void {

        // If we already have a panel, show it.
        if (JsdosPanel.currentPanel) {
            JsdosPanel.currentPanel._panel.reveal();
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            JsdosPanel.viewType,
            'jsdos wdosbox',
            {
                viewColumn: JSdosVSCodeConfig.viewColumn,
                preserveFocus: true
            },
            {
                // Enable javascript in the webview
                enableScripts: true,

                // And restrict the webview to only loading content from our extension's `media` directory.
                localResourceRoots: [jsdosUri, resources]
            }
        );

        JsdosPanel.currentPanel = new JsdosPanel(panel, jsdosUri);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): void {
        JsdosPanel.currentPanel = new JsdosPanel(panel, extensionUri);
    }

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public jsdosStatus: JSDosSTATUS | boolean = false;
    /**record all message from this pannel */
    public allWdosboxStdout: string[] = [];
    public get wDosboxStdout(): string {
        return this.allWdosboxStdout.join('');
    }
    /**listener called when has wdosbox shell stdout received after update WdosboxStdout */
    public ListenWdosboxStdout: ((val: string) => void) | undefined = undefined;
    public jsdosReady: (() => void) | undefined = undefined;

    /**called when JSDos is ready */
    public wDOSBoxReady: (() => void) | undefined = undefined;

    private constructor(panel: vscode.WebviewPanel, private readonly jsdosFolder: vscode.Uri) {
        this._panel = panel;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            () => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'stdoutData':
                        this.allWdosboxStdout.push(message.text);
                        if (this.ListenWdosboxStdout !== undefined) {
                            this.ListenWdosboxStdout(message.text);
                        }
                        break;
                    case 'jsdosStatus':
                        this.jsdosStatus = message.text as JSDosSTATUS;
                        switch (this.jsdosStatus) {

                            case JSDosSTATUS.preparing:
                            case JSDosSTATUS.fs:
                            case JSDosSTATUS.main:
                                this.allWdosboxStdout = [];
                                break;
                            case JSDosSTATUS.running:
                                if (this.wDOSBoxReady !== undefined) {
                                    this.wDOSBoxReady();
                                }
                                break;
                            case JSDosSTATUS.exit:
                                JsdosPanel.currentPanel?.dispose();
                                break;
                        }
                        break;
                    case 'listenning Commands':
                        this.jsdosStatus = true;
                        this._panel.webview.postMessage({
                            command: 'message received',
                            text: 'listenning Commands'
                        });
                        if (this.jsdosReady) { this.jsdosReady(); }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    /**get the stdout of assembly assembler */
    public getStdout(): Promise<string> {
        const getMessage = (str: string): string | undefined => {
            const re = str.match(/C:\\CODE>([\s\S]*Assembling[\s\S]*?)C:\\CODE>/);
            if (re && re[1]) {
                return re[1];
            }
            return;
        };
        return new Promise(
            resolve => {
                this.ListenWdosboxStdout = (): void => {
                    const msg = getMessage(this.wDosboxStdout);
                    if (msg !== undefined) {
                        resolve(msg);
                        this.ListenWdosboxStdout = undefined;
                    }
                };
            }
        );
    }

    /**launch the jsdos in webview */
    public launchJsdos(opt: LaunchOption): Promise<string> {
        const webview = this._panel.webview;

        const wdosboxOnDisk = vscode.Uri.joinPath(this.jsdosFolder, './out/wdosbox.js');
        const wdosboxUrl = opt.wdosboxUrl !== undefined ? opt.wdosboxUrl.toString() : webview.asWebviewUri(wdosboxOnDisk).toString();

        const extracts = opt.extracts.map(
            val => [val[0].scheme === 'file' ? webview.asWebviewUri(val[0]).toString() : val[0].toString(), val[1]]
        );

        const command = 'launch wDOSBox';
        const text = {
            extracts, wdosboxUrl,
            cycles: opt.cycles,
            autolock: opt.autolock,
            writes: opt.writes,
            options: opt.options,
            shellcmds: opt.shellcmds
        };
        return new Promise(
            resolve => {
                if (this.jsdosStatus === false) {
                    this.jsdosReady = (): void => {
                        this._panel.webview.postMessage({ command, text });
                        this.jsdosReady = undefined;
                        resolve('waited');
                    };
                } else {
                    this._panel.webview.postMessage({ command, text });
                    resolve('at once');
                }
            }
        );
    }

    public sendCmd(cmds: string[]): boolean {
        if (this.jsdosStatus !== JSDosSTATUS.exit) {
            const msg = {
                command: 'wDosbox shell Command',
                commands: cmds
            };
            this._panel.webview.postMessage(msg);
            return true;
        }
        return false;
    }

    public dispose(): void {
        JsdosPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(): void {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Local path to main script run in the webview
        const jsdosOnDisk = vscode.Uri.joinPath(this.jsdosFolder, './out/js-dos.js');
        const ExtJsdosOnDisk = vscode.Uri.joinPath(this.jsdosFolder, './out/main.js');

        // And the uri we use to load this script in the webview
        const jsdosUri = webview.asWebviewUri(jsdosOnDisk);
        const ExtJsdosUri = webview.asWebviewUri(ExtJsdosOnDisk);

        // Local path to css styles
        const stylePath = vscode.Uri.joinPath(this.jsdosFolder, './resources/extJs-dos.css');

        // Uri to load styles into webview
        const stylesUri = webview.asWebviewUri(stylePath);

        return `<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <title>js-dos 6.22, ASM</title>
  <link href="${stylesUri}" rel="stylesheet">
</head>
<body>
  <canvas id="jsdos"></canvas>
  <script src="${jsdosUri}"></script>
  <script src="${ExtJsdosUri}"></script>
</body>`;
    }
}
