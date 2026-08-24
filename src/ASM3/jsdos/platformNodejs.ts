import { Platform, XhrOptions } from "@xsro/emulators";
import { Worker as nWorker } from "node:worker_threads";
import * as http from "node:http";
import * as https from "node:https";

export class VScodeNodeJsPlatform implements Platform {
    name = "nodejs";
    httpRequest(url: string, options: XhrOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const requestOptions = {
                method: options.method,
                protocol: urlObj.protocol,
                hostname: urlObj.hostname,
                port: urlObj.port,
            };
            const requestModule = (urlObj.protocol === "https:" ? https : http) as typeof http;
            const req = requestModule.request(urlObj, requestOptions, (res: http.IncomingMessage) => {
                let data = "";
                res.on("data", (chunk: Buffer) => {
                    data += chunk.toString();
                });
                res.on("end", () => {
                    resolve(data);
                });
            });
            req.on("error", (e: Error) => {
                reject(e);
            }
            );
        });
    }
    node_require(path: string) {
        return __non_webpack_require__(path);
    }
    createWorker(workerUrl: string, onerror: (e: ErrorEvent) => void, onmessage: (e: MessageEvent) => void): Promise<Worker> {
        const w = new nWorker(workerUrl);
        w.on('message', (message: unknown) => {
            onmessage({ data: message } as MessageEvent);
        });
        w.on('error', (error: Error) => {
            onerror({ type: "node worker thread", filename: error.stack, message: error.message } as ErrorEvent);
        });
        return Promise.resolve(w as unknown as Worker);
    }
}
