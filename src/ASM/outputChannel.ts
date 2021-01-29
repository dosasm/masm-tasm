import { window } from "vscode";

export class Logger {
    static OutChannel = window.createOutputChannel('Masm-Tasm');
    /**send message to channel */
    static send(info: { title: string; content: string }): void {
        if (info.content.trim().length > 0) {
            Logger.OutChannel.appendLine(info.title);
            let msg = info.content
                .replace(/\r\n/g, '\n')
                .replace(/\n\n/g, '\n')
                .replace(/\n/g, '\n\t')
                .trim() + '\n';
            msg = "\t" + msg;
            Logger.OutChannel.append(msg);
        }
        else {
            //console.log('ignore message' + JSON.stringify(info))
        }
    }

    static log(message?: unknown, ...optionalParams: unknown[]): void {
        console.log(message, ...optionalParams);
    }
}

