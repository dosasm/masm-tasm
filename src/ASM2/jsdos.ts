import { CommandInterface } from "emulators";
import { FsNode } from "emulators/build/src/protocol/protocol";
import * as vscode from "vscode";
import { vscodeDosboxAPI } from "../dosbox-api/vscode-dosbox-api.impl";
import { createTerminal } from "./jsdos/main";


interface MountFolder{
    from:vscode.Uri,
    syncToEmu:boolean,
    syncFromEmu:boolean,
    syncFromEmuPeriod:number,
    syncFromEmuPeriodId?:NodeJS.Timeout
}

function flattenFSNodes(parent:string,nodes:FsNode[]){
    const result:Record<string,number>={};
    for (const n of nodes){
        if (n.nodes){
            flattenFSNodes(parent+"/"+n.name,n.nodes)
        }else if (n.name&&n.size){
            result[parent+"/"+n.name]=n.size
        }
    }
    return result;
}

export class JSdosCi{
    // The mount is a key-value map, key is the disk name in the enumlator and value is the information of the folder and files
    mount:Record<string,MountFolder>={}
    constructor(private _ci:CommandInterface){
    }

    addMount(disk:string,m:MountFolder){
        if (this.mount[disk]){
            if(this.mount[disk].syncFromEmuPeriodId){
                clearInterval(this.mount[disk].syncFromEmuPeriodId)
            }
        }
        m.syncFromEmuPeriodId=setInterval(async () => {
            const nodes=await this._ci.fsTree();
            const files=flattenFSNodes("/",[nodes])
        }, m.syncFromEmuPeriod);
    }

    terminal(){
        return createTerminal(this._ci)
    }

}

export class JSdosCiManager{
    cis:JSdosCi[]=[]
}