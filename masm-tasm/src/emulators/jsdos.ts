import { ExtensionContext, ExtensionMode, Uri } from "vscode";
import * as vscode from "vscode";
import { ActionContext, AsmResult, ExecAction } from "../ASM/manager";
import { DosEmulatorType } from "../utils/configuration";
import { CommandInterface, getEmulators,utils } from "emulators";


const TEST_STRING="XDRGS";
const config={
    dosboxConf: `[autoexec]
echo ${TEST_STRING}
`,
    jsdosConf: {
        version: "",
    },
};

class JsdosTerminal implements vscode.Pseudoterminal{
    onDidWrite: vscode.Event<string>;
    writeEmitter:vscode.EventEmitter<string>
    stdout=""
    shell:utils.Shell
    constructor(private ci:CommandInterface){
        this.shell=new utils.Shell(ci)
        this.writeEmitter = new vscode.EventEmitter<string>();
        this.onDidWrite=this.writeEmitter.event;
        let stdout=""
        ci.events().onStdout(
            data=>{
                stdout+=data
                this.stdout+=data
                if(["\n",">","-"].some(p=>data.includes(p))){
                    this.writeEmitter.fire(stdout)
                    stdout=""
                }
            }
        )
    }
    onDidOverrideDimensions?: vscode.Event<vscode.TerminalDimensions | undefined> | undefined;
    onDidClose?: vscode.Event<number | void> | undefined;
    onDidChangeName?: vscode.Event<string> | undefined;
    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.writeEmitter.fire('\x1b[31mJSDos\x1b[0m\r\nhello');
    }
    close(): void {
        this.ci.exit()
    }
    input=""
    handleInput?(data: string): void {
        if(data==="\r"){
            this.shell.exec(this.input)
            this.input=""
        }else{
            this.writeEmitter.fire("\x1b[31m"+data+"\x1b[0m")
            this.input+=data
        }
    }
}

class JsdosRuntime{
    emulators
    ci:CommandInterface|undefined
    constructor(pathprefix:string){
        this.emulators=getEmulators(pathprefix);
        const a=__non_webpack_require__(pathprefix+"wdosbox.js")
        console.log(a)
    }
    async run(){
        this.ci=await this.emulators.dosboxDirect(config,)
        const pty=new JsdosTerminal(this.ci)
        vscode.window.createTerminal({name:"jsdos",pty,})
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

let runtime:JsdosRuntime|undefined=undefined

export class JSDosHost implements ExecAction{
    name: DosEmulatorType | DosEmulatorType[]=DosEmulatorType.jsdos;
    async run(context: ExtensionContext, ctx: ActionContext): Promise<AsmResult> {
        const panel=vscode.window.createWebviewPanel(
            "jsdos",
            "jsdos panel",
            {viewColumn:vscode.ViewColumn.Beside},
            {
                enableScripts: true
            }
        )
        const currentTime = new Date().getTime();

        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
        panel.webview.postMessage({ command: 'setTime', time: currentTime });

        if(runtime===undefined||runtime.ci===undefined){
            if(context.extensionMode==ExtensionMode.Development){
                runtime=new JsdosRuntime(Uri.joinPath(context.extensionUri,"node_modules/emulators/dist/").fsPath)
            }else{
                throw new Error("not implemented")
            }
            await runtime.run()
            panel.webview.postMessage({
                command:"ci",
                width:runtime.ci?.width(),
                height:runtime.ci?.height()
            })
            runtime.ci?.events().onFrame((rgb,rgba)=>{
                panel.webview.postMessage({
                    command: 'rgb', 
                    time:new Date().getTime(),
                    data:rgb
                })
            })
            panel.webview.onDidReceiveMessage(
                message => {
                    console.log(message)
                    switch (message.command) {
                        case 'alert':
                            vscode.window.showInformationMessage(message.text);
                            return;
                        case 'keyup':
                            const up=utils.htmlKey2jsdos(message.code)
                            if(up && runtime&& runtime.ci)
                                runtime.ci.sendKeyEvent(up, false);
                            return;
                        case 'keydown':
                            const down=utils.htmlKey2jsdos(message.code)
                            if(down && runtime&& runtime.ci)
                                runtime.ci.sendKeyEvent(down, true);
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
        
        return {
            message:"hello"
        }
    }
}