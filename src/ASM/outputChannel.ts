import { window } from "vscode";

export const OutChannel = window.createOutputChannel('Masm-Tasm');

export function logger(info: { title: string; content: string }) {
    if (info.content.trim().length > 0) {
        OutChannel.appendLine(info.title);
        let msg = info.content
            .replace(/\r\n/g, '\n')
            .replace(/\n\n/g, '\n')
            .replace(/\n/g, '\n\t')
            .trim() + '\n';
        msg = "\t" + msg;
        OutChannel.append(msg);
    }
    else {
        //console.log('ignore message' + JSON.stringify(info))
    }
}