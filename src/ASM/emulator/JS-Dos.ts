import * as vscode from 'vscode';
import { Uri, window } from 'vscode';
import { ASMTYPE, Config, SRCFILE, settingsStrReplacer } from '../configration';
import { ASMPREPARATION, EMURUN, MSGProcessor } from '../runcode';
import { compressAsmTools } from './js-dos_zip';

const fs = vscode.workspace.fs;

interface JsdosAsmConfig {
    "masm": string[]; "tasm": string[]; "tasm_debug": string[]; "masm_debug": string[]; "run": string[];
}

class JSdosVSCodeConfig {
    private static get _target(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('masmtasm.jsdos');
    };
    public static get viewColumn(): vscode.ViewColumn {
        return JSdosVSCodeConfig._target.get("viewColumn") as vscode.ViewColumn;
    }
    public get wdosbox(): string {
        return JSdosVSCodeConfig._target.get("wdosbox") as string;
    }
    getAction(scope: keyof JsdosAsmConfig): string[] {
        const a = JSdosVSCodeConfig._target.get('more') as JsdosAsmConfig;
        const key = scope;
        const output = a[key];
        if (Array.isArray(output)) {
            if (this.replacer) {
                return output.map(this.replacer);
            }
        }
        window.showErrorMessage(`action ${key} hasn't been defined`);
        throw new Error(`action ${key} hasn't been defined`);
    }
    replacer?: ((str: string) => string) | undefined;
    public runDebugCmd(runOrDebug: boolean, ASM: ASMTYPE): string[] {
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
    public AsmLinkRunDebugCmd(runOrDebug: boolean, ASM: ASMTYPE): string[] {
        let asmlink: string[];
        switch (ASM) {
            case ASMTYPE.MASM: asmlink = this.getAction('masm'); break;
            case ASMTYPE.TASM: asmlink = this.getAction('tasm'); break;
        }
        return asmlink.concat(this.runDebugCmd(runOrDebug, ASM));
    }
}

interface JSDOSCREATEFILE {
    path: string;
    body: ArrayBuffer | Uint8Array | string;
}
interface ReadyOption {
    writes: JSDOSCREATEFILE[];
    commands: string[];
};

export class JSDos implements EMURUN {
    private _conf: Config;
    private _VscConf: JSdosVSCodeConfig;
    private _wsrc?: SRCFILE;
    constructor(conf: Config) {
        this._conf = conf;
        this._VscConf = new JSdosVSCodeConfig();
    }
    async prepare(opt: ASMPREPARATION): Promise<boolean> {
        const resourcesUri = Uri.joinPath(this._conf.Uris.jsdos, 'resources');
        JsdosPanel.createOrShow(resourcesUri);
        JsdosPanel.wDOSBoxpath = this._VscConf.wdosbox;
        const filename = opt.src?.dosboxFsReadable ? opt.src.filename : "T";
        const v = Uri.joinPath(Uri.file('/code/'), `${filename}.${opt.src.extname}`);
        this._wsrc = new SRCFILE(v);
        this._VscConf.replacer = (val: string): string => settingsStrReplacer(val, this._conf, this._wsrc);
        await compressAsmTools(this._conf.Uris.tools, resourcesUri);
        const filearray = await fs.readFile(opt.src.uri);
        this._launch.writes.push({ path: this._wsrc.uri.fsPath, body: filearray.toString() });
        return true;
    }
    private _launch: ReadyOption = { writes: [], commands: [] };
    openEmu(folder: vscode.Uri): void {
        if (JsdosPanel.currentPanel) {
            JsdosPanel.currentPanel.launchJsdos(this._launch);
        }
        throw new Error('Method not implemented.');
    }
    Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<string> {
        return this.runDebug(true, src, msgprocessor);
    }
    Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<string> {
        return this.runDebug(false, src, msgprocessor);
    }
    public async runDebug(runOrDebug: boolean, src: SRCFILE, msgprocessor: MSGProcessor): Promise<string> {
        if (JsdosPanel.currentPanel && this._wsrc) {
            const p = JsdosPanel.currentPanel.launchJsdos(this._launch);
            const cmds = this._VscConf.AsmLinkRunDebugCmd(runOrDebug, this._conf.MASMorTASM);
            JsdosPanel.currentPanel.sendCmd(cmds);
            const msg = await JsdosPanel.currentPanel.getStdout();
            await msgprocessor(msg, { preventWarn: true });
        }
        return JSON.stringify([JsdosPanel.currentPanel, this._wsrc]);
    }
    copyUri?: vscode.Uri | undefined;
    forceCopy?: boolean | undefined;
}

/**
 * Manages Js-dos webview panels
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
    public static wDOSBoxpath?: string;

    public static createOrShow(jsdosUri: vscode.Uri): void {

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
                localResourceRoots: [jsdosUri]
            }
        );

        JsdosPanel.currentPanel = new JsdosPanel(panel, jsdosUri);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): void {
        JsdosPanel.currentPanel = new JsdosPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, resourcesUri: vscode.Uri) {
        this._panel = panel;
        this._jsdosUri = resourcesUri;

        // Set the webview's initial html content
        // this._update();

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
                        // console.log(message.text);
                        this.allWdosboxStdout.push(message.text);
                        this.WdosboxStdoutAppend(message.text);
                        if (this.WdosboxStdout.includes('exit\n')) {
                            JsdosPanel.currentPanel?.dispose();
                        };
                        if (this.ListenWdosboxStdout !== undefined) {
                            this.ListenWdosboxStdout(message.text);
                        }
                        break;
                    case 'jsdosStatus':
                        this.jsdosStatus = message.text as 'preparing' | 'fs' | 'main' | 'running' | 'exit';
                        switch (this.jsdosStatus) {
                            case 'preparing':
                            case 'fs':
                            case 'main':
                                this.WdosboxStdout = "";
                                break;
                            case 'running':
                                if (this.JSDOSready !== undefined) {
                                    this.JSDOSready();
                                }
                            case 'exit':
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
    /**record message from one wdosbox progress*/
    public WdosboxStdout = "";
    /**record all message from this pannel */
    public allWdosboxStdout: string[] = [];
    public WdosboxStdoutAppend(str: string): void {
        const output = this.WdosboxStdout + str;
        this.WdosboxStdout = output;
    }
    public getStdout(): Promise<string> {
        return new Promise(
            (resolve, reject) => {
                this.ListenWdosboxStdout = (): void => {
                    const val = this.WdosboxStdout;
                    if (val.includes('ASM') || val.includes('Assembler')) {
                        resolve(val);
                        this.ListenWdosboxStdout = undefined;
                    }
                };
                setTimeout(
                    () => { reject(this.WdosboxStdout); }, 100000
                );
            }
        );
    }
    public ListenWdosboxStdout: ((val: string) => void) | undefined = undefined;
    public JSDOSready: (() => void) | undefined = undefined;
    public launchJsdos(opt?: ReadyOption): void {
        const msg = {
            command: 'launch',
            text: opt
        };
        this._panel.webview.postMessage(msg);
    }

    public sendCmd(cmds: string[]): boolean {
        if (this.jsdosStatus !== 'exit') {
            const msg = {
                command: 'execCommand',
                commands: cmds
            };
            this._panel.webview.postMessage(msg);
            return true;
        }
        console.warn(`cancel send command for wdosbox has exit (${this.jsdosStatus}) `);
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
        const jsdosOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'js-dos.js');
        const wdosboxOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'wdosbox.js');
        const MasmToolOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'masm.zip');
        const TasmToolOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'tasm.zip');
        const ExtJsdosOnDisk = vscode.Uri.joinPath(this._jsdosUri, 'extJs-dos.js');
        // And the uri we use to load this script in the webview
        const jsdosUri = webview.asWebviewUri(jsdosOnDisk);
        let wdosboxUri = webview.asWebviewUri(wdosboxOnDisk);
        const MasmToolUri = webview.asWebviewUri(MasmToolOnDisk);
        const TasmToolUri = webview.asWebviewUri(TasmToolOnDisk);
        const ExtJsdosUri = webview.asWebviewUri(ExtJsdosOnDisk);
        if (JsdosPanel.wDOSBoxpath) {
            let uri: Uri;
            if (JsdosPanel.wDOSBoxpath.includes('https')) {
                uri = Uri.parse(JsdosPanel.wDOSBoxpath.trim());
            } else {
                uri = Uri.joinPath(Uri.parse('https://js-dos.com/6.22/current/'), JsdosPanel.wDOSBoxpath.trim());
            }
            wdosboxUri = uri;
        }



        // Local path to css styles
        const stylePath = vscode.Uri.joinPath(this._jsdosUri, 'extJs-dos.js');

        // Uri to load styles into webview
        const stylesUri = webview.asWebviewUri(stylePath);

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
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
  <script>jsdos2('${wdosboxUri}', ['${MasmToolUri}','${TasmToolUri}'])</script>
</body>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
