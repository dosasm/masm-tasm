import * as vscode from 'vscode';
import { Uri, window } from 'vscode';
import { ASMTYPE, Config, SRCFILE, str_replacer } from '../configration';
import { ASMPREPARATION, EMURUN, MSGProcessor } from '../runcode';

const fs = vscode.workspace.fs;

class JSdosVSCodeConfig {
    private get _target() {
        return vscode.workspace.getConfiguration('masmtasm.jsdos');
    };
    getAction(scope: "masm" | "tasm" | "tasm_debug" | "masm_debug" | "run") {
        let a = this._target.get('AsmConfig') as any;
        let key = scope.toLowerCase()
        let output = a[key];
        if (Array.isArray(output)) {
            if (this.replacer) {
                output = output.map(this.replacer)
            }
            return output
        }
        window.showErrorMessage(`action ${key} hasn't been defined`)
        throw new Error(`action ${key} hasn't been defined`)
    }
    replacer?: ((str: string) => string) | undefined;
    public runDebugCmd(runOrDebug: boolean, ASM: ASMTYPE) {
        if (runOrDebug) {
            return this.getAction('run');
        }
        else {
            switch (ASM) {
                case ASMTYPE.MASM: return this.getAction('masm_debug');
                case ASMTYPE.TASM: return this.getAction('tasm_debug');
            }
        }
    }
    public AsmLinkRunDebugCmd(runOrDebug: boolean, ASM: ASMTYPE) {
        let asmlink: string[];
        switch (ASM) {
            case ASMTYPE.MASM: asmlink = this.getAction('masm'); break;
            case ASMTYPE.TASM: asmlink = this.getAction('tasm'); break;
        }
        return asmlink.concat(this.runDebugCmd(runOrDebug, ASM))
    }
}

export class JSDos implements EMURUN {
    private _conf: Config;
    private _VscConf: JSdosVSCodeConfig;
    private _wsrc?: SRCFILE
    constructor(conf: Config) {
        this._conf = conf;
        this._VscConf = new JSdosVSCodeConfig();
    }
    prepare(opt: ASMPREPARATION): boolean | Promise<boolean> {
        JsdosPanel.createOrShow(this._conf.Uris.jsdos);
        let filename = opt.src?.dosboxFsReadable ? opt.src.filename : "T"
        let v = Uri.joinPath(Uri.file('/code/'), `${filename}.${opt.src.extname}`);
        this._wsrc = new SRCFILE(v)
        this._VscConf.replacer = (val) => str_replacer(val, this._conf, this._wsrc);
        return true;
    }
    openEmu(folder: vscode.Uri) {
        JsdosPanel.createOrShow(this._conf.Uris.jsdos);
        if (JsdosPanel.currentPanel) {
            JsdosPanel.currentPanel.launchJsdos();
        }
        throw new Error('Method not implemented.');
    }
    Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any> {
        return this.runDebug(true, src, msgprocessor)
    }
    Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any> {
        return this.runDebug(false, src, msgprocessor)
    }
    public async runDebug(runOrDebug: boolean, src: SRCFILE, msgprocessor: MSGProcessor) {
        let filearray = await fs.readFile(src.uri);
        if (JsdosPanel.currentPanel && this._wsrc) {
            let opt = {
                writes: [{ path: this._wsrc.uri.fsPath, body: filearray.toString() }]
            }
            let p = JsdosPanel.currentPanel.launchJsdos(opt);
            await p.ready;
            let cmds = this._VscConf.AsmLinkRunDebugCmd(runOrDebug, this._conf.MASMorTASM);
            JsdosPanel.currentPanel.sendCmd(cmds);
            let msg = await JsdosPanel.currentPanel.getStdout();
            msgprocessor(msg, { preventWarn: true });
        }
    }
    copyUri?: vscode.Uri | undefined;
    forceCopy?: boolean | undefined;
}

interface JSDOSCREATEFILE {
    path: string,
    body: ArrayBuffer | Uint8Array | string
}

/**
 * Manages cat coding webview panels
 */
class JsdosPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: JsdosPanel | undefined;

    public static readonly viewType = 'Jsdos wdosbox';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _jsdosUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public jsdosStatus?: string;

    public static createOrShow(jsdosUri: vscode.Uri) {

        // If we already have a panel, show it.
        if (JsdosPanel.currentPanel) {
            JsdosPanel.currentPanel._panel.reveal();
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            JsdosPanel.viewType,
            'jsdos wdosbox',
            vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,

                // And restrict the webview to only loading content from our extension's `media` directory.
                localResourceRoots: [jsdosUri]
            }
        );

        JsdosPanel.currentPanel = new JsdosPanel(panel, jsdosUri);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        JsdosPanel.currentPanel = new JsdosPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._jsdosUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            e => {
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
                        console.log(message.text);
                        this.WdosboxStdoutAppend(message.text);
                        if (this.WdosboxStdout.includes('exit\n')) {
                            JsdosPanel.currentPanel?.dispose()
                        };
                        this.ListenWdosboxStdout(message.text);
                        break;
                    case 'jsdosStatus':
                        this.jsdosStatus = message.text;
                        if (this.jsdosStatus === 'running') {
                            this.JSDOSready()
                        }
                        break;
                    case 'wdosbox console stdout':

                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public WdosboxStdout: string = "";
    public WdosboxStdoutAppend(str: string) {
        let output = this.WdosboxStdout + str;
        this.WdosboxStdout = output;
    }
    public getStdout(): Promise<string> {
        return new Promise(
            (resolve, reject) => {
                this.ListenWdosboxStdout = (val: string) => {
                    resolve(val);
                    this.ListenWdosboxStdout = (val: string) => { }
                }
            }
        )
    }
    public ListenWdosboxStdout = (val: string) => { }
    public JSDOSready = () => { }
    public launchJsdos(opt?: { writes: JSDOSCREATEFILE[] }): { ready: Promise<boolean> } {
        let msg: any = { command: 'launch' }
        if (opt) {
            msg = {
                command: 'launch_wait_fs',
                text: opt
            }
        }
        this._panel.webview.postMessage(msg);
        return {
            ready: new Promise(
                (resolve, reject) => { this.JSDOSready = () => { resolve(true) } }
            )
        }
    }

    public sendCmd(cmds: string[]): boolean {
        if (this.jsdosStatus === 'running') {
            let msg: any = {
                command: 'execCommand',
                commands: cmds
            }
            this._panel.webview.postMessage(msg);
            return true;
        }
        console.warn(`cancell send command for wdosbox is not ready status:${this.jsdosStatus} `)
        return false;
    }

    public dispose() {
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

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Local path to main script run in the webview
        const jsdosOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'js-dos.js');
        const wdosboxOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'wdosbox.js');
        const AsmToolOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'tools.zip');
        const ExtJsdosOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'extJs-dos.js');
        // And the uri we use to load this script in the webview
        const jsdosUri = webview.asWebviewUri(jsdosOnDisk);
        const wdosboxUri = webview.asWebviewUri(wdosboxOnDisk);
        const AsmToolUri = webview.asWebviewUri(AsmToolOnDisk);
        const ExtJsdosUri = webview.asWebviewUri(ExtJsdosOnDisk);

        // // Local path to css styles
        // const styleResetPath = vscode.Uri.joinPath(this._jsdosUri, 'media', 'reset.css');
        // const stylesPathMainPath = vscode.Uri.joinPath(this._jsdosUri, 'media', 'vscode.css');

        // // Uri to load styles into webview
        // const stylesResetUri = webview.asWebviewUri(styleResetPath);
        // const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        return `<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <title>js-dos 6.22, ASM</title>
  <style>
    html,
    body,
    canvas,
    .dosbox-container {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
</head>

<body>
  <canvas id="jsdos"></canvas>
  <script src="${jsdosUri}"></script>
  <script src="${ExtJsdosUri}"></script>
  <script>jsdos2('${wdosboxUri}', '${AsmToolUri}')</script>
</body>`
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
