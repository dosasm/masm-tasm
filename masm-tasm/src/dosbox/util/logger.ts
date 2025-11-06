import * as vscode from "vscode";

class Logger {
  static channel = vscode.window.createOutputChannel("vscode-DOSBox");
  log = console.log;
  warn = console.warn;
  error = console.error;
  channel(text: string) {
    Logger.channel.append(text.trim() + "\n");
    return Logger.channel;
  }
  logExtensionInfo(context: vscode.ExtensionContext) {
    const { platform, arch } = process;
    const target =
      platform === undefined && (process as any).browser
        ? "web"
        : platform + "-" + arch;

    logger.channel(`running at ${target}
extensionUri: ${context.extensionUri}
globalStorageUri: ${context.globalStorageUri}
extensionMode: ${context.extensionMode}
logUri: ${context.logUri}
        `);
  }
}

export const logger = new Logger();
