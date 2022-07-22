import { Build } from "../build";
import { Emulators, CommandInterface, BackendOptions } from "../emulators";

import { IWasmModules, WasmModulesImpl } from "./modules";

import DosBundle from "../dos/bundle/dos-bundle";
import { dosDirect } from "../dos/dosbox/ts/direct";
import { dosWorker } from "../dos/dosbox/ts/worker";
import Janus from "../janus/janus-impl";

import { TransportLayer, CommandInterfaceOverTransportLayer } from "../protocol/protocol";

class EmulatorsImpl implements Emulators {
    pathPrefix = "";
    version = Build.version;
    wdosboxJs = "wdosbox.js";

    private wasmModulesPromise?: Promise<IWasmModules>;

    async dosBundle(): Promise<DosBundle> {
        const modules = await this.wasmModules();
        const libzipWasm = await modules.libzip();
        return new DosBundle(libzipWasm);
    }

    async dosboxNode(bundle: Uint8Array | Uint8Array[], options?: BackendOptions): Promise<CommandInterface> {
        return this.dosboxDirect(bundle, options);
    }

    async dosboxDirect(bundle: Uint8Array | Uint8Array[], options?: BackendOptions): Promise<CommandInterface> {
        const modules = await this.wasmModules();
        const dosboxWasm = await modules.dosbox();
        const transportLayer = await dosDirect(dosboxWasm, "session-" + Date.now());
        return this.backend(bundle, transportLayer, options);
    }

    async dosboxWorker(bundle: Uint8Array | Uint8Array[], options?: BackendOptions): Promise<CommandInterface> {
        const modules = await this.wasmModules();
        const dosboxWasm = await modules.dosbox();
        const transportLayer = await dosWorker(this.pathPrefix + this.wdosboxJs, dosboxWasm, "session-" + Date.now());
        return this.backend(bundle, transportLayer, options);
    }

    async janus(restUrl: string): Promise<CommandInterface> {
        // eslint-disable-next-line new-cap
        return Janus(restUrl);
    }

    async backend(bundle: Uint8Array | Uint8Array[], transportLayer: TransportLayer,
        options?: BackendOptions): Promise<CommandInterface> {
        return new Promise<CommandInterface>((resolve, reject) => {
            const ci = new CommandInterfaceOverTransportLayer(
                Array.isArray(bundle) ? bundle : [bundle],
                transportLayer,
                (err) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        // can be called from ctor, without timeout can be undefined
                        setTimeout(() => resolve(ci), 4);
                    }
                },
                options || {},
            );
        });
    }

    wasmModules(): Promise<IWasmModules> {
        if (this.wasmModulesPromise !== undefined) {
            return this.wasmModulesPromise;
        }

        const make = async () => {
            return new WasmModulesImpl(this.pathPrefix, this.wdosboxJs);
        };

        this.wasmModulesPromise = make();
        return this.wasmModulesPromise;
    }

    async dosDirect(bundle: Uint8Array | Uint8Array[]): Promise<CommandInterface> {
        return this.dosboxDirect(bundle);
    }

    async dosWorker(bundle: Uint8Array | Uint8Array[]): Promise<CommandInterface> {
        return this.dosboxWorker(bundle);
    }
}

const emulators = new EmulatorsImpl();

export default emulators;
