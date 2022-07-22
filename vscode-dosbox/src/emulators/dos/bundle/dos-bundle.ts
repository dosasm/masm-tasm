// # DosBundle
// Is a complete bundle that contains everything needed to start dosbox server

import { DosConfig, createDosConfig, toDosboxConf } from "./dos-conf";
import LibZip from "../../libzip/libzip";

import { httpRequest } from "../../http";

import { WasmModule } from "../../impl/modules";

// ### DosArchiveSource
export interface DosArchiveSource {
    // source (archive) to download and extract via `extractAll`

    // **url** where archive is located
    url: string;

    // **path**
    path: string;

    // **type**
    type?: "zip";
    // archive type, now only Zip is supported
}

export default class DosBundle {
    public config: DosConfig;
    public sources: DosArchiveSource[];

    private libzipWasm: WasmModule;

    constructor(libzipWasm: WasmModule) {
        this.config = createDosConfig();
        this.sources = [];
        this.libzipWasm = libzipWasm;
    }

    autoexec(...lines: string[]): DosBundle {
        this.config.autoexec.options.script.value = lines.join("\n");
        return this;
    }

    cycles(cycles: string): DosBundle {
        this.config.cpu.options.cycles.value = cycles;
        return this;
    }

    // ### extract
    extract(url: string, path = "/", type: "zip" = "zip"): DosBundle {
        // simplified version of extractAll, works only for one archive. It calls extractAll inside.
        return this.extractAll([{ url, path, type }]);
    }

    // ### extractAll
    extractAll(sources: DosArchiveSource[]): DosBundle {
        // eslint-disable-next-line max-len
        // download given [`sources`](https://js-dos.com/6.22/docs/api/generate.html?page=jsdos-bundle#dosfs-dosarchivesource)
        // and extract them
        this.sources.push(...sources);
        return this;
    }

    async toUint8Array(overwriteConfig = false): Promise<Uint8Array> {
        const module = {};
        await this.libzipWasm.instantiate(module);
        const libzip = new LibZip(module, "/home/web_user");
        const conf = await toDosboxConf(this.config);

        const promises = [];
        for (const source of this.sources) {
            if (source.type !== "zip") {
                throw new Error("Only Zip is supported");
            }

            const resource = httpRequest(source.url, {
                responseType: "arraybuffer",
            }).then((buffer: string | ArrayBuffer) => {
                return {
                    source,
                    data: new Uint8Array(buffer as ArrayBuffer),
                };
            });

            promises.push(resource);
        }

        if (!overwriteConfig) {
            await libzip.writeFile(".jsdos/dosbox.conf", conf);
            await libzip.writeFile(".jsdos/readme.txt", readmeTxt);
            await libzip.writeFile(".jsdos/jsdos.json", JSON.stringify(this.config, null, 2));
        }

        const resources = await Promise.all(promises);
        for (const resource of resources) {
            libzip.zipToFs(resource.data, resource.source.path);
        }

        if (overwriteConfig) {
            await libzip.writeFile(".jsdos/dosbox.conf", conf);
            await libzip.writeFile(".jsdos/readme.txt", readmeTxt);
            await libzip.writeFile(".jsdos/jsdos.json", JSON.stringify(this.config, null, 2));
        }

        const bundle = await libzip.zipFromFs();
        libzip.destroy();

        return bundle;
    }
}


const readmeTxt = `
Please visit our website:

        _                __
       (_)____      ____/ /___  _____ _________  ____ ___
      / / ___/_____/ __  / __ \\/ ___// ___/ __ \\/ __ \`__ \\
     / (__  )_____/ /_/ / /_/ (__  )/ /__/ /_/ / / / / / /
  __/ /____/      \\__,_/\\____/____(_)___/\\____/_/ /_/ /_/
 /___/
`;
