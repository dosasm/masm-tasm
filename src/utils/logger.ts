import * as vscode from 'vscode';

class Logger {
    outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('masm-tasm');
    log = console.log;
    warn = console.warn;
    error = console.error;
    channel(value: string) {
        this.outputChannel.append(value);
        return this.outputChannel;
    }
}

export const logger = new Logger();