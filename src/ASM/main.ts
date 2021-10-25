import * as vscode from 'vscode';
import * as path from 'path';
import * as nodefs from 'fs';

import { API } from './vscode-dosbox';
import * as statusBar from './statusBar';
import * as Diag from '../diagnose/main';
import * as conf from '../utils/configuration';

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

export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const diag = Diag.activate(context);

    const vscode_dosbox = vscode.extensions.getExtension('xsro.vscode-dosbox');
    const api: API = await vscode_dosbox?.activate();

    const assemblyToolsFolder = vscode.Uri.joinPath(context.globalStorageUri, conf.extConf.asmType);
    const seperateSpaceFolder = vscode.Uri.joinPath(context.globalStorageUri, "workspace");

    async function singleFileMode(type: actionType, _uri: vscode.Uri) {
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

        let result = "<should-not-return>";

        switch (conf.extConf.emulator) {
            case conf.DosEmulatorType.dosbox:
            case conf.DosEmulatorType.dosboxX:
                const uri = vscode.Uri.joinPath(seperateSpaceFolder, "test" + path.extname(_uri.fsPath));
                await fs.copy(_uri, uri);
                const fileInfo = path.parse(uri.fsPath);
                const folder = vscode.Uri.joinPath(uri, '..');

                const autoexec = [
                    `mount c "${assemblyToolsFolder.fsPath}""`,
                    `mount d "${folder.fsPath}""`,
                    'd:',
                    ...action.before
                ];

                const logFilename = 'box.log';
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
                const _run = box.run();
                const _wait = new Promise<void>(
                    resolve => setTimeout(resolve, 10000)
                );
                await Promise.race([_run, _wait]);
                result = (await fs.readFile(logUri)).toString();
                break;
            case conf.DosEmulatorType.jsdos:
                api.jsdos.setBundle(bundle);
                api.jsdos.runInWebview();
                break;
            case conf.DosEmulatorType.msdos:
                api.msdosPlayer();
                break;
        }

        const diagnose = diag.process(result, doc, conf.extConf.asmType);

        return {
            message: result,
            diagnose
        };
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('masm-tasm.openEmulator', (uri: vscode.Uri) => singleFileMode(actionType.open, uri)),
        vscode.commands.registerCommand('masm-tasm.runASM', (uri: vscode.Uri) => singleFileMode(actionType.run, uri)),
        vscode.commands.registerCommand('masm-tasm.debugASM', (uri: vscode.Uri) => singleFileMode(actionType.debug, uri))
    );
}