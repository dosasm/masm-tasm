import * as vscode from 'vscode';
import * as path from 'path';

import { API } from '../ASM/vscode-dosbox';
import * as statusBar from '../ASM/statusBar';
import * as Diag from '../diagnose/main';
import * as conf from '../utils/configuration';
import { messageCollector } from '../diagnose/messageCollector';

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

export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const diag = Diag.activate(context);

    const vscode_dosbox = vscode.extensions.getExtension('xsro.vscode-dosbox');
    const api: API = await vscode_dosbox?.activate();

    const assemblyToolsFolder = vscode.Uri.joinPath(context.globalStorageUri, conf.extConf.asmType);
    const seperateSpaceFolder = vscode.Uri.joinPath(context.globalStorageUri, "workspace");

    async function singleFileMode(type: actionType, _uri: vscode.Uri): Promise<AsmResult> {

        await fs.createDirectory(assemblyToolsFolder);

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
        const uri = vscode.Uri.joinPath(seperateSpaceFolder, ("test" + path.extname(_uri.fsPath)).toUpperCase());
        await fs.copy(_uri, uri);
        const fileInfo = path.parse(uri.fsPath);

        if (conf.extConf.emulator === conf.DosEmulatorType.jsdos) {
            await api.jsdos.jszip.loadAsync(bundle);
            api.jsdos.jszip.file('code/' + fileInfo.base, doc.getText());
            const autoexec = [
                `mount c .`,
                `mount d ./code`,
                'd:',
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
            if (type === actionType.run) {
                autoexec.push(...action.run.map(cb));
            }
            if (type === actionType.debug) {
                autoexec.push(...action.debug.map(cb));
            }
            api.jsdos.updateAutoexec(autoexec);
            const webview = await api.jsdos.runInWebview();
            if (type !== actionType.open) {
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

    context.subscriptions.push(
        vscode.commands.registerCommand('masm-tasm.openEmulator', (uri: vscode.Uri) => singleFileMode(actionType.open, uri)),
        vscode.commands.registerCommand('masm-tasm.runASM', (uri: vscode.Uri) => singleFileMode(actionType.run, uri)),
        vscode.commands.registerCommand('masm-tasm.debugASM', (uri: vscode.Uri) => singleFileMode(actionType.debug, uri))
    );
}