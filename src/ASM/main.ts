import * as vscode from 'vscode';
import * as path from 'path';
import * as nodefs from 'fs';

import { API } from './vscode-dosbox';
import * as statusBar from './statusBar';
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

        if (nodefs.existsSync(seperateSpaceFolder.fsPath)) {
            await fs.delete(seperateSpaceFolder, { recursive: true, useTrash: false });
        }
        await fs.createDirectory(seperateSpaceFolder);
        if (nodefs.existsSync(assemblyToolsFolder.fsPath)) {
            await fs.delete(assemblyToolsFolder, { recursive: true, useTrash: false });
        }
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

        const timeStamp = new Date().getTime().toString();
        const logFilename = timeStamp.substr(timeStamp.length - 5, 8) + '.log'.toUpperCase();

        let result = "<should-not-return>";
        const uri = vscode.Uri.joinPath(seperateSpaceFolder, ("test" + path.extname(_uri.fsPath)).toUpperCase());
        await fs.copy(_uri, uri);
        const fileInfo = path.parse(uri.fsPath);
        const folder = vscode.Uri.joinPath(uri, '..');

        if (conf.extConf.emulator === conf.DosEmulatorType.dosbox || conf.extConf.emulator === conf.DosEmulatorType.dosboxX) {
            const autoexec = [
                `mount c "${assemblyToolsFolder.fsPath}""`,
                `mount d "${folder.fsPath}""`,
                'd:',
                ...action.before
            ];
            const logUri = vscode.Uri.joinPath(assemblyToolsFolder, logFilename);
            if (nodefs.existsSync(logUri.fsPath)) {
                await fs.delete(logUri);
            }
            function cb(val: string) {
                const r = val
                    .replace("${file}", fileInfo.base)
                    .replace("${filename}", fileInfo.name);
                if (val.startsWith('>')) {
                    return r.replace(">", "");
                }
                return r + " >>C:\\" + logFilename;
            }
            if (type === actionType.run) {
                autoexec.push(...action.run.map(cb));
            }
            if (type === actionType.debug) {
                autoexec.push(...action.debug.map(cb));
            }

            autoexec.push("exit");

            const box = conf.extConf.emulator === conf.DosEmulatorType.dosboxX ? api.dosboxX : api.dosbox;
            await box.fromBundle(bundle, assemblyToolsFolder);
            box.updateAutoexec(autoexec);

            if (type !== actionType.open) {
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
                promise.then(val => {
                    console.log(val);
                });
            }

            await box.run();

            if (result === '<should-not-return>') {
                if (nodefs.existsSync(logUri.fsPath)) {
                    result = nodefs.readFileSync(logUri.fsPath, { encoding: 'utf-8' });
                }
            }
        }

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

        if (conf.extConf.emulator === conf.DosEmulatorType.msdos) {
            const terminal = api.msdosPlayer();

            terminal.show();
            api.dosbox.fromBundle(bundle, assemblyToolsFolder);
            action.before.forEach(
                val => {
                    (terminal as vscode.Terminal).sendText(val.replace('C:', assemblyToolsFolder.fsPath));
                }
            );
            if (type === actionType.open) {
                terminal.sendText(`cd "${vscode.Uri.joinPath(_uri, '..').fsPath}"`);
            }
            else {
                terminal.sendText(`cd "${folder.fsPath}"`);
                function cb(val: string) {
                    const r = val
                        .replace("${file}", fileInfo.base)
                        .replace("${filename}", fileInfo.name);
                    if (val.startsWith('>')) {
                        return r.replace(">", "");
                    } else {
                        return r + `>> ${logFilename} \n type ${logFilename}`;
                    }
                }
                if (type === actionType.run) {
                    action.run.map(cb).forEach(val => (terminal as vscode.Terminal).sendText(val));
                }
                if (type === actionType.debug) {
                    action.debug.map(cb).forEach(val => (terminal as vscode.Terminal).sendText(val));
                }
                const logUri = vscode.Uri.joinPath(folder, logFilename);
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