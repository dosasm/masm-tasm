import { DosConfig } from "../dos/bundle/dos-conf";
import { DirectSound, CommandInterface, NetworkType, BackendOptions } from "../emulators";
import { CommandInterfaceEventsImpl } from "../impl/ci-impl";

export type ClientMessage =
    "wc-install" |
    "wc-run" |
    "wc-pack-fs-to-bundle" |
    "wc-add-key" |
    "wc-mouse-move" |
    "wc-mouse-button" |
    "wc-mouse-sync" |
    "wc-exit" |
    "wc-sync-sleep" |
    "wc-pause" |
    "wc-resume" |
    "wc-mute" |
    "wc-unmute" |
    "wc-connect" |
    "wc-disconnect";

export type ServerMessage =
    "ws-extract-progress" |
    "ws-ready" |
    "ws-server-ready" |
    "ws-frame-set-size" |
    "ws-update-lines" |
    "ws-log" |
    "ws-warn" |
    "ws-err" |
    "ws-stdout" |
    "ws-exit" |
    "ws-persist" |
    "ws-sound-init" |
    "ws-sound-push" |
    "ws-config" |
    "ws-sync-sleep" |
    "ws-connected" |
    "ws-disconnected";

export type MessageHandler = (name: ServerMessage, props: { [key: string]: any }) => void;

export interface TransportLayer {
    sessionId: string;
    sendMessageToServer(name: ClientMessage, props?: { [key: string]: any }): void;
    initMessageHandler(handler: MessageHandler): void;
    exit?: () => void;
}

export interface FrameLine {
    start: number;
    heapu8: Uint8Array;
}

export class CommandInterfaceOverTransportLayer implements CommandInterface {
    private startedAt = Date.now();
    private frameWidth = 0;
    private frameHeight = 0;
    private rgb: Uint8Array | null = null;
    private rgba: Uint8Array | null = null;
    private freq = 0;

    private bundles?: Uint8Array[];
    private transport: TransportLayer;
    private ready: (err: Error | null) => void;

    private persistPromise?: Promise<Uint8Array>;
    private persistResolve?: (bundle: Uint8Array) => void;

    private exitPromise?: Promise<void>;
    private exitResolve?: () => void;

    private eventsImpl = new CommandInterfaceEventsImpl();

    private keyMatrix: { [keyCode: number]: boolean } = {};

    private configPromise: Promise<DosConfig>;
    private configResolve: (config: DosConfig) => void = () => {/**/};
    private panicMessages: string[] = [];

    private connectPromise: Promise<void> | null = null;
    private connectResolve: () => void = () => {/**/};
    private connectReject: () => void = () => {/**/};

    private disconnectPromise: Promise<void> | null = null;
    private disconnectResolve: () => void = () => {/**/};

    public sharedMemory?: SharedArrayBuffer;
    public directSound?: DirectSound;
    public options: BackendOptions;

    constructor(bundles: Uint8Array[],
        transport: TransportLayer,
        ready: (err: Error | null) => void,
        options: BackendOptions) {
        this.options = options;
        this.bundles = bundles;
        this.transport = transport;
        this.ready = ready;
        this.configPromise = new Promise<DosConfig>((resolve) => this.configResolve = resolve);
        this.transport.initMessageHandler(this.onServerMessage.bind(this));
    }

    private sendClientMessage(name: ClientMessage, props?: { [key: string]: any }) {
        props = props || {};
        props.sessionId = props.sessionId || this.transport.sessionId;
        this.transport.sendMessageToServer(name, props);
    }

    private onServerMessage(name: ServerMessage, props: { [key: string]: any }) {
        if (name === undefined || name.length < 3 ||
            name[0] !== "w" || name[1] !== "s" || name[2] !== "-") {
            return;
        }

        if (props === undefined || props.sessionId !== this.transport.sessionId) {
            return;
        }

        switch (name) {
            case "ws-ready": {
                this.sharedMemory = props.sharedMemory;
                this.sendClientMessage("wc-run", {
                    bundles: this.bundles,
                });
                delete this.bundles;
            } break;
            case "ws-server-ready": {
                if (this.panicMessages.length > 0) {
                    if (this.transport.exit !== undefined) {
                        this.transport.exit();
                    }
                    this.ready(new Error(JSON.stringify(this.panicMessages)));
                } else {
                    this.ready(null);
                }
                delete (this as any).ready;
            } break;
            case "ws-frame-set-size": {
                this.onFrameSize(props.width, props.height);
            } break;
            case "ws-update-lines": {
                this.onFrameLines(props.lines, props.rgba);
            } break;
            case "ws-exit": {
                this.onExit();
            } break;
            case "ws-log": {
                // eslint-disable-next-line
                this.onLog(props.tag, props.message);
            } break;
            case "ws-warn": {
                // eslint-disable-next-line
                this.onWarn(props.tag, props.message);
            } break;
            case "ws-err": {
                // eslint-disable-next-line
                this.onErr(props.tag, props.message);
            } break;
            case "ws-stdout": {
                this.onStdout(props.message);
            } break;
            case "ws-persist": {
                this.onPersist(props.bundle);
            } break;
            case "ws-sound-init": {
                this.onSoundInit(props.freq, props.directSound);
            } break;
            case "ws-sound-push": {
                this.onSoundPush(props.samples);
            } break;
            case "ws-config": {
                this.onConfig(JSON.parse(props.content));
            } break;
            case "ws-sync-sleep": {
                this.sendClientMessage("wc-sync-sleep", props);
            } break;
            case "ws-connected": {
                this.connectResolve();
                this.connectPromise = null;
                this.connectResolve = () => {/**/};
                this.connectReject = () => {/**/};
                this.eventsImpl.fireNetworkConnected(props.networkType, props.address, props.port);
            } break;
            case "ws-disconnected": {
                if (this.connectPromise !== null) {
                    this.connectReject();
                    this.connectPromise = null;
                    this.connectResolve = () => {/**/};
                    this.connectReject = () => {/**/};
                } else {
                    this.disconnectResolve();
                    this.disconnectPromise = null;
                    this.disconnectResolve = () => {/**/};
                }
                this.eventsImpl.fireNetworkDisconnected(props.networkType);
            } break;
            case "ws-extract-progress": {
                if (this.options.onExtractProgress) {
                    this.options.onExtractProgress(props.index, props.file, props.extracted, props.count);
                }
            } break;
            default: {
                // eslint-disable-next-line
                console.log("Unknown server message (ws):", name);
            } break;
        }
    }

    private onConfig(config: DosConfig) {
        this.configResolve(config);
    }

    private onFrameSize(width: number, height: number) {
        if (this.frameWidth === width && this.frameHeight === height) {
            return;
        }

        this.frameWidth = width;
        this.frameHeight = height;
        if (this.sharedMemory === undefined) {
            this.rgb = new Uint8Array(width * height * 3);
        }
        this.eventsImpl.fireFrameSize(width, height);
    }

    private onFrameLines(lines: FrameLine[], rgbaPtr: number) {
        if (this.sharedMemory !== undefined) {
            this.rgba = new Uint8Array(
                this.sharedMemory, rgbaPtr,
                this.frameWidth * this.frameHeight * 4,
            );
        } else {
            for (const line of (lines as FrameLine[])) {
                (this.rgb as Uint8Array).set(line.heapu8, line.start * this.frameWidth * 3);
            }
        }

        this.eventsImpl.fireFrame(this.rgb, this.rgba);
    }

    private onSoundInit(freq: number, directSound: DirectSound | undefined) {
        this.freq = freq;
        this.directSound = directSound;
        if (this.directSound !== undefined) {
            for (let i = 0; i < this.directSound.ringSize; ++i) {
                this.directSound.buffer[i] = new Float32Array(this.directSound.buffer[i]);
            }
        }
    }

    private onSoundPush(samples: Float32Array) {
        this.eventsImpl.fireSoundPush(samples);
    }

    private onLog(tag: string, message: string) {
        this.eventsImpl.fireMessage("log", "[" + tag + "]" + message);
    }

    private onWarn(tag: string, message: string) {
        this.eventsImpl.fireMessage("warn", "[" + tag + "]" + message);
    }

    private onErr(tag: string, message: string) {
        if (tag === "panic") {
            this.panicMessages.push(message);
            console.error("[" + tag + "]" + message);
        }
        this.eventsImpl.fireMessage("error", "[" + tag + "]" + message);
    }

    private onStdout(message: string) {
        this.eventsImpl.fireStdout(message);
    }

    public config() {
        return this.configPromise;
    }

    public width() {
        return this.frameWidth;
    }

    public height() {
        return this.frameHeight;
    }

    public soundFrequency() {
        return this.freq;
    }

    public screenshot(): Promise<ImageData> {
        if (this.rgb !== null || this.rgba !== null) {
            const rgba = new Uint8ClampedArray(this.frameWidth * this.frameHeight * 4);
            const frame = (this.rgb !== null ? this.rgb : this.rgba) as Uint8Array;

            let frameOffset = 0;
            let rgbaOffset = 0;

            while (rgbaOffset < rgba.length) {
                rgba[rgbaOffset++] = frame[frameOffset++];
                rgba[rgbaOffset++] = frame[frameOffset++];
                rgba[rgbaOffset++] = frame[frameOffset++];
                rgba[rgbaOffset++] = 255;

                if (frame.length === rgba.length) {
                    frameOffset++;
                }
            }

            return Promise.resolve(new ImageData(rgba, this.frameWidth, this.frameHeight));
        } else {
            return Promise.reject(new Error("No frame received"));
        }
    }

    public simulateKeyPress(...keyCodes: number[]) {
        const timeMs = Date.now() - this.startedAt;
        keyCodes.forEach((keyCode) => this.addKey(keyCode, true, timeMs));
        keyCodes.forEach((keyCode) => this.addKey(keyCode, false, timeMs + 16));
    }

    public sendKeyEvent(keyCode: number, pressed: boolean) {
        this.addKey(keyCode, pressed, Date.now() - this.startedAt);
    }

    // public for test
    public addKey(keyCode: number, pressed: boolean, timeMs: number) {
        const keyPressed = this.keyMatrix[keyCode] === true;
        if (keyPressed === pressed) {
            return;
        }
        this.keyMatrix[keyCode] = pressed;
        this.sendClientMessage("wc-add-key", { key: keyCode, pressed, timeMs });
    }

    public sendMouseMotion(x: number, y: number) {
        this.sendClientMessage("wc-mouse-move", { x, y, relative: false, timeMs: Date.now() - this.startedAt });
    }

    public sendMouseRelativeMotion(x: number, y: number) {
        this.sendClientMessage("wc-mouse-move", { x, y, relative: true, timeMs: Date.now() - this.startedAt });
    }

    public sendMouseButton(button: number, pressed: boolean) {
        this.sendClientMessage("wc-mouse-button", { button, pressed, timeMs: Date.now() - this.startedAt });
    }

    public sendMouseSync() {
        this.sendClientMessage("wc-mouse-sync", { timeMs: Date.now() - this.startedAt });
    }


    public persist(): Promise<Uint8Array> {
        if (this.persistPromise !== undefined) {
            return this.persistPromise;
        }


        const persistPromise = new Promise<Uint8Array>((resolve) => this.persistResolve = resolve);
        this.persistPromise = persistPromise;

        this.sendClientMessage("wc-pack-fs-to-bundle");

        return persistPromise;
    }

    private onPersist(bundle: Uint8Array) {
        if (this.persistResolve) {
            this.persistResolve(bundle);
            delete this.persistPromise;
            delete this.persistResolve;
        }
    }

    public pause() {
        this.sendClientMessage("wc-pause");
    }

    public resume() {
        this.sendClientMessage("wc-resume");
    }

    public mute() {
        this.sendClientMessage("wc-mute");
    }

    public unmute() {
        this.sendClientMessage("wc-unmute");
    }

    public exit(): Promise<void> {
        if (this.exitPromise !== undefined) {
            return this.exitPromise;
        }
        this.exitPromise = new Promise<void>((resolve) => this.exitResolve = resolve);
        this.exitPromise.then(() => {
            this.events().fireExit();
        });

        this.resume();
        this.sendClientMessage("wc-exit");

        return this.exitPromise;
    }

    private onExit() {
        if (this.transport.exit !== undefined) {
            this.transport.exit();
        }
        if (this.exitResolve) {
            this.exitResolve();
            delete this.exitPromise;
            delete this.exitResolve;
        }
    }

    public events() {
        return this.eventsImpl;
    }

    public networkConnect(networkType: NetworkType, address: string, port: number): Promise<void> {
        if (this.connectPromise !== null || this.disconnectPromise !== null) {
            return Promise.reject(new Error("Already prefoming connection or disconnection..."));
        }

        this.connectPromise = new Promise<void>((resolve, reject) => {
            if (!address.startsWith("wss://") && !address.startsWith("ws://")) {
                address = (window.location.protocol === "http:" ? "ws://" : "wss://") + address;
            }

            this.connectResolve = resolve;
            this.connectReject = reject;
            this.sendClientMessage("wc-connect", {
                networkType,
                address,
                port,
            });
        });
        return this.connectPromise;
    }

    public networkDisconnect(networkType: NetworkType): Promise<void> {
        if (this.connectPromise !== null || this.disconnectPromise !== null) {
            return Promise.reject(new Error("Already prefoming connection or disconnection..."));
        }

        this.disconnectPromise = new Promise<void>((resolve) => {
            this.disconnectResolve = resolve;

            this.sendClientMessage("wc-disconnect", {
                networkType,
            });
        });
        return this.disconnectPromise;
    }
}
