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
    mount: Record<string, MountFolder> = {}
    public stdout = ""
    public onStdout: Record<string, (data: string, stdout: string) => void> = {}
    public lastFrameTimeMs: number = 0
    /** 是否已停止（由 onExit 事件设置） */
    public stopped: boolean = false
    /** 最近一帧数据，用于切换到已停止的 CI 时恢复显示 */
    public lastFrame: {
        rgb: Uint8Array | null
        rgba: Uint8Array | null
        width: number
        height: number
    } | null = null
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
        this.ci.events().onStdout((data) => {
            this.stdout += data;
            for (const l in this.onStdout) {
                this.onStdout[l](data, this.stdout)
            }
        })
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
    webviewingMute = false;

    // 帧率节流：限制 postMessage 频率，避免 IPC 拥塞
    private lastFramePostTime = 0;
    private readonly MAX_FRAME_INTERVAL = 33; // ~30fps

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
                return `<option ${idx === this.webviewingId ? "selected" : ""}>${o.id} ${o.stopped ? "stopped" : "running"}</option>`
            }).join("\n")
            return ciSelectInnerHTML
        }
        else {
            return this._cis.map(ci => {
                return { id: ci.id, time: ci.time, lastFrameTimeMs: ci.lastFrameTimeMs, stopped: ci.stopped }
            })
        }

    }

    /** 清理指定 CI 及其相关资源 */
    private removeCI(idx: number) {
        const w = this._cis[idx]
        if (!w) return
        // 清理 onStdout 回调，防止内存泄漏
        delete w.onStdout["ASM3/run"]
        // 从数组中移除
        this._cis.splice(idx, 1)
        // 调整 webviewingId：确保不越界
        if (this._cis.length === 0) {
            this.webviewingId = 0
        } else if (this.webviewingId >= this._cis.length) {
            this.webviewingId = this._cis.length - 1
        }
        // 通知 webview CI 列表已变更
        this._pushCIList()
        // 同步选中状态：webviewingId 可能已变化，确保 webview 高亮正确
        const curCI = this._cis[this.webviewingId]
        this.panel?.webview?.postMessage({
            name: "switch-ci",
            ciIdx: this.webviewingId,
            stopped: curCI?.stopped ?? true
        })
    }

    /** 向 webview 推送最新的 CI 列表（事件驱动，替代轮询） */
    private _pushCIList() {
        if (this.panel) {
            this.panel.webview.postMessage({
                name: "ci-list-updated",
                value: this.ciInfomation()
            })
        }
    }

    addCI(ci: CommandInterface) {
        const w = new JSdosCi(ci)
        this._cis.push(w);


        const events = ci.events()
        let frameTimeout: ReturnType<typeof setTimeout> | null = null
        const FRAME_TIMEOUT_MS = 5000 // 5s 无帧则判定为停止

        const markStopped = (reason: string) => {
            if (w.stopped) return // 防止重复触发
            if (frameTimeout) clearTimeout(frameTimeout)
            console.log(`[jsdos] CI #${w.id} 停止 (${reason}) 时间=${new Date().toISOString()}`)
            w.stopped = true
            this._pushCIList()
            // 同步选中状态
            this.panel?.webview?.postMessage({
                name: "switch-ci",
                ciIdx: this.webviewingId,
                stopped: true
            })
        }


        events.onExit(() => markStopped('onExit 事件触发'))
        events.onUnload(async () => markStopped('onUnload 事件触发'))

        events.onFrame((rgb, rgba) => {
            w.lastFrameTimeMs = Date.now()
            // 始终保存最新帧，便于切换到已停止的 CI 时恢复显示
            w.lastFrame = { rgb, rgba, width: ci.width(), height: ci.height() }

            if (w.id === this.webviewingId) {
                // 帧率节流：仅在间隔足够时发送，减少 IPC 消息
                const now = Date.now()
                if (now - this.lastFramePostTime >= this.MAX_FRAME_INTERVAL) {
                    this.lastFramePostTime = now
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
        })
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
        })

        // 通知 webview CI 列表已变更
        this._pushCIList()
    }

    constructor(public context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('masm-tasm.show-jsdos', () => {
            this.panel = show_webview(this, context)
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

        // 恢复当前 CI
        const curCI = this._cis[this.webviewingId]

        if (!this.panel) {
            this.panel = show_webview(this, this.context)
            this.panel.onDidDispose(() => this.panel = undefined)
        }
        if (!this.panel.visible) {
            this.panel.reveal()
        }

        this.panel?.webview?.postMessage({
            name: "switch-ci",
            ciIdx: this.webviewingId,
            stopped: this._cis[this.webviewingId].stopped
        })

        // 如果有缓存的最后一帧，立即发送以便显示
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
                    cis.showWebview(cis.webviewingId)
                    panel.webview.postMessage({
                        command,
                        uid: message.uid,
                        value: cis.webviewingId
                    })
                    break
                case "mute-sound":
                    cis.webviewingMute = args[0];
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
                    if (ciCommand !== "asyncifyStats") {
                        logger.channel("ci-command " + ciCommand + " " + JSON.stringify(ciArgs));
                    }
                    if (ci) {
                        try {
                            const result = await (ci.ci as any)[ciCommand](...ciArgs);
                            panel.webview.postMessage({
                                command,
                                uid: message.uid,
                                value: result
                            })
                        } catch (error) {
                            panel.webview.postMessage({
                                command,
                                uid: message.uid,
                                error
                            })
                        }
                    }

                    break
            }
        },
        undefined,
        context.subscriptions
    );

    return panel;
}