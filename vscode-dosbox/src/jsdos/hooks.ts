import { isNode } from "browser-or-node";
import { URI } from "vscode-uri";
import { WasmModule, host, httpRequest } from "../emulators/main";

export function loadWasmModule(
  url: URI,
  moduleName: string,
  onprogress: (stage: string, total: number, loaded: number) => void
): Promise<WasmModule> {
  if (isNode) {
    return loadWasmModuleNode(url, moduleName, onprogress);
  } else {
    return loadWasmModuleBrowser(url, moduleName, onprogress);
  }
}

function loadWasmModuleNode(
  url: URI,
  moduleName: string,
  // eslint-disable-next-line
  onprogress: (stage: string, total: number, loaded: number) => void
) {
  if (host.globals.compiled[moduleName] !== undefined) {
    return host.globals.compiled[moduleName];
  }

  const emModule = eval("require(url.fsPath)");
  const compiledModulePromise = Promise.resolve(
    new CompiledNodeModule(emModule)
  );
  if (moduleName) {
    host.globals.compiled[moduleName] = compiledModulePromise;
  }

  return compiledModulePromise;
}

function loadWasmModuleBrowser(
  url: URI,
  moduleName: string,
  onprogress: (stage: string, total: number, loaded: number) => void
) {
  if (host.globals.compiled[moduleName] !== undefined) {
    return host.globals.compiled[moduleName];
  }

  async function load() {
    const fromIndex = url.path.lastIndexOf("/");
    const wIndex = url.path.indexOf("w", fromIndex);
    const isWasmUrl = wIndex === fromIndex + 1 && wIndex >= 0;

    if (!host.wasmSupported || !isWasmUrl) {
      throw new Error(
        "Starting from js-dos 6.22.60 js environment is not supported"
      );
    }

    const wasmUrl = URI.from({
      ...url,
      path: url.path.replace(".js", ".wasm"),
    });
    const binaryPromise = httpRequest(wasmUrl.toString(), {
      responseType: "arraybuffer",
      progress: (total, loaded) => {
        onprogress("Resolving DosBox (" + url + ")", total, loaded);
      },
    });
    const scriptPromise = httpRequest(url.toString(), {
      progress: (total, loaded) => {
        onprogress("Resolving DosBox", total, loaded);
      },
    });

    const [binary, script] = await Promise.all([binaryPromise, scriptPromise]);
    const wasmModule = await WebAssembly.compile(binary as ArrayBuffer);
    const instantiateWasm = (info: any, receiveInstance: any) => {
      info.env = info.env || {};
      WebAssembly.instantiate(wasmModule, info).then((instance) =>
        receiveInstance(instance, wasmModule)
      );
      return; // no-return
    };

    eval.call(host.globals, script as string);

    return new CompiledBrowserModule(
      wasmModule,
      host.globals.exports[moduleName],
      instantiateWasm
    );
  }

  const promise = load();

  if (moduleName) {
    host.globals.compiled[moduleName] = promise;
  }

  return promise;
}

class CompiledNodeModule implements WasmModule {
  private emModule: any;
  constructor(emModule: any) {
    this.emModule = emModule;
  }

  instantiate(initialModule: any): Promise<void> {
    return new Promise<void>((resolve) => {
      initialModule.onRuntimeInitialized = () => {
        resolve();
      };

      // eslint-disable-next-line new-cap
      new this.emModule(initialModule);
    });
  }
}

class CompiledBrowserModule implements WasmModule {
  public wasmModule: WebAssembly.Module;
  private module: any;
  private instantiateWasm: any;

  constructor(
    wasmModule: WebAssembly.Module,
    module: any,
    instantiateWasm: any
  ) {
    this.wasmModule = wasmModule;
    this.module = module;
    this.instantiateWasm = instantiateWasm;
  }

  instantiate(initialModule: any): Promise<void> {
    return new Promise<void>((resolve) => {
      initialModule.instantiateWasm = this.instantiateWasm;
      initialModule.onRuntimeInitialized = () => {
        resolve();
      };
      // eslint-disable-next-line new-cap
      new this.module(initialModule);
    });
  }
}
