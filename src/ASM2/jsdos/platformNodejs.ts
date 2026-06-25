import { Platform, XhrOptions } from "@xsro/emulators"
import { Worker as nWorker } from "node:worker_threads"

export class VScodeNodeJsPlatform implements Platform {
    name = "nodejs"
    httpRequest(url: string, options: XhrOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            const http = require('node:http');
            const https = require('node:https');
            const urlObj = new URL(url);
            const requestOptions = {
                method: options.method,
                protocol: urlObj.protocol,
                hostname: urlObj.hostname,
                port: urlObj.port,
            };
            const req = (urlObj.protocol === 'https:' ? https : http).request(urlObj, requestOptions, (res: any) => {
                let data = '';
                res.on('data', (chunk: any) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve(data);
                });
            });
            req.on('error', (e: any) => {
                reject(e);
            }
            );
        })
    }
    node_require(path: string) {
        return __non_webpack_require__(path)
    }
    createWorker(workerUrl: string, onerror: (e: ErrorEvent) => void, onmessage: (e: MessageEvent) => void): Promise<Worker> {
        const w = new nWorker(workerUrl)
        w.on('message', (message: any) => {
            onmessage({ data: message } as any)
        });
        w.on('error', (error: any) => {
            onerror({ type: "node worker thread", filename: error.stack, message: error.message } as any)
        })
        return Promise.resolve(w as unknown as Worker)
    }
}
