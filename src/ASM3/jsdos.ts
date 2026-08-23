import { CommandInterface } from "@xsro/emulators";
import { FsNode } from "@xsro/emulators";
import * as vscode from "vscode";
import { createTerminal } from "./jsdos/main";
import { logger } from "../utils/logger";



interface MountFolder {
    from: vscode.Uri,
    syncToEmu: boolean,
    syncFromEmu: boolean,
    syncFromEmuPeriod: number,
    syncFromEmuPeriodId?: NodeJS.Timeout
}

function flattenFSNodes(parent: string, nodes: FsNode[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const n of nodes) {
        if (n.nodes) {
            Object.assign(result, flattenFSNodes(parent + "/" + n.name, n.nodes));
        } else if (n.name && n.size) {
            result[parent + "/" + n.name] = n.size;
        }
    }
    return result;
}



export class JSdosCi {
    // The mount is a key-value map, key is the disk name in the enumlator and value is the information of the folder and files
    mount: Record<string, MountFolder> = {};
    public stdout = "";
    public onStdout: Record<string, (data: string, stdout: string) => void> = {};
    public lastFrameTimeMs: number = 0;
    /** Whether the CI has exited */
    public get exited(){
        return this._ci.exited;
    }
    /** Most recent frame data, used to restore display when switching to a exited CI */
    public lastFrame: {
        rgb: Uint8Array | null
        rgba: Uint8Array | null
        width: number
        height: number
    } | null = null;
    public get ci() {
        return this._ci;
    }

    static global_id = 0;
    id = 0;
    time: Date;
    constructor(private _ci: CommandInterface) {
        this.time = new Date();
        this.id = JSdosCi.global_id;
        JSdosCi.global_id++;
        this.ci.events().onStdout((data) => {
            this.stdout += data;
            for (const l in this.onStdout) {
                this.onStdout[l](data, this.stdout);
            }
        });
    }

    addMount(disk: string, m: MountFolder) {
        if (this.mount[disk]) {
            if (this.mount[disk].syncFromEmuPeriodId) {
                clearInterval(this.mount[disk].syncFromEmuPeriodId);
            }
        }
        m.syncFromEmuPeriodId = setInterval(async () => {
            const nodes = await this._ci.fsTree();
            const files = flattenFSNodes("/", [nodes]);
        }, m.syncFromEmuPeriod);
    }

    terminal() {
        return createTerminal(this._ci);
    }

}


export class CIManager {
    public static current: CIManager | null = null;
    public static createOrGet(context: vscode.ExtensionContext) {
        if (CIManager.current === null) {
            CIManager.current = new CIManager(context);
        }
        return CIManager.current;
    }
    private _cis: JSdosCi[] = [];
    private panel: vscode.WebviewPanel | undefined;
    webviewingId = 0;
    webviewingMute = false;

    // Frame rate throttling: limits postMessage frequency to avoid IPC congestion
    private lastFramePostTime = 0;
    private readonly MAX_FRAME_INTERVAL = 33; // ~30fps

    public get last() {
        return this._cis[this._cis.length - 1];
    }

    public ci(idx?: number) {
        if (idx === undefined) {
            return this._cis[this.webviewingId];
        }
        if (typeof idx === "number") {
            return this._cis[idx];
        }
    }

    public ciInfomation(html = false) {
        if (html) {
            const ciSelectInnerHTML = this._cis.map((o, idx) => {
                return `<option ${idx === this.webviewingId ? "selected" : ""}>${o.id} ${o.ci.exited ? "exited" : "running"}</option>`;
            }).join("\n");
            return ciSelectInnerHTML;
        }
        else {
            return this._cis.map(ci => {
                return { id: ci.id, time: ci.time, lastFrameTimeMs: ci.lastFrameTimeMs, exited: ci.ci.exited };
            });
        }
    }

    /** Clean up a specified CI and its associated resources */
    private removeCI(idx: number) {
        const w = this._cis[idx];
        if (!w) return;
        // Clean up onStdout callbacks to prevent memory leaks
        delete w.onStdout["ASM3/run"];
        // Remove from array
        this._cis.splice(idx, 1);
        // Adjust webviewingId: ensure it stays in bounds
        if (this._cis.length === 0) {
            this.webviewingId = 0;
        } else if (this.webviewingId >= this._cis.length) {
            this.webviewingId = this._cis.length - 1;
        }
        // Notify webview that the CI list has changed
        this._pushCIList();
        // Sync selection state: webviewingId may have changed, ensuring the webview highlight is correct
        const curCI = this._cis[this.webviewingId];
        this.panel?.webview?.postMessage({
            name: "switch-ci",
            ciIdx: this.webviewingId,
        });
        this._pushCIList();
    }

    /** Push the latest CI list to the webview (event-driven, replaces polling) */
    private _pushCIList() {
        if (this.panel) {
            this.panel.webview.postMessage({
                name: "ci-list-updated",
                value: this.ciInfomation()
            });
        }
    }

    addCI(ci: CommandInterface) {
        const w = new JSdosCi(ci);
        this._cis.push(w);

        const events = ci.events();

        events.onExit(() => {
            this._pushCIList();
        });

        events.onFrame((rgb, rgba) => {
            w.lastFrameTimeMs = Date.now();
            // Always save the latest frame, for restoring display when switching to a exited CI
            w.lastFrame = { rgb, rgba, width: ci.width(), height: ci.height() };

            if (w.id === this.webviewingId) {
                // Frame rate throttling: only send when the interval is sufficient, reducing IPC messages
                const now = Date.now();
                if (now - this.lastFramePostTime >= this.MAX_FRAME_INTERVAL) {
                    this.lastFramePostTime = now;
                    this.panel?.webview?.postMessage({
                        name: "frame",
                        rgb,
                        date: w.lastFrameTimeMs,
                        width: ci.width(),
                        height: ci.height(),
                        ciIdx: this.webviewingId
                    });
                }
            }
        });
        events.onSoundPush(samples => {
            if (w.id === this.webviewingId && !this.webviewingMute) {
                this.panel?.webview?.postMessage({
                    name: "soundPush",
                    samples,
                    date: Date.now(),
                    soundFrequency: ci.soundFrequency(),
                    ciIdx: this.webviewingId
                });
            }
        });

        // Notify webview that the CI list has changed
        this._pushCIList();
    }

    constructor(public context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('masm-tasm.show-jsdos', () => {
            this.panel = show_webview(this, context);
            this.panel.onDidDispose(() => this.panel = undefined);
        }));
    }

    showWebview(id?: number) {
        if (id === undefined) {
            this.webviewingId = this._cis.length - 1;
        }
        else {
            this.webviewingId = id;
        }

        // Restore the current CI
        const curCI = this._cis[this.webviewingId];

        if (!this.panel) {
            this.panel = show_webview(this, this.context);
            this.panel.onDidDispose(() => this.panel = undefined);
        }
        if (!this.panel.visible) {
            this.panel.reveal();
        }

        this.panel?.webview?.postMessage({
            name: "switch-ci",
            ciIdx: this.webviewingId,
        });

        // If there is a cached last frame, send it immediately for display
        if (curCI?.lastFrame) {
            this.panel?.webview?.postMessage({
                name: "frame",
                rgb: curCI.lastFrame.rgb,
                date: curCI.lastFrameTimeMs,
                width: curCI.lastFrame.width,
                height: curCI.lastFrame.height,
                ciIdx: this.webviewingId
            });
        }

        this._pushCIList();
    }
}

function show_webview(cis: CIManager, context: vscode.ExtensionContext) {
    const viewColumn: vscode.ViewColumn | undefined = vscode.workspace
        .getConfiguration("masm-tasm")
        .get("jsdosWeb.viewColumn");
    const panel = vscode.window.createWebviewPanel(
        "jsdos pannel",
        "jsdos" + new Date().toLocaleTimeString(),
        viewColumn ?? vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: false,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, "dist"),
                vscode.Uri.joinPath(context.extensionUri, "src"),
                vscode.Uri.joinPath(context.extensionUri, "resources"),
            ],
        }
    );

    const asWeb = (str: string): string => {
        const fullpath = vscode.Uri.joinPath(context.extensionUri, str);
        const uri = panel.webview.asWebviewUri(fullpath);
        const link = uri.toString(true);
        return link;
    };



    panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" type="text/css" href="${asWeb("resources/webview.css")}">
</head>
<body>
    <div class="toolbar">
        <label class="toolbar-item" title="Pause/Resume emulation">
            <input type="checkbox" id="ci-pause">
            <span>Pause</span>
        </label>
        <label class="toolbar-item" title="Mute/Unmute sound">
            <input type="checkbox" id="ui-mute">
            <span>Mute</span>
        </label>
        <div class="toolbar-separator"></div>
        <select id="ci-list" title="Select CI instance">${cis.ciInfomation(true)}</select>
        <span id="show" class="toolbar-status">loading</span>
    </div>
    <div class="canvas-container">
        <canvas id="display"></canvas>
        <div class="canvas-overlay" id="canvas-overlay">waiting for frame</div>
    </div>
    <div class="soft-keyboard">
        <button class="key-btn esc" data-key="Escape" id="key-esc">ESC</button>
        <button class="key-btn modifier" data-key="Shift" id="key-shift">Shift</button>
        <button class="key-btn modifier" data-key="Control" id="key-ctrl">Ctrl</button>
        <button class="key-btn modifier" data-key="Alt" id="key-alt">Alt</button>
        <button class="key-btn modifier" data-key="CapsLock" id="key-capslock">CapsLock</button>
        <button class="key-btn modifier" data-key="Tab" id="key-tab">Tab</button>
    </div>
    <div id="ci-stat" class="status-bar">loading stats</div>
    <script src="${asWeb("dist/index.js")}"></script>
</body>
</html>`;

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        async (message) => {
            const { command, args } = message;
            switch (command) {
                case "change-viewing-id":
                    cis.webviewingId = args[0];
                    cis.showWebview(cis.webviewingId);
                    panel.webview.postMessage({
                        command,
                        uid: message.uid,
                        value: cis.webviewingId
                    });
                    break;
                case "mute-sound":
                    cis.webviewingMute = args[0];
                    break;
                case "get-ci-list":
                    panel.webview.postMessage({
                        command,
                        uid: message.uid,
                        value: cis.ciInfomation()
                    });
                    break;
                case "send-ci-command":
                    const { ciId, ciCommand, ciArgs } = message;
                    let ci = cis.ci(ciId);
                    // if (ciCommand !== "asyncifyStats") {
                    //     logger.channel("ci-command " + ciCommand + " " + JSON.stringify(ciArgs));
                    // }
                    if (ci) {
                        try {
                            const target = ci.ci as any;
                            const result = typeof target[ciCommand] === 'function'
                                ? await target[ciCommand](...ciArgs)
                                : target[ciCommand];
                            panel.webview.postMessage({
                                command,
                                uid: message.uid,
                                value: result
                            });
                        } catch (error) {
                            panel.webview.postMessage({
                                command,
                                uid: message.uid,
                                error
                            });
                        }
                    }

                    break;
            }
        },
        undefined,
        context.subscriptions
    );

    return panel;
}