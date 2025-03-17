const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

if (isNode) {
    const { isMainThread } = require('node:worker_threads');
    if (isMainThread) {
        console.log("main")
    }
    else {
        const { parentPort } = require('node:worker_threads');
        var self = parentPort;
        var worker = parentPort;
        function importScripts(...args) {
            console.log(args)
        }
        var onmessage = function (e) {

        }
        parentPort.on('message', (message) => {
            onmessage({ data: message })
        });
        function postMessage(msg) {
            parentPort.postMessage(msg);
        }
    }
} else {
    class Self {
        calls = []
        location=location
        constructor() {
            onmessage = (e) => {
                this.calls.forEach(a => a && a(e))
            }
        }
        addEventListener(msg, call) {
            if (msg === "message")
                this.calls.push(call)
        }
        removeEventListener(msg, call) {
            this.calls.forEach((value, index) => {
                if (value === call) {
                    this.calls[idx] = undefined
                }
            })
        }
    }
    var self = new Self();
}



