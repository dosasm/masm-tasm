import { CommandInterface, Emulators } from "emulators";
import { Terminal, Uri, Webview } from "vscode";
import { API, Dosbox, Jsdos } from "./vscode-dosbox-api";
import * as Jszip from 'jszip';


class JsdosApi implements Jsdos{
    setBundle(bundle: Uri | Uint8Array, updateConf?: boolean): void {
        throw new Error("Method not implemented.");
    }
    jszip=Jszip;
    updateConf(section: string, key: string, value: string | number | boolean): boolean {
        throw new Error("Method not implemented.");
    }
    updateAutoexec(context: string[]): void {
        throw new Error("Method not implemented.");
    }
    runInHost(): Promise<CommandInterface> {
        throw new Error("Method not implemented.");
    }
    runInWebview(): Promise<Webview> {
        throw new Error("Method not implemented.");
    }
    
}

class vscodeDosboxAPI implements API {
    emulators: Emulators;
    jsdos: Jsdos=new JsdosApi();
    dosbox: Dosbox;
    dosboxX: Dosbox;
    msdosPath: string;
    commandPath: string;

    constructor(emulators?: Emulators, msdosPath?: string, commandPath?: string) {
        // store the provided emulators object or use an empty placeholder
        this.emulators = emulators || ({} as Emulators);

        // prefer real emulator instances when available, otherwise keep lightweight placeholders
        this.jsdos = (this.emulators as any).jsdos || ({} as Jsdos);
        this.dosbox = (this.emulators as any).dosbox || ({} as Dosbox);
        this.dosboxX = (this.emulators as any).dosboxX || ({} as Dosbox);

        this.msdosPath = msdosPath || "";
        this.commandPath = commandPath || "";
    }

    /**
     * Create a minimal, usable "Terminal" wrapper for running msdos-style commands.
     *
     * This implementation provides a lightweight in-process terminal-like object that:
     * - logs sent text to the console
     * - exposes show/hide/dispose operations
     *
     * If you run inside an environment with the real VS Code API, replace this method
     * with a call to vscode.window.createTerminal(...) to get a proper Terminal.
     */
    msdosPlayer(msdosArgs?: string[], command?: string): Terminal {
        const args = msdosArgs || [];
        const cmd = command || this.commandPath || this.msdosPath || "msdos";

        let visible = false;
        const buffer: string[] = [];

        const impl = {
            sendText(text: string, _preserveFocus?: boolean) {
                // append to internal buffer and log for visibility
                buffer.push(text);
                // In a real environment you would forward this to the emulator process.
                // Here we log so callers can observe behavior during tests or Node runs.
                // Keep the output concise.
                // eslint-disable-next-line no-console
                console.log(`[vscode-dosbox-api] (${cmd}) sendText:`, text);
            },
            show() {
                visible = true;
                // eslint-disable-next-line no-console
                console.log(`[vscode-dosbox-api] (${cmd}) terminal show`);
            },
            hide() {
                visible = false;
                // eslint-disable-next-line no-console
                console.log(`[vscode-dosbox-api] (${cmd}) terminal hide`);
            },
            dispose() {
                // eslint-disable-next-line no-console
                console.log(`[vscode-dosbox-api] (${cmd}) terminal dispose`);
            },
            // expose helpers for tests / callers that need access to the buffer
            __getBuffer() {
                return buffer.slice();
            },
            __isVisible() {
                return visible;
            }
        };

        // Cast to Terminal to satisfy the API. This is a pragmatic shim; if you run
        // inside VS Code, create and return a real Terminal instead.
        return impl as unknown as Terminal;
    }

}

export const api=new vscodeDosboxAPI()