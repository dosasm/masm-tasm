import { ExtensionContext } from "vscode";
import { DosEmulatorType, extConf } from "../utils/configuration";
import { ActionContext, AsmResult, ExecAction, API } from "../ASM/manager";
import { emptyFolder, uriUtils } from "../utils/util";
import { messageCollector } from "../diagnose/messageCollector";

import * as vscode from "vscode";
import * as conf from "../utils/configuration";
import * as nodefs from "fs";
import * as path from "path";


export class msdos implements ExecAction {
    name: DosEmulatorType | DosEmulatorType[] = DosEmulatorType.msdos;
    async run(context: ExtensionContext, ctx: ActionContext, api: API): Promise<AsmResult> {
        {
            const terminal = vscode.window.activeTerminal?.name === "msdos-player"
                ? vscode.window.activeTerminal
                : api.msdosPlayer();

            if (ctx.mountMode === conf.MountMode.single) {
                await emptyFolder(ctx.seperateSpaceFolder);
                await vscode.workspace.fs.copy(ctx.fileUri, ctx.fileCopyUri);
            }

            const box = conf.extConf.emulator === conf.DosEmulatorType.dosboxX ? api.dosboxX : api.dosbox;
            if (!nodefs.existsSync(ctx.assemblyToolsFolder.fsPath)) {
                await box.fromBundle(
                    ctx.bundleData,
                    ctx.assemblyToolsFolder,
                    false
                );
            }

            terminal.show();
            api.dosbox.fromBundle(ctx.bundleData, ctx.assemblyToolsFolder);
            const { before, run, debug } = extConf.action;
            if (before) {
                before.forEach(
                    val => {
                        (terminal as vscode.Terminal).sendText(val.replace('C:', ctx.assemblyToolsFolder.fsPath));
                    }
                );
            }

            if (ctx.actionType === conf.ActionType.open) {
                terminal.sendText(`cd "${uriUtils.dirname(ctx.fileUri).fsPath}"`);
            }
            else {
                const workspaceFolder = ctx.mountMode === conf.MountMode.workspace
                    ? ctx.workspaceFolderUri
                    : ctx.seperateSpaceFolder;

                const fileOnDisk = ctx.mountMode === conf.MountMode.workspace
                    ? ctx.fileUri
                    : ctx.fileCopyUri;

                const rel = path.relative(workspaceFolder.fsPath, fileOnDisk.fsPath);

                terminal.sendText(`cd "${workspaceFolder.fsPath}"`);
                const logUri = vscode.Uri.joinPath(ctx.seperateSpaceFolder, ctx.logFileName);
                terminal.sendText(`set asmlog=${logUri.fsPath}`);

                function cb(val: string) {
                    const r = val
                        .replace("${file}", rel)
                        .replace("${filename}", rel.replace(path.extname(rel), ""));
                    if (val.startsWith('>')) {
                        return r.replace(">", "");
                    } else {
                        return r + `>> %asmlog% \n type %asmlog%`;
                    }
                }
                if (ctx.actionType === conf.ActionType.run) {
                    run.map(cb).forEach(val => (terminal as vscode.Terminal).sendText(val));
                }
                if (ctx.actionType === conf.ActionType.debug) {
                    debug.map(cb).forEach(val => (terminal as vscode.Terminal).sendText(val));
                }

                let result = undefined;
                const [hook, promise] = messageCollector();
                nodefs.watchFile(logUri.fsPath, () => {
                    try {
                        if (nodefs.existsSync(logUri.fsPath)) {
                            const text = nodefs.readFileSync(logUri.fsPath, { encoding: 'utf-8' });
                            hook(text);
                        }
                    }
                    catch (e) {
                        console.error(e);
                    }
                });
                //terminal.sendText('exit', true);
                result = await promise;
                return { message: result };
            }
            throw new Error("msdos can't get message");
        }

    }
}
