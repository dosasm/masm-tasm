import { Emulators } from 'emulators';
import { EmulatorsUi } from 'emulators-ui';

declare const bundlePath: string;
declare const emulators: Emulators;
declare const emulatorsUi: EmulatorsUi;
declare const acquireVsCodeApi: () => { postMessage: (val: unknown) => undefined };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
let postMessage = (val: unknown) => console.log(val);

try {
    const vscode = acquireVsCodeApi();
    postMessage = vscode.postMessage;
} catch (e) {
    console.log(e);
}

async function main(): Promise<void> {
    const ele = document.getElementById("root");
    const ci = await emulatorsUi.dos(ele as HTMLDivElement, {
        emulatorFunction: 'dosboxDirect'
    }).run(bundlePath);
    ci.events().onStdout(
        value => {
            postMessage({
                command: "stdout",
                value
            });
        }
    );
}

main();

