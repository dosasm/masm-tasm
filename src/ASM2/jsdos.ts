import { CommandInterface } from "emulators";
import { FsNode } from "emulators/build/src/protocol/protocol";
import * as vscode from "vscode";
import { createTerminal } from "./jsdos/main";



interface MountFolder {
    from: vscode.Uri,
    syncToEmu: boolean,
    syncFromEmu: boolean,
    syncFromEmuPeriod: number,
    syncFromEmuPeriodId?: NodeJS.Timeout
}

function flattenFSNodes(parent: string, nodes: FsNode[]) {
    const result: Record<string, number> = {};
    for (const n of nodes) {
        if (n.nodes) {
            flattenFSNodes(parent + "/" + n.name, n.nodes)
        } else if (n.name && n.size) {
            result[parent + "/" + n.name] = n.size
        }
    }
    return result;
}



export class JSdosCi {
    // The mount is a key-value map, key is the disk name in the enumlator and value is the information of the folder and files
    mount: Record<string, MountFolder> = {}
    public lastFrameTimeMs: number = 0
    public get ci() {
        return this._ci
    }

    static global_id = 0
    id = 0;
    time: Date;
    constructor(private _ci: CommandInterface) {
        this.time = new Date();
        this.id = JSdosCi.global_id;
        JSdosCi.global_id++;
    }

    addMount(disk: string, m: MountFolder) {
        if (this.mount[disk]) {
            if (this.mount[disk].syncFromEmuPeriodId) {
                clearInterval(this.mount[disk].syncFromEmuPeriodId)
            }
        }
        m.syncFromEmuPeriodId = setInterval(async () => {
            const nodes = await this._ci.fsTree();
            const files = flattenFSNodes("/", [nodes])
        }, m.syncFromEmuPeriod);
    }

    terminal() {
        return createTerminal(this._ci)
    }

}


export class CIManager {
    public static current: CIManager | null = null
    public static createOrGet(context: vscode.ExtensionContext) {
        if (CIManager.current === null) {
            CIManager.current = new CIManager(context)
        }
        return CIManager.current
    }
    private _cis: JSdosCi[] = []
    private panel: vscode.WebviewPanel | undefined
    webviewingId = 0;

    public get last() {
        return this._cis[this._cis.length - 1]
    }

    public ci(idx?: number) {
        if (idx === undefined) {
            return this._cis[this.webviewingId]
        }
        if (typeof idx === "number") {
            return this._cis[idx]
        }
    }

    public ciInfomation(html = false) {
        if (html) {
            const ciSelectInnerHTML = this._cis.map((o, idx) => {
                let alive = Date.now() - o.lastFrameTimeMs < 2000 // assume the emulator is working if last frame data is transfered within 2s
                return `<option ${idx === this.webviewingId ? "selected" : ""}>${o.id} ${alive ? "running" : "stopped"}</option>`
            }).join("\n")
            return ciSelectInnerHTML
        }
        else {
            return this._cis.map(ci => {
                return { id: ci.id, time: ci.time, lastFrameTimeMs: ci.lastFrameTimeMs }
            })
        }

    }

    addCI(ci: CommandInterface) {
        const w = new JSdosCi(ci)
        this._cis.push(w);
        w.ci.events().onFrame((rgb, rgba) => {
            w.lastFrameTimeMs = Date.now()
            if (w.id === this.webviewingId) {
                this.panel?.webview?.postMessage({ name: "frame", rgb, date: Date.now(), width: ci.width(), height: ci.height(),ciIdx:this.webviewingId });
            }
        })
    }
    constructor(public context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('masm-tasm.show-jsdos', () => {
            this.panel = show_webview(this, this.webviewingId, context)
            this.panel.onDidDispose(() => this.panel = undefined)
        }))
    }

    showWebview(id?: number) {
        if (id === undefined) {
            this.webviewingId = this._cis.length - 1;
        }
        else {
            this.webviewingId = id;
        }
        if (!this.panel) {
            this.panel = show_webview(this, this.webviewingId, this.context)
            this.panel.onDidDispose(() => this.panel = undefined)
        }
        if (!this.panel.visible) {
            this.panel.reveal()
        }
    }
}

function show_webview(cis: CIManager, webviewingId: number, context: vscode.ExtensionContext) {
    const viewColumn: vscode.ViewColumn | undefined = vscode.workspace
        .getConfiguration("vscode-dosbox")
        .get("jsdosWeb.viewColumn");
    const panel = vscode.window.createWebviewPanel(
        "jsdos pannel",
        "jsdos" + new Date().toLocaleTimeString(),
        viewColumn ?? vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            // retainContextWhenHidden: true,
            //hint: the below settings should be folder's uri
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, "dist"),
                vscode.Uri.joinPath(context.extensionUri, "src"),
            ],
        }
    );

    const asWeb = (str: string): string => {
        const fullpath = vscode.Uri.joinPath(context.extensionUri, str);
        const uri = panel.webview.asWebviewUri(fullpath);
        const link = uri.toString(true);
        return link;
    };



    panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        </head>
            
        <body>
        <input type="checkbox" id="debug">pause</input>
        <input type="checkbox" id="sound">sound</input>
        <select id="ci-list">
        ${cis.ciInfomation(true)}
        </select>
        <span id="show">loading</span>
        <canvas id="display"></canvas>
        <script src='${asWeb("dist/index.js")}'></script>
        <p id="ci-stat">loading stats</p>
        </body>
        </html>`;

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        async (message) => {
            const { command, args } = message;
            switch (command) {
                case "change-viewing-id":
                    cis.webviewingId = args[0];
                    break
                case "get-ci-list":
                    panel.webview.postMessage({
                        command,
                        uid: message.uid,
                        value: cis.ciInfomation()
                    })
                    break
                case "send-ci-command":
                    const { ciId, ciCommand, ciArgs } = message;
                    let ci = cis.ci(ciId);
                    const result = await (ci as any)[ciCommand](...ciArgs);
                    panel.webview.postMessage({
                        command,
                        uid: message.uid,
                        value: result
                    })
                    break
            }
        },
        undefined,
        context.subscriptions
    );

    return panel;
}