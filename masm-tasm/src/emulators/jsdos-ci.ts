import * as vscode from 'vscode';
import * as conf from '../utils/configuration';
import { CommandInterface, utils } from 'emulators';

class JsdosTerminal implements vscode.Pseudoterminal {
    onDidWrite: vscode.Event<string>;
    writeEmitter: vscode.EventEmitter<string>;
    stdout = "";
    shell: utils.Shell;
    constructor(private ci: CommandInterface) {
        this.shell = new utils.Shell(ci);
        this.writeEmitter = new vscode.EventEmitter<string>();
        this.onDidWrite = this.writeEmitter.event;
        let stdout = "";
        ci.events().onStdout(
            data => {
                stdout += data;
                this.stdout += data;
                if (["\n", ">", "-"].some(p => data.includes(p))) {
                    this.writeEmitter.fire(stdout);
                    stdout = "";
                }
            }
        );
    }
    onDidOverrideDimensions?: vscode.Event<vscode.TerminalDimensions | undefined> | undefined;
    onDidClose?: vscode.Event<number | void> | undefined;
    onDidChangeName?: vscode.Event<string> | undefined;
    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.writeEmitter.fire('\x1b[31mJSDos\x1b[0m\r\nhello');
    }
    close(): void {
        this.ci.exit();
    }
    input = "";
    handleInput?(data: string): void {
        if (data === "\r") {
            this.shell.exec(this.input)
            this.input = "";
        } else {
            this.writeEmitter.fire("\x1b[31m" + data + "\x1b[0m");
            this.input += data;
        }
    }
}


function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'script.js'));
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>时间延迟计算器</title>
        </head>
        <body>
            <div id="result"></div>
            <div><canvas id="layout"></canvas></div>
            <script src="${scriptUri}"></script>
        </body>
        </html>
    `;
}


class Manager {
    ci: CommandInterface | undefined = undefined;
    terminal:vscode.Terminal|undefined=undefined;
    updateci(ci: CommandInterface) {
        const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        bar.command = 'masmtasm.emulatorStatus';
        bar.text = `jsdos`;
        bar.show();

        this.ci = ci;
        const pty = new JsdosTerminal(this.ci);
        this.terminal=vscode.window.createTerminal({ name: "jsdos", pty, });
    }
    webview(context:vscode.ExtensionContext) {
        if (this.ci) {
            const panel = vscode.window.createWebviewPanel(
                "jsdos",
                "jsdos panel",
                { viewColumn: vscode.ViewColumn.Beside },
                {
                    enableScripts: true
                }
            )
            const currentTime = new Date().getTime();

            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
            panel.webview.postMessage({ command: 'setTime', time: currentTime });

            panel.webview.postMessage({
                command: "ci",
                width: this.ci?.width(),
                height: this.ci?.height()
            });
           this.ci?.events().onFrame((rgb, rgba) => {
                panel.webview.postMessage({
                    command: 'rgb',
                    time: new Date().getTime(),
                    data: rgb
                });
            });
            panel.webview.onDidReceiveMessage(
                message => {
                    console.log(message);
                    switch (message.command) {
                        case 'alert':
                            vscode.window.showInformationMessage(message.text);
                            return;
                        case 'keyup':
                            const up = utils.htmlKey2jsdos(message.code);
                            if (up && this.ci)
                                this.ci.sendKeyEvent(up, false);
                            return;
                        case 'keydown':
                            const down = utils.htmlKey2jsdos(message.code);
                            if (down && this.ci)
                                this.ci.sendKeyEvent(down, true);
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    }
}

export const manager=new Manager();



export function activate(context: vscode.ExtensionContext): void {
    async function statusBarCommand() {
        const items = ["show jsdos view", "show terminal"];
    
        const placeHolder = 'manipulate emulator';
        const seleted = await vscode.window.showQuickPick(items, { placeHolder });
        if (seleted===items[0]) {
            manager.webview(context);
        }
        if(seleted===items[1]){
            manager.terminal?.show();
        }
    }
    const disposable = vscode.commands.registerCommand('masmtasm.emulatorStatus', statusBarCommand);
    context.subscriptions.push(disposable);
}