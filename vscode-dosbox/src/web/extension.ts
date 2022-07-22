// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as jsdosWeb from "../jsdos/main";
import { logger } from "../util/logger";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  logger.log(
    'Congratulations, your extension "xsro.vscode-dosbox" is now active in the web extension host!'
  );
  logger.logExtensionInfo(context);
  return {
    ...jsdosWeb.activate(context),
  };
}

export type API = ReturnType<typeof activate>;

// this method is called when your extension is deactivated
export function deactivate() {}
