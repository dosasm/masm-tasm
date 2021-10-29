import * as vscode from 'vscode';
import { actionMessage, localize } from './i18n';
import * as conf from './configuration';

class Logger {
    outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('masm-tasm');
    log = console.log;
    warn = console.warn;
    error = console.error;
    localize = localize;
    actionLog(act: conf.actionType, uri: vscode.Uri) {
        const message = actionMessage(act, uri.fsPath, conf.extConf.emulator, conf.extConf.asmType);
        this.channel('\n' + message + '\n').show();
    }

    channel(value: string) {
        this.outputChannel.append(value);
        return this.outputChannel;
    }
}

export const logger = new Logger();