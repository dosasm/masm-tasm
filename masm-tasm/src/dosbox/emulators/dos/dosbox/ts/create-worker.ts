import { isBrowser, isNode, isWebWorker, isJsDom, isDeno } from "browser-or-node";

export async function createWorker(workerUrl: string): Promise<Worker> {
    let worker: Worker | undefined = undefined;

    //if runs in webview we need to use fetch API
    if (isBrowser) {
        const blob = await fetch(workerUrl)
            .then(result => result.blob());
        const blobUrl = URL.createObjectURL(blob);
        worker = new Worker(blobUrl);
        console.log(`created a worker with script ${blobUrl} in browser`);
    }
    else if (isNode) {
        const {Worker}=eval('require("worker_threads")')
        worker = new Worker(workerUrl) as Worker;
        console.log(`created a worker with script ${workerUrl} in nodejs`);
    }
    else {
        worker = new Worker(workerUrl);
        console.log(`created a worker with script ${workerUrl}`);
    }
    return worker;
}