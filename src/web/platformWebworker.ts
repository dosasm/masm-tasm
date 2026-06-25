import * as adapted from "@xsro/emulators";
import { Platform } from "@xsro/emulators";
import * as vscode from "vscode";
import { logger } from "../utils/logger";

const fs=vscode.workspace.fs;


export function uint8ArrayToArrayBuffer(uint8Arr: Uint8Array): ArrayBuffer {
  return uint8Arr.buffer.slice(uint8Arr.byteOffset, uint8Arr.byteOffset + uint8Arr.byteLength) as ArrayBuffer;
}

export class VscodeWebPlatform implements Platform {
  resolveJSpath(a: { prefix: string; js: string; suffix: string; }): string {
    throw new Error("Method not implemented.");
  }
  name = "vscode";
  httpRequest = async function (url: string, options: adapted.XhrOptions): Promise<string | ArrayBuffer> {
    const uri = vscode.Uri.parse(url);
    const data = await fs.readFile(uri);
    if (uri.path.endsWith("wasm")) {
      return uint8ArrayToArrayBuffer(data);
    }
    else if (uri.path.endsWith("js")) {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(data);
    } else {
      logger.channel("error cannot download" + uri.toString());
    }
    return "";
  };
  node_require(path: string) {
    return require(path);
  }
  async createWorker(workerUrl: string, onerror: (e: ErrorEvent) => void, onmessage: (e: MessageEvent) => void): Promise<Worker> {
    const response = await fetch(workerUrl);
    if (response.status !== 200) {
      throw new Error("Unable to download '" + workerUrl + "' (" +
        response.status + "): " + response.statusText);
    }
    const b = await response.blob();
    const localUrl = URL.createObjectURL(b);
    const worker = new Worker(localUrl);
    worker.onerror = onerror;
    worker.onmessage = onmessage;
    return worker;
  }
  constructor(private dist: vscode.Uri) {
  }
}
