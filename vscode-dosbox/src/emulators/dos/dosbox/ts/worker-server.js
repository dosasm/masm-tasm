var worker = typeof importScripts === "function";

if (worker) {
    onmessage = (e) => {
        const data = e.data;
        if (data === undefined) {
            return;
        }

        if (data.name === "wc-install") {
            const sessionId = data.props.sessionId;
            const module = {};

            if (data.props.module !== undefined) {
                const wasmModule = data.props.module;
                const instantiateWasm = (info, receiveInstance) => {
                    info.env = info.env || {};
                    WebAssembly.instantiate(wasmModule, info)
                        .then((instance) => receiveInstance(instance, wasmModule));
                    return; // no-return
                };

                module.instantiateWasm = instantiateWasm;
            }

            module.onRuntimeInitialized = () => {
                module.callMain([sessionId]);
            };

            new WDOSBOX(module);
            return;
        }
    };
}
