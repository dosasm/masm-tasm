/**
 * main.ts — Web Entry Point (supports jsdos/jsdos-x only)
 *
 * This file is the browser environment extension entry point, supporting only the jsdos emulator.
 * Use main-node.ts for desktop environments.
 */

import * as vscode from "vscode";

import { ActionType, DosEmulatorType } from "./types";
import { AsmResult } from "./run";
import * as config from "./config";
import * as statusBar from "./statusBar";
import * as Diag from "../diagnose/main";
import { activateJSdos } from "./jsdos/main";
import { CIManager } from "./jsdos";
import { runJsdos } from "./run";

export type { AsmResult } from "./run";

export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const jsdos_api = activateJSdos(context);
    const cis = new CIManager(context);
    const diag = Diag.activate(context);

    function handleAction(actionType: ActionType, uri: vscode.Uri): Promise<AsmResult | undefined> {
        const useX = config.getEmulator() === DosEmulatorType.jsdosX;
        return runJsdos(context, actionType, uri, cis, useX, jsdos_api, diag);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand("masm-tasm.openEmulator", (uri: vscode.Uri) => handleAction(ActionType.open, uri)),
        vscode.commands.registerCommand("masm-tasm.runASM", (uri: vscode.Uri) => handleAction(ActionType.run, uri)),
        vscode.commands.registerCommand("masm-tasm.debugASM", (uri: vscode.Uri) => handleAction(ActionType.debug, uri))
    );
}
