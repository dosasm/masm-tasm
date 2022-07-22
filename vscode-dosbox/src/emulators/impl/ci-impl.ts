/* eslint-disable no-invalid-this */

import { CommandInterfaceEvents, MessageType, NetworkType } from "../emulators";

export class CommandInterfaceEventsImpl implements CommandInterfaceEvents {
    private onStdoutConsumers: ((message: string) => void)[] = [];
    private delayedStdout: string[] = [];

    private onFrameSizeConsumers: ((width: number, height: number) => void)[] = [];
    private onFrameConsumers: ((rgb: Uint8Array | null, rgba: Uint8Array | null) => void)[] = [];
    private onSoundPushConsumers: ((samples: Float32Array) => void)[] = [];
    private onExitConsumers: (() => void)[] = [];

    private onMessageConsumers: ((msgType: MessageType, ...args: any[]) => void)[] = [];
    private delayedMessages: {msgType: MessageType, args: any[]}[] = [];

    private onNetworkConnectedConsumers: ((networkType: NetworkType, address: string, port: number) => void)[] = [];
    private onNetworkDisconnectedConsumers: ((networkType: NetworkType) => void)[] = [];

    onStdout = (consumer: (message: string) => void) => {
        this.onStdoutConsumers.push(consumer);

        if (this.onStdoutConsumers.length === 1) {
            for (const next of this.delayedStdout) {
                this.fireStdout(next);
            }
            this.delayedStdout = [];
        }
    };

    onFrameSize = (consumer: (width: number, height: number) => void) => {
        this.onFrameSizeConsumers.push(consumer);
    };

    onFrame = (consumer: (rgb: Uint8Array | null, rgba: Uint8Array | null) => void) => {
        this.onFrameConsumers.push(consumer);
    };

    onSoundPush = (consumer: (samples: Float32Array) => void) => {
        this.onSoundPushConsumers.push(consumer);
    };

    onExit = (consumer: () => void) => {
        this.onExitConsumers.push(consumer);
    };

    onMessage = (consumer: (msgType: MessageType, ...args: any[]) => void) => {
        this.onMessageConsumers.push(consumer);

        if (this.onMessageConsumers.length === 1) {
            for (const next of this.delayedMessages) {
                consumer(next.msgType, ...next.args);
            }
            this.delayedMessages = [];
        }
    };

    onNetworkConnected(consumer: (networkType: NetworkType, address: string, port: number) => void) {
        this.onNetworkConnectedConsumers.push(consumer);
    }

    onNetworkDisconnected(consumer: (networkType: NetworkType) => void) {
        this.onNetworkDisconnectedConsumers.push(consumer);
    }

    fireStdout = (message: string) => {
        if (this.onStdoutConsumers.length === 0) {
            this.delayedStdout.push(message);
            return;
        }

        for (const next of this.onStdoutConsumers) {
            next(message);
        }
    };

    fireFrameSize = (width: number, height: number) => {
        for (const next of this.onFrameSizeConsumers) {
            next(width, height);
        }
    };

    fireFrame = (rgb: Uint8Array | null, rgba: Uint8Array | null) => {
        for (const next of this.onFrameConsumers) {
            next(rgb, rgba);
        }
    };

    fireSoundPush = (samples: Float32Array) => {
        for (const next of this.onSoundPushConsumers) {
            next(samples);
        }
    };

    fireExit = () => {
        for (const next of this.onExitConsumers) {
            next();
        }

        this.onStdoutConsumers = [];
        this.onFrameSizeConsumers = [];
        this.onFrameConsumers = [];
        this.onSoundPushConsumers = [];
        this.onExitConsumers = [];
        this.onMessageConsumers = [];
    };

    fireMessage = (msgType: MessageType, ...args: any[]) => {
        if (this.onMessageConsumers.length === 0) {
            this.delayedMessages.push({ msgType, args });
            return;
        }

        for (const next of this.onMessageConsumers) {
            next(msgType, ...args);
        }
    };

    fireNetworkConnected = (networkType: NetworkType, address: string, port: number) => {
        for (const next of this.onNetworkConnectedConsumers) {
            next(networkType, address, port);
        }
    };

    fireNetworkDisconnected = (networkType: NetworkType) => {
        for (const next of this.onNetworkDisconnectedConsumers) {
            next(networkType);
        }
    };
}
