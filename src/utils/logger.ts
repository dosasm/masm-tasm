import * as vscode from 'vscode';
import { localize } from './i18n';

class Logger {
    outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('masm-tasm');
    log = console.log;
    warn = console.warn;
    error = console.error;
    localize = localize;

    channel(...vals: string[]) {
        for (const val of vals) {
            this.outputChannel.append(`\n${val.trim()}`);
        }
        this.outputChannel.append('\n');
        return this.outputChannel;
    }
}

export const logger = new Logger();