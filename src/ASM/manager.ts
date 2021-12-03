import * as vscode from 'vscode';

import { API } from './vscode-dosbox';
import * as Diag from '../diagnose/main';
import * as conf from '../utils/configuration';
import { logger } from '../utils/logger';
import { uriUtils } from '../utils/util';

export * from './vscode-dosbox';

export interface AsmResult {
    message: string,
    error?: number,
    warn?: number,
    [id: string]: unknown,
}

export interface ActionContext {
    actionType: conf.ActionType,
    mountMode: conf.MountMode,
    fileUri: vscode.Uri,
    workspaceFolderUri: vscode.Uri,
    doc: vscode.TextDocument,
    fileCopyUri: vscode.Uri,
    logFileName: string,
    assemblyToolsFolder: vscode.Uri,
    seperateSpaceFolder: vscode.Uri,
    bundleData: Uint8Array,
}

export interface ExecAction {
    name: conf.DosEmulatorType | conf.DosEmulatorType[],
    run(context: vscode.ExtensionContext, ctx: ActionContext, api: API): AsmResult | Thenable<AsmResult>
}

function actionMessage(act: conf.ActionType, file: string): string {
    switch (act) {
        case conf.ActionType.open:
            return logger.localize("ASM.openemu.msg", file, conf.extConf.asmType, conf.extConf.emulator);
        case conf.ActionType.run:
            return logger.localize("ASM.run.msg", file, conf.extConf.asmType, conf.extConf.emulator);
        case conf.ActionType.debug:
            return logger.localize("ASM.debug.msg", file, conf.extConf.asmType, conf.extConf.emulator);
    }
}

export function activateManager(context: vscode.ExtensionContext, actions: ExecAction[]) {
    const diag = Diag.activate(context);

    return async function (actionType: conf.ActionType, _uri: vscode.Uri) {
        logger.channel(actionMessage(actionType, _uri.fsPath));

        const vscode_dosbox = vscode.extensions.getExtension<API>('xsro.vscode-dosbox');

        if (vscode_dosbox === undefined) {
            throw new Error("can't get extension xsro.vscode-dosbox");
        }
        let api: API | undefined = vscode_dosbox.exports;
        if (!vscode_dosbox.isActive) {
            api = await vscode_dosbox?.activate();
        }
        logger.log(vscode_dosbox);

        if (api === undefined) {
            throw new Error("can't get api from" + vscode_dosbox?.id);
        }

        const doc = await vscode.workspace.openTextDocument(_uri);
        if (doc.isDirty && conf.extConf.get<boolean>('ASM.savefirst', true)) {
            await doc.save();
        }

        const bundlePath = vscode.Uri.joinPath(
            context.extensionUri,
            conf.extConf.action["baseBundle"].replace('<built-in>/', "resources/")
        );
        const bundleData = await vscode.workspace.fs.readFile(bundlePath);

        const timeStamp = new Date().getTime().toString();

        const seperateSpaceFolder = uriUtils.joinPath(context.globalStorageUri, "workspace");

        const workspaceFolder = vscode.workspace.workspaceFolders?.find(val => _uri.fsPath.includes(val.uri.fsPath));
        let workspaceFolderUri = uriUtils.dirname(_uri);
        if (workspaceFolder === undefined) {
            logger.warn("can't get current vscode workspace of file:" + _uri.fsPath + "use its dir instead");
        } else {
            workspaceFolderUri = workspaceFolder.uri;
        }

        const ctx: ActionContext = {
            actionType,
            mountMode: conf.extConf.get<conf.MountMode>("ASM.mode", conf.MountMode.single),
            assemblyToolsFolder: uriUtils.joinPath(context.globalStorageUri, conf.extConf.asmType),
            fileUri: _uri,
            doc,
            logFileName: timeStamp.substr(timeStamp.length - 5, 8) + '.log'.toUpperCase(),
            fileCopyUri: uriUtils.joinPath(seperateSpaceFolder, ("test" + uriUtils.extname(_uri)).toUpperCase()),
            bundleData,
            seperateSpaceFolder,
            workspaceFolderUri,
        };

        const execAction = actions.find(val => Array.isArray(val.name) ? val.name.includes(conf.extConf.emulator) : (val.name === conf.extConf.emulator));
        if (execAction) {
            const result = await execAction.run(context, ctx, api);
            if (result && result.message) {
                const message = result.message;
                const diagnose = diag.process(message, doc, conf.extConf.asmType);
                if (diagnose) {
                    if (diagnose?.error > 0) {
                        vscode.window.showErrorMessage(logger.localize("ASM.error"));
                        logger.outputChannel.show();
                    }
                    logger.channel(
                        logger.localize('diag.msg', diagnose.error.toString(), diagnose.warn.toString()),
                        "\n\t" + message.replace(/\r/g, "").replace(/[\n]+/g, "\n\t")
                    );
                }
                return {
                    message,
                    error: diagnose?.error,
                    warn: diagnose?.warn
                };
            } else {
                throw new Error("can't get result.message" + JSON.stringify(result));
            }
        } else {
            throw new Error("no action match name" + conf.extConf.emulator);
        }
    };
}
