import * as origin from "./modules.origin";
import { URI ,Utils} from 'vscode-uri';
export {WasmModule,IWasmModules} from "./modules.origin"

interface Globals {
    exports: {[moduleName: string]: any},
    compiled: {[moduleName: string]: Promise<origin.WasmModule>},
}

class Host {
    public wasmSupported = false;
    public globals: Globals;
    constructor() {
        this.globals = globalThis as any
        if(this.globals.exports===undefined) this.globals.exports={}
        if(this.globals.compiled===undefined) this.globals.compiled={}

        // ### WebAssembly
        // Host able to detect is WebAssembly supported or not,
        // this information is stored in `Host.wasmSupported` variable
        if (typeof WebAssembly === "object" &&
            typeof WebAssembly.instantiate === "function" &&
            typeof WebAssembly.compile === "function") {
            const wmodule = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
            if (wmodule instanceof WebAssembly.Module) {
                this.wasmSupported = new WebAssembly.Instance(wmodule) instanceof WebAssembly.Instance;
            }
        }

        // Polyfill for old contains implementations for:
        // `Math.imul`, `Math.fround`, `Math.clz32`, `Math.trunc`
        (function polyfill() {
            if (!Math.imul || Math.imul(0xffffffff, 5) !== -5) {
                Math.imul = function imul(a: any, b: any) {
                    const ah = a >>> 16;
                    const al = a & 0xffff;
                    const bh = b >>> 16;
                    const bl = b & 0xffff;
                    return (al * bl + ((ah * bl + al * bh) << 16)) | 0;
                };
            }
            Math.imul = Math.imul;

            if (!Math.fround) {
                Math.fround = function(x) {
                    return x;
                };
            }
            Math.fround = Math.fround;

            if (!Math.clz32) {
                Math.clz32 = function(x) {
                    x = x >>> 0;
                    for (let i = 0; i < 32; i++) {
                        if (x & (1 << (31 - i))) {
                            return i;
                        }
                    }
                    return 32;
                };
            }
            Math.clz32 = Math.clz32;

            if (!Math.trunc) {
                Math.trunc = function(x) {
                    return x < 0 ? Math.ceil(x) : Math.floor(x);
                };
            }
            Math.trunc = Math.trunc;
        })();
    }
}

export const host = new Host();

export class WasmModulesImpl implements origin.IWasmModules {
    private pathPrefix: URI

    private libzipPromise?: Promise<origin.WasmModule>;
    private dosboxPromise?: Promise<origin.WasmModule>;

    public wasmSupported = false;

    constructor(pathPrefix: string,
        private wdosboxJs: string = "wdosbox.js",
        private wlibzipJs: string = "wlibzip.js",
    ) {
        this.pathPrefix=pathPrefix.startsWith("http")?URI.parse(pathPrefix):URI.file(pathPrefix)
     }

    libzip() {
        if (this.libzipPromise !== undefined) {
            return this.libzipPromise;
        }

        this.libzipPromise = this.loadModule(Utils.joinPath(this.pathPrefix,this.wlibzipJs), "WLIBZIP");
        return this.libzipPromise;
    }

    dosbox() {
        if (this.dosboxPromise !== undefined) {
            return this.dosboxPromise;
        }
        const wdosboxpath=Utils.joinPath(this.pathPrefix,this.wdosboxJs);
        this.dosboxPromise = this.loadModule(wdosboxpath, "WDOSBOX");

        return this.dosboxPromise;
    }

    private loadModule(url: URI,
        moduleName: string) {
        // eslint-disable-next-line
        return loadWasmModule(url, moduleName, () => { });
    }
}


export type LoadWasmModule = (url: URI, moduleName: string, onprogress: (stage: string, total: number, loaded: number) => void)=> Promise<origin.WasmModule>
let loadWasmModule:LoadWasmModule = (url,moduleName,onprogress)=>origin.loadWasmModule(url.toString(),moduleName,onprogress)
export function setLoadWasmModule(f: LoadWasmModule) { loadWasmModule = f }
