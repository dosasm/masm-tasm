import * as origin from "./http.origin"

export type XhrOptions = origin.XhrOptions;

export type ReadContent=((url: string, options: origin.XhrOptions)=> Promise<string | ArrayBuffer | undefined>)
let readContent:ReadContent|undefined=undefined
export const setReadContent=function(f:ReadContent){readContent=f}

export let httpRequest = async function(url: string, options: origin.XhrOptions):Promise<string | ArrayBuffer>{
    if(readContent){
        const r=await readContent(url,options);
        if(r!==undefined){
            return r;
        }
    }
    return origin.httpRequest(url,options);
}