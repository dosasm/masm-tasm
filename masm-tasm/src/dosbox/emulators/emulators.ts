import DosBundle from "./dos/bundle/dos-bundle";
import emulatorsImpl from "./impl/emulators-impl";

import { DosConfig } from "./dos/bundle/dos-conf";
import { TransportLayer } from "./protocol/protocol";

/* eslint-disable no-unused-vars */
export enum NetworkType {
    NETWORK_DOSBOX_IPX = 0,
}
/* eslint-enable no-unused-vars */

export interface BackendOptions {
    onExtractProgress?: (bundleIndex: number, file: string, extracted: number, total: number) => void;
}

export interface Emulators {
    // * pathPrefix - by default emulators will load wasm modules relatively from current path,
    // you should specify path prefix if you want to load them from different place
    pathPrefix: string;

    // * version - version of emulators build
    version: string;

    // * wdosboxJs - a file name to load
    wdosboxJs: string;

    // * dosBundle - create empty DosBundle
    dosBundle: () => Promise<DosBundle>;

    // * dosboxNode - createDOSBOX Node emulator backend
    dosboxNode: (bundle: Uint8Array | Uint8Array[], options?: BackendOptions) => Promise<CommandInterface>;

    // * dosboxDirect - create DOSBOX Direct emulator backend
    dosboxDirect: (bundle: Uint8Array | Uint8Array[], options?: BackendOptions) => Promise<CommandInterface>;

    // * dosboxWorker - create DOSBOX Worker emulator backend
    dosboxWorker: (bundle: Uint8Array | Uint8Array[], options?: BackendOptions) => Promise<CommandInterface>;

    // * janus - create janus backend for given url
    janus: (restUrl: string) => Promise<CommandInterface>;

    // * backend - create abstract emulation backend by given TransportLayer
    backend: (bundle: Uint8Array | Uint8Array[], transportLayer: TransportLayer,
        options?: BackendOptions) => Promise<CommandInterface>;
}

export interface DirectSound {
    ringSize: number,
    bufferSize: number,
    buffer: Float32Array[],
}

export interface CommandInterface {
    // * get bundle config
    config: () => Promise<DosConfig>;

    // * current render buffer width
    height: () => number;

    // * current render buffer height
    width: () => number;

    // * sound frequency
    soundFrequency: () => number;

    // * `screenshot()` - get screnshot of canvas as ImageData
    screenshot: () => Promise<ImageData>;

    // * `pause()` - pause emulation (also mute all sounds)
    pause: () => void;

    // * `resume()` - resume emulation (also unmute all sounds)
    resume: () => void;

    // * `mute()` - mute all sounds
    mute: () => void;

    // * `unmute()` - unmute all sounds
    unmute: () => void;

    // * `exit()` - exit from runtime
    exit: () => Promise<void>;

    // * `simulateKeyPress(...keyCodes)` - allows to simulate key press **AND** release event for key code
    // see `sendKeyPress` to find meaning of keyCode. Key combination is supported when more than 1 keyCode is set.
    simulateKeyPress: (...keyCodes: number[]) => void;

    // * `sendKeyEvent(keyCode, pressed)` - sends single key (press or release) event to backend
    sendKeyEvent: (keyCode: number, pressed: boolean) => void;

    // * `sendMouseMotion` - sends mouse motion event to backend, position is in range [0, 1]
    sendMouseMotion: (x: number, y: number) => void;

    // * `sendRelativeMotion` - sends mouse motion event to backend, position is absolute diff of position
    sendMouseRelativeMotion: (x: number, y: number) => void;

    // * `simulateMouseButton` - sends mouse button event (press or release) to backend
    sendMouseButton: (button: number, pressed: boolean) => void;

    // * `sendMouseSync` - sends mouse sync event
    sendMouseSync: () => void;

    // dump **changed** FS as Uint8Array <zip archive>
    persist(): Promise<Uint8Array>;

    // events
    events(): CommandInterfaceEvents;

    networkConnect(networkType: NetworkType, address: string, port: number): Promise<void>;

    networkDisconnect(networkType: NetworkType): Promise<void>;

    sharedMemory?: SharedArrayBuffer;

    directSound?: DirectSound;
}

export type MessageType = "log" | "warn" | "error" | string;

export interface CommandInterfaceEvents {
    onStdout: (consumer: (message: string) => void) => void;
    onFrameSize: (consumer: (width: number, height: number) => void) => void;
    onFrame: (consumer: (rgb: Uint8Array | null, rgba: Uint8Array | null) => void) => void;
    onSoundPush: (consumer: (samples: Float32Array) => void) => void;
    onExit: (consumer: () => void) => void;

    onMessage: (consumer: (msgType: MessageType, ...args: any[]) => void) => void;

    onNetworkConnected: (consumer: (networkType: NetworkType, address: string, port: number) => void) => void;
    onNetworkDisconnected: (consumer: (networkType: NetworkType) => void) => void;
}

if (typeof window !== "undefined") {
    (window as any).emulators = emulatorsImpl;
} if (typeof global !== "undefined") {
    (global as any).emulators = emulatorsImpl;
}
