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

    logExtensionInfo(context: vscode.ExtensionContext) {
        const { platform, arch } = process;
        const target =
          platform === undefined && (process as { browser?: boolean }).browser
            ? "web"
            : platform + "-" + arch;
    
        logger.channel(`running at ${target}
    extensionUri: ${context.extensionUri.fsPath}
    globalStorageUri: ${context.globalStorageUri.fsPath}
    extensionMode: ${context.extensionMode}
    logUri: ${context.logUri.fsPath}
            `);
      }
}

export const logger = new Logger();