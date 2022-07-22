import * as vscode from "vscode";
import { emulist } from "../emulators/main";
import { nodejs_emu_list } from "../emulators/main-nodejs";
import { ActionType } from "../utils/configuration";
import { activateManager } from "./manager";
import * as statusBar from './statusBar';

export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);

    const execAction = activateManager(context, emulist.concat(
        nodejs_emu_list,
    ));

    context.subscriptions.push(
        vscode.commands.registerCommand('masm-tasm.openEmulator', (uri: vscode.Uri) => execAction(ActionType.open, uri)),
        vscode.commands.registerCommand('masm-tasm.runASM', (uri: vscode.Uri) => execAction(ActionType.run, uri)),
        vscode.commands.registerCommand('masm-tasm.debugASM', (uri: vscode.Uri) => execAction(ActionType.debug, uri))
    );
}