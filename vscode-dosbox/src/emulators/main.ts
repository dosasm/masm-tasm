/**
 * Try my best to make the least modification to the source code
 */
import emulatorsImpl from "./impl/emulators-impl";
export {ReadContent,setReadContent,httpRequest} from "./http.modify";
export {CreateWorker,setCreateWorker} from "./dos/dosbox/ts/worker.modify";
export {CommandInterface,CommandInterfaceEvents} from "./emulators";
export {LoadWasmModule,setLoadWasmModule,WasmModule,host} from "./impl/modules.modify"
export const emulators=emulatorsImpl;
if(typeof window!=="undefined"){
    console.log("asserted");
    (window as any).emulators=emulators;
}
