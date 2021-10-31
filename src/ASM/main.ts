import * as vscode from 'vscode';
import * as path from 'path';
import * as nodefs from 'fs';

import { API } from './vscode-dosbox';
import * as statusBar from './statusBar';
import * as Diag from '../diagnose/main';
import * as conf from '../utils/configuration';
import { messageCollector } from '../diagnose/messageCollector';
import { logger } from '../utils/logger';
import { getFiles } from './util';

const fs = vscode.workspace.fs;

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

async function emptyFolder(folder: string) {
    if (nodefs.existsSync(folder)) {
        await nodefs.promises.rm(folder, { recursive: true });
    }
    if (!nodefs.existsSync(folder)) {
        await nodefs.promises.mkdir(folder, { recursive: true });
    }
}

export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const diag = Diag.activate(context);

    const vscode_dosbox = vscode.extensions.getExtension('xsro.vscode-dosbox');
    const api: API = await vscode_dosbox?.activate();

    const assemblyToolsFolder = vscode.Uri.joinPath(context.globalStorageUri, conf.extConf.asmType);
    const seperateSpaceFolder = vscode.Uri.joinPath(context.globalStorageUri, "workspace");

    async function singleFileMode(act: conf.actionType, _uri: vscode.Uri): Promise<AsmResult> {
        logger.channel(actionMessage(act, _uri.fsPath));

        const extConfig = vscode.workspace.getConfiguration('masmtasm');

        await emptyFolder(assemblyToolsFolder.fsPath);
        await emptyFolder(seperateSpaceFolder.fsPath);

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
            if (act === conf.actionType.run) {
                autoexec.push(...action.run.map(cb));
            }
            if (act === conf.actionType.debug) {
                autoexec.push(...action.debug.map(cb));
            }

            const box = conf.extConf.emulator === conf.DosEmulatorType.dosboxX ? api.dosboxX : api.dosbox;
            await box.fromBundle(bundle, assemblyToolsFolder, false);

            if (act !== conf.actionType.open) {
                switch (extConfig.get('dosbox.run')) {
                    case "keep":
                        break;
                    case "exit":
                        autoexec.push('exit');
                        break;
                    case 'pause':
                        autoexec.push('pause', 'exit');
                        break;
                    case "choose":
                    default:
                        autoexec.push(
                            "@choice Do you need to keep the DOSBox",
                            "@IF ERRORLEVEL 2 exit",
                            "@IF ERRORLEVEL 1 echo on"
                        );
                        break;
                }
            }

            const dosboxConf: { [id: string]: string } | undefined =
                conf.extConf.emulator === conf.DosEmulatorType.dosboxX
                    ? vscode.workspace.getConfiguration("masmtasm").get("dosbox.config")
                    : vscode.workspace.getConfiguration("masmtasm").get("dosboxX.config");
            if (dosboxConf) {
                for (const id in dosboxConf) {
                    const [section, key] = id.toLowerCase().split('.');
                    const value = dosboxConf[id];
                    box.updateConf(section, key, value);
                }
            }

            box.updateAutoexec(autoexec);

            if (act !== conf.actionType.open) {
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

        if (conf.extConf.emulator === conf.DosEmulatorType.msdos) {
            const terminal = api.msdosPlayer();

            terminal.show();
            api.dosbox.fromBundle(bundle, assemblyToolsFolder);
            action.before.forEach(
                val => {
                    (terminal as vscode.Terminal).sendText(val.replace('C:', assemblyToolsFolder.fsPath));
                }
            );
            if (act === conf.actionType.open) {
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
                if (act === conf.actionType.run) {
                    action.run.map(cb).forEach(val => (terminal as vscode.Terminal).sendText(val));
                }
                if (act === conf.actionType.debug) {
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

    async function workspaceMode(act: conf.actionType, _uri: vscode.Uri): Promise<AsmResult> {
        logger.channel(actionMessage(act, _uri.fsPath));

        const extConfig = vscode.workspace.getConfiguration('masmtasm');

        emptyFolder(assemblyToolsFolder.fsPath);

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

        const timeStamp = new Date().getTime().toString();
        const logFilename = timeStamp.substr(timeStamp.length - 5, 8) + '.log'.toUpperCase();

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
        const folder = vscode.Uri.joinPath(_uri, "..");

        if (conf.extConf.emulator === conf.DosEmulatorType.dosbox || conf.extConf.emulator === conf.DosEmulatorType.dosboxX) {
            const autoexec = [
                `mount c "${assemblyToolsFolder.fsPath}""`,
                `mount d "${workspaceFolder.uri.fsPath}""`,
                'd:',
                `cd ${fileInfo.dir}`,
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
            if (act === conf.actionType.run) {
                autoexec.push(...action.run.map(cb));
            }
            if (act === conf.actionType.debug) {
                autoexec.push(...action.debug.map(cb));
            }

            const box = conf.extConf.emulator === conf.DosEmulatorType.dosboxX ? api.dosboxX : api.dosbox;
            await box.fromBundle(bundle, assemblyToolsFolder);

            if (act !== conf.actionType.open) {
                switch (extConfig.get('dosbox.run')) {
                    case "keep":
                        break;
                    case "exit":
                        autoexec.push('exit');
                        break;
                    case 'pause':
                        autoexec.push('pause', 'exit');
                        break;
                    case "choose":
                    default:
                        autoexec.push(
                            "@choice Do you need to keep the DOSBox",
                            "@IF ERRORLEVEL 2 exit",
                            "@IF ERRORLEVEL 1 echo on"
                        );
                        break;
                }
            }

            const dosboxConf: { [id: string]: string } | undefined =
                conf.extConf.emulator === conf.DosEmulatorType.dosboxX
                    ? vscode.workspace.getConfiguration("masmtasm").get("dosbox.config")
                    : vscode.workspace.getConfiguration("masmtasm").get("dosboxX.config");
            if (dosboxConf) {
                for (const id in dosboxConf) {
                    const [section, key] = id.toLowerCase().split('.');
                    const value = dosboxConf[id];
                    box.updateConf(section, key, value);
                }
            }

            box.updateAutoexec(autoexec);

            if (act !== conf.actionType.open) {
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
            for await (const f of getFiles(workspaceFolder.uri.fsPath)) {
                const rel = path.relative(workspaceFolder.uri.fsPath, f);
                const dst = path.posix.join('code/', rel);
                const _data = await fs.readFile(vscode.Uri.file(f));
                const fileContent = new TextDecoder().decode(_data);
                api.jsdos.jszip.file(dst, fileContent);
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

        if (conf.extConf.emulator === conf.DosEmulatorType.msdos) {
            const terminal = api.msdosPlayer();

            terminal.show();
            api.dosbox.fromBundle(bundle, assemblyToolsFolder);
            action.before.forEach(
                val => {
                    (terminal as vscode.Terminal).sendText(val.replace('C:', assemblyToolsFolder.fsPath));
                }
            );
            if (act === conf.actionType.open) {
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
                if (act === conf.actionType.run) {
                    action.run.map(cb).forEach(val => (terminal as vscode.Terminal).sendText(val));
                }
                if (act === conf.actionType.debug) {
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

    const mode = vscode.workspace.getConfiguration('masmtasm').get('ASM.mode');
    let workingMode = singleFileMode;
    switch (mode) {
        case "workspace":
            workingMode = workspaceMode;
            break;
        case "single file":
            workingMode = singleFileMode;
            const msg = logger.localize("ASM.singleFileMode", seperateSpaceFolder.fsPath);
            logger.channel(msg);
            break;
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('masm-tasm.openEmulator', (uri: vscode.Uri) => workingMode(conf.actionType.open, uri)),
        vscode.commands.registerCommand('masm-tasm.runASM', (uri: vscode.Uri) => workingMode(conf.actionType.run, uri)),
        vscode.commands.registerCommand('masm-tasm.debugASM', (uri: vscode.Uri) => workingMode(conf.actionType.debug, uri))
    );
}