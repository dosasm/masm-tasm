import * as vscode from 'vscode';
import * as path from 'path';

import { API } from '../ASM/vscode-dosbox';
import * as statusBar from '../ASM/statusBar';
import * as Diag from '../diagnose/main';
import * as conf from '../utils/configuration';
import { messageCollector } from '../diagnose/messageCollector';
import { logger } from '../utils/logger';
import { getFiles } from '../ASM/util';

const fs = vscode.workspace.fs;

enum actionType {
    open,
    run,
    debug
}

type ACTIONS = {
    [id: string]: {
        baseBundle: string,
        before: string[],
        run: string[],
        debug: string[]
    }
};

export interface AsmResult {
    message?: string,
    error?: number,
    warn?: number
}

function actionMessage(act: conf.actionType, file: string): string {
    switch (act) {
        case conf.actionType.open:
            return logger.localize("ASM.openemu.msg", file, conf.extConf.asmType, conf.extConf.emulator);
        case conf.actionType.run:
            return logger.localize("ASM.run.msg", file, conf.extConf.asmType, conf.extConf.emulator);
        case conf.actionType.debug:
            return logger.localize("ASM.debug.msg", file, conf.extConf.asmType, conf.extConf.emulator);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const diag = Diag.activate(context);

    const vscode_dosbox = vscode.extensions.getExtension('xsro.vscode-dosbox');
    const api: API = await vscode_dosbox?.activate();

    async function singleFileMode(act: actionType, _uri: vscode.Uri): Promise<AsmResult> {
        logger.channel(actionMessage(act, _uri.fsPath));
        const actions: ACTIONS | undefined = vscode.workspace.getConfiguration('masmtasm').get('ASM.actions');
        if (actions === undefined) {
            throw new Error("configurate `masmtasm.ASM.actions` first");
        }
        const action = actions[conf.extConf.asmType];

        const doc = await vscode.workspace.openTextDocument(_uri);

        const bundlePath = vscode.Uri.joinPath(
            context.extensionUri,
            action["baseBundle"].replace('<built-in>/', "resources/")
        );
        const bundle = await fs.readFile(bundlePath);

        let result = "<should-not-return>";

        const fileInfo = path.parse(_uri.fsPath);

        if (conf.extConf.emulator === conf.DosEmulatorType.jsdos) {
            await api.jsdos.jszip.loadAsync(bundle);
            api.jsdos.jszip.file('code/test' + fileInfo.ext, doc.getText());
            const autoexec = [
                `mount c .`,
                `mount d ./code`,
                'd:',
                ...action.before
            ];
            function cb(val: string) {
                const r = val
                    .replace("${file}", 'test' + fileInfo.ext)
                    .replace("${filename}", 'test');
                if (val.startsWith('>')) {
                    return r.replace(">", "");
                }
                return r;
            }
            if (act === actionType.run) {
                autoexec.push(...action.run.map(cb));
            }
            if (act === actionType.debug) {
                autoexec.push(...action.debug.map(cb));
            }
            api.jsdos.updateAutoexec(autoexec);
            const webview = await api.jsdos.runInWebview();
            if (act !== actionType.open) {
                const [hook, promise] = messageCollector();
                webview.onDidReceiveMessage(e => {
                    switch (e.command) {
                        case 'stdout':
                            hook(e.value);
                            break;
                    }
                });
                result = await promise;
            }
        }

        const diagnose = diag.process(result, doc, conf.extConf.asmType);

        return {
            message: result,
            error: diagnose?.error,
            warn: diagnose?.warn
        };
    }

    async function workspaceMode(act: conf.actionType, _uri: vscode.Uri): Promise<AsmResult> {
        logger.channel(actionMessage(act, _uri.fsPath));

        const extConfig = vscode.workspace.getConfiguration('masmtasm');

        const actions: ACTIONS | undefined = extConfig.get('ASM.actions');
        if (actions === undefined) {
            throw new Error("configurate `masmtasm.ASM.actions` first");
        }
        const action = actions[conf.extConf.asmType];

        const doc = await vscode.workspace.openTextDocument(_uri);
        if (doc.isDirty && extConfig.get('ASM.savefirst')) {
            await doc.save();
        }

        const bundlePath = vscode.Uri.joinPath(
            context.extensionUri,
            action["baseBundle"].replace('<built-in>/', "resources/")
        );
        const bundle = await fs.readFile(bundlePath);

        let result = "<should-not-return>";
        const workspaceFolder = vscode.workspace.workspaceFolders?.find(val => {
            const r = path.relative(val.uri.fsPath, _uri.fsPath);
            return !r.startsWith("..");
        });
        if (workspaceFolder === undefined) {
            throw new Error("can't get current workspace of file:" + _uri.fsPath);
        }
        const fileRel = path.relative(workspaceFolder.uri.fsPath, _uri.fsPath);
        const fileInfo = path.parse(fileRel);

        if (conf.extConf.emulator === conf.DosEmulatorType.jsdos) {
            await api.jsdos.jszip.loadAsync(bundle);
            for await (const f of getFiles(workspaceFolder.uri)) {
                const rel = path.relative(workspaceFolder.uri.fsPath, f.fsPath);
                const dst = path.posix.join('code/', rel);
                const _data = await fs.readFile(f);
                api.jsdos.jszip.file(dst, _data);
            }
            const autoexec = [
                `mount c .`,
                `mount d ./code`,
                'd:',
                `cd ${fileInfo.dir}`,
                ...action.before
            ];
            function cb(val: string) {
                const r = val
                    .replace("${file}", fileInfo.base)
                    .replace("${filename}", fileInfo.name);
                if (val.startsWith('>')) {
                    return r.replace(">", "");
                }
                return r;
            }
            if (act === conf.actionType.run) {
                autoexec.push(...action.run.map(cb));
            }
            if (act === conf.actionType.debug) {
                autoexec.push(...action.debug.map(cb));
            }
            api.jsdos.updateAutoexec(autoexec);
            const webview = await api.jsdos.runInWebview();
            if (act !== conf.actionType.open) {
                const [hook, promise] = messageCollector();
                webview.onDidReceiveMessage(e => {
                    switch (e.command) {
                        case 'stdout':
                            hook(e.value);
                            break;
                    }
                });
                result = await promise;
            }
        }

        const diagnose = diag.process(result, doc, conf.extConf.asmType);
        if (diagnose) {
            if (diagnose?.error > 0) {
                vscode.window.showErrorMessage(logger.localize("ASM.error"));
                logger.outputChannel.show();
            }
            logger.channel(
                logger.localize('diag.msg', diagnose.error.toString(), diagnose.warn.toString()),
                "\n\t" + result.replace(/\r/g, "").replace(/[\n]+/g, "\n\t")
            );
        }

        return {
            message: result,
            error: diagnose?.error,
            warn: diagnose?.warn
        };
    }

    const workingMode = () => {
        const mode = conf.extConf._conf.get("ASM.mode");
        switch (mode) {
            case "workspace":
                return workspaceMode;
                break;
            case "single file":
            default:
                return singleFileMode;
                break;
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('masm-tasm.openEmulator', (uri: vscode.Uri) => workingMode()(conf.actionType.open, uri)),
        vscode.commands.registerCommand('masm-tasm.runASM', (uri: vscode.Uri) => workingMode()(conf.actionType.run, uri)),
        vscode.commands.registerCommand('masm-tasm.debugASM', (uri: vscode.Uri) => workingMode()(conf.actionType.debug, uri))
    );
}