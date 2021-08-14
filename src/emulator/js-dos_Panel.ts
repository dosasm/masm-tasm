import * as vscode from 'vscode';
import { Config } from '../ASM/configration';
import { localize } from '../i18n';
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

    public static readonly viewType = 'Jsdos 7.x wdosbox';

    public static createOrShow(conf: Config): void {

        // If we already have a panel, show it.
        if (JsdosPanel.currentPanel) {
            JsdosPanel.currentPanel.dispose();
            vscode.window.showWarningMessage(localize('jsdos.panel.forceUpdate', 'your former jsdos pannel has been disposed'));
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
                localResourceRoots: [
                    conf.asAbsoluteUri('node_modules/emulators/dist'),
                    conf.asAbsoluteUri('node_modules/emulators-ui/dist'),
                    conf.asAbsoluteUri('web/dist'),
                    conf.asAbsoluteUri('web/res/')
                ]
            }
        );

        JsdosPanel.currentPanel = new JsdosPanel(panel, conf);
    }

    public static revive(panel: vscode.WebviewPanel, conf: Config): void {
        JsdosPanel.currentPanel = new JsdosPanel(panel, conf);
    }

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public jsdosStatus: JSDosSTATUS | boolean = false;
    /**record all message from this pannel */
    public allWdosboxStdout: string[] = [];
    public onWdosboxStdout: ((val: string, all: string[]) => void) = () => undefined;

    private constructor(panel: vscode.WebviewPanel, private conf: Config) {
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
                    case 'stdout':
                        this.allWdosboxStdout.push(message.value);
                        this.onWdosboxStdout(message.value, this.allWdosboxStdout);
                        break;
                }
            },
            null,
            this._disposables
        );
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
        const asWeb = (str: string): vscode.Uri => {
            const fullpath = this.conf.asAbsoluteUri(str);
            return webview.asWebviewUri(fullpath);
        };
        return `<!doctype html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
        html,
        body,
        #jsdos {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
        }
    </style>
    <script src="${asWeb("/node_modules/emulators/dist/emulators.js")}"></script>
    <script src="${asWeb("/node_modules/emulators-ui/dist/emulators-ui.js")}"></script>
    <link rel="stylesheet" href="${asWeb("/node_modules/emulators-ui/dist/emulators-ui.css")}">
</head>

<body>
    <div class="layout">
        <div id="root" style="width: 100%; height: 100%;"></div>
    </div>
    <script>
        emulators.pathPrefix = "${asWeb("/node_modules/emulators/dist/")}";
        bundlePath="${asWeb("web/res/test.jsdos")}"
    </script>
    <script src='${asWeb("web/dist/index.js")}'></script>
</body>

</html>`;
    }
}
