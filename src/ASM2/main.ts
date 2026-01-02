import * as vscode from "vscode";
import * as statusBar from './statusBar';
import { logger } from "../utils/logger";
import * as conf from '../utils/configuration';
import { uriUtils } from "../utils/util";
import { activateJSdos } from "./jsdos/main";
import { runJsdos } from "./jsdos-run";
import { CIManager, JSdosCi } from "./jsdos";
import * as path from "path";

async function ensureFileOpenn(uri: vscode.Uri) {
    let _uri = uri;
    if (_uri === undefined && vscode.window.activeTextEditor) {
        _uri = vscode.window.activeTextEditor.document.uri;
    }
    if (_uri === undefined) {
        logger.channel("cannot find the file", uri.fsPath);
        return undefined;
    }

    const doc = await vscode.workspace.openTextDocument(_uri);
    if (doc.isDirty && conf.extConf.get<boolean>('ASM.savefirst', true)) {
        await doc.save();
    }
    return _uri;
}

async function getBundle(context: vscode.ExtensionContext) {
    const bundlePath = vscode.Uri.joinPath(
        context.extensionUri,
        conf.extConf.action["baseBundle"].replace('<built-in>/', "resources/")
    );
    const bundleData = await vscode.workspace.fs.readFile(bundlePath);
    return bundleData
}

function getWorksapceUri(_uri: vscode.Uri) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(val => _uri.fsPath.includes(val.uri.fsPath));
    let workspaceFolderUri = uriUtils.dirname(_uri);
    if (workspaceFolder === undefined) {
        logger.warn("can't get current vscode workspace of file: " + _uri.fsPath + "\n use its folder instead");
    } else {
        workspaceFolderUri = workspaceFolder.uri;
    }
    return workspaceFolderUri;
}

export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const timeStamp = new Date().getTime().toString();
    const seperateSpaceFolder = uriUtils.joinPath(context.globalStorageUri, "workspace");
    const jsdos_api = activateJSdos(context);
    const cis = new CIManager(context);

    async function openEmulator(uri: vscode.Uri,
        manipulateAutoexec?: (autoexec: string[], fileInJsdos: string) => void) {
        logger.channel("open emulator at file", uri.fsPath);
        let uri2 = await ensureFileOpenn(uri);
        let bundleData = await getBundle(context);
        let workspaceUri = getWorksapceUri(uri);
        const mountMode = conf.extConf.get<conf.MountMode>("ASM.mode", conf.MountMode.single);
        let ci = await runJsdos(jsdos_api, bundleData, workspaceUri, uri2, mountMode,manipulateAutoexec);
        cis.addCI(ci);
        let t = cis.last.terminal();
        cis.showWebview();
    }

    function manipulateAutoexecRun(autoexec: string[], fileInJsdos: string) {
        const fileinfo = path.parse(fileInJsdos);
        function cb(val: string) {
            const r = val
                .replace("${file}", fileInJsdos)
                .replace("${filename}", fileInJsdos.replace(fileinfo.ext, ""));
            if (val.startsWith('>')) {
                return r.replace(">", "");
            }
            return r;
        }
        autoexec.push(...conf.extConf.action.run.map(cb));
    }

    function runASM(uri: vscode.Uri) {
        openEmulator(uri,manipulateAutoexecRun)
    }

    function manipulateAutoexecDebug(autoexec: string[], fileInJsdos: string) {
        const fileinfo = path.parse(fileInJsdos);
        function cb(val: string) {
            const r = val
                .replace("${file}", fileInJsdos)
                .replace("${filename}", fileInJsdos.replace(fileinfo.ext, ""));
            if (val.startsWith('>')) {
                return r.replace(">", "");
            }
            return r;
        }
        autoexec.push(...conf.extConf.action.debug.map(cb));
    }

    function debugASM(uri: vscode.Uri) {
        openEmulator(uri,manipulateAutoexecDebug)
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('masm-tasm.openEmulator', openEmulator),
        vscode.commands.registerCommand('masm-tasm.runASM', runASM),
        vscode.commands.registerCommand('masm-tasm.debugASM', debugASM)
    );
}