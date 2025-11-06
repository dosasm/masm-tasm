import { ServerMessage, MessageHandler } from "./protocol";

interface DelayedMessage {
    name: ServerMessage,
    props: {[key: string]: any},
}

export class MessagesQueue {
    private messages: DelayedMessage[] = [];
    public handler(name: ServerMessage, props: {[key: string]: any}) {
        this.messages.push({ name, props });
    }
    public sendTo(handler: MessageHandler) {
        for (const next of this.messages) {
            handler(next.name, next.props);
        }

        this.messages = [];
    }
}
