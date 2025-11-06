import { WasmModule } from "../../../impl/modules";
import { TransportLayer, MessageHandler, ClientMessage, ServerMessage } from "../../../protocol/protocol";
import { MessagesQueue } from "../../../protocol/messages-queue";

export async function dosDirect(wasmModule: WasmModule, sessionId: string): Promise<TransportLayer> {
    const messagesQueue = new MessagesQueue();
    let handler: MessageHandler = messagesQueue.handler.bind(messagesQueue);

    const module: any = {};

    module.postMessage = (name: ServerMessage, props: {[key: string]: any}) => {
        handler(name, props);
    };

    const sleepHandler = (e: MessageEvent) => {
        const data = e.data;
        if (data?.name === "ws-sync-sleep" && data.props.sessionId === sessionId) {
            postMessage({ name: "wc-sync-sleep", props: data.props }, "*");
        }
    };

    const transportLayer: TransportLayer = {
        sessionId,
        sendMessageToServer: (name: ClientMessage, props?: {[key: string]: any}) => {
            module.messageHandler({ data: { name, props } });
        },
        initMessageHandler: (newHandler: MessageHandler) => {
            handler = newHandler;
            messagesQueue.sendTo(handler);
        },
        exit: () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("message", sleepHandler);
            }
        },
    };

    (transportLayer as any).module = module;

    if (typeof window !== "undefined") {
        window.addEventListener("message", sleepHandler, { passive: true });
    }

    await wasmModule.instantiate(module);
    module.callMain([sessionId]);

    return transportLayer;
}
