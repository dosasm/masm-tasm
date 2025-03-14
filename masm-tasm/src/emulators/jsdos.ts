import { ExtensionContext, ExtensionMode, Uri } from "vscode";
import { ActionContext, AsmResult, ExecAction } from "../ASM/manager";
import { DosEmulatorType } from "../utils/configuration";
import { CommandInterface, getEmulators,platform } from "emulators";
import { manager } from "./jsdos-ci";
platform.current.node_require=function(url:string){
    return __non_webpack_require__(url);
};

const TEST_STRING="XDRGS";
const config={
    dosboxConf: `[autoexec]
echo ${TEST_STRING}
`,
    jsdosConf: {
        version: "",
    },
};



class JsdosRuntime{
    emulators;
    ci:CommandInterface|undefined;
    constructor(pathprefix:string){
        this.emulators=getEmulators(pathprefix);
        const a=__non_webpack_require__(pathprefix+"wdosbox.js");
        console.log(a);
    }
    async run(){
        this.ci=await this.emulators.dosboxDirect(config,);
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
            await runtime.run();
            if(runtime.ci){
                manager.updateci(runtime.ci);
            }
        }
        
        return {
            message:"hello"
        };
    }
}