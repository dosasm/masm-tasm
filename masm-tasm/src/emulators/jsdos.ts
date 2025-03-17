import { ExtensionContext, ExtensionMode, Uri } from "vscode";
import * as vscode from "vscode"
import { ActionContext, AsmResult, ExecAction } from "../ASM/manager";
import { DosEmulatorType } from "../utils/configuration";
import { CommandInterface, getEmulators,platform } from 'emulators/dist/out/emulators';
import { manager } from "./jsdos-ci";
import { createBundle } from "./bundle";




class JsdosRuntime{
    emulators;
    ci:CommandInterface|undefined;
    constructor(pathprefix:string){
        this.emulators=getEmulators(pathprefix);
    }
    async run(FS:Uint8Array){
        this.ci=await this.emulators.dosboxWorker(FS,);
        this.ci.events().onMessage((msg,...args)=>{
            console.log(msg,args)
        })
    }
}

let runtime:JsdosRuntime|undefined=undefined;

export class JSDosHost implements ExecAction{
    name: DosEmulatorType | DosEmulatorType[]=DosEmulatorType.jsdos;
    async run(context: ExtensionContext, ctx: ActionContext): Promise<AsmResult> {

        if(runtime===undefined||runtime.ci===undefined){
            if(context.extensionMode==ExtensionMode.Development){
                runtime=new JsdosRuntime(Uri.joinPath(context.extensionUri,"node_modules/emulators/dist/").fsPath);
            }else{
                throw new Error("not implemented");
            }

            const source=await vscode.workspace.fs.readFile(Uri.joinPath(context.extensionUri,"resources","MASM-v6.11.zip"))
            const boxConf=`
[AUTOEXEC]
mount C ./C/
c:
`// disk name is not case sensitive but file path is
            const bundle=await createBundle({boxConf,mount:[{type:"zip",disk:"C","root":"C","zip":source}]});
            console.log(bundle.files)
            const data=await bundle.generateAsync({ type: "uint8array" })
            await runtime.run(data);
            if(runtime && runtime.ci){
                manager.updateci(runtime as {ci:CommandInterface});
            }
            vscode.workspace.fs.writeFile(Uri.joinPath(context.extensionUri,"resources","test.zip"),data)
        }

        if(manager.hasCi.ci&&manager.terminal){
            manager.shell?.exec("echo hello")
        }
        
        return {
            message:"hello"
        };
    }
}