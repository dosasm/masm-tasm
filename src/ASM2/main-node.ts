import { ExtensionContext, workspace } from "vscode";
import { activateDosbox, DOSBox } from "./dosbox/main";
import { Utils } from 'vscode-uri';
import * as path from "path";
import { messageCollector } from "../diagnose/messageCollector";

import * as nodefs from "fs";
import * as conf from "../utils/configuration";
import { emptyFolder } from "../utils/util";

import * as vscode from "vscode";
import * as statusBar from './statusBar';
import { logger } from "../utils/logger";
import { uriUtils } from "../utils/util";
import { activateJSdos } from "./jsdos/main";
import { CIManager } from "./jsdos";
import * as jsdos from "./main";

let USE_NODEFS_WATCH = true;

const fs = workspace.fs;

function updateDosboxConf(box: DOSBox) {
    let confSting = "dosbox.config";
    if (conf.extConf.emulator === conf.DosEmulatorType.dosboxX) {
        confSting = "dosboxX.config";
    }
    if (conf.extConf._conf.has(confSting)) {
        const dosboxConf: { [id: string]: string } | undefined = conf.extConf._conf.get(confSting);
        if (dosboxConf) {
            for (const id in dosboxConf) {
                const [section, key] = id.toLowerCase().split('.');
                const value = dosboxConf[id];
                box.updateConf(section, key, value);
            }
        }
    }
}

export class Dosbox {
    name: conf.DosEmulatorType[] = [
        conf.DosEmulatorType.dosbox,
        conf.DosEmulatorType.dosboxX
    ];
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

export async function makeDosboxActionContext(actionType: conf.ActionType, _uri: vscode.Uri, context: vscode.ExtensionContext) {
    if (_uri === undefined && vscode.window.activeTextEditor) {
        _uri = vscode.window.activeTextEditor.document.uri;
    }
    if (_uri === undefined) {
        throw new Error("no file finded");
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
        logger.warn("can't get current vscode workspace of file: " + _uri.fsPath + "\n use its folder instead");
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

    return ctx;
}

async function runDosboxOrX(context: ExtensionContext, ctx: ActionContext, box: DOSBox): Promise<jsdos.AsmResult> {
    jsdos.logActionMessage(ctx.actionType,ctx.fileUri?ctx.fileUri.fsPath:"undefined");
    if (ctx.mountMode === conf.MountMode.single) {
        await emptyFolder(ctx.seperateSpaceFolder);
        await fs.copy(ctx.fileUri, ctx.fileCopyUri);
    }
    if (!nodefs.existsSync(ctx.assemblyToolsFolder.fsPath)) {
        await box.fromBundle(
            ctx.bundleData,
            ctx.assemblyToolsFolder,
            false
        );
    }

    const workspaceFolder = ctx.mountMode === conf.MountMode.workspace
        ? ctx.workspaceFolderUri
        : ctx.seperateSpaceFolder;

    const autoexec = [
        `mount c "${ctx.assemblyToolsFolder.fsPath}""`,
        `mount d "${workspaceFolder.fsPath}""`,
        'd:'
    ];


    const before = conf.extConf.action.before;
    if (before) {
        autoexec.push(...before);
    }

    const logUri = Utils.joinPath(ctx.assemblyToolsFolder, ctx.logFileName);

    const rel = path.relative(
        workspaceFolder.fsPath,
        ctx.mountMode === conf.MountMode.single ? ctx.fileCopyUri.fsPath : ctx.fileUri.fsPath,
    );
    const fileInDosbox = path.win32.resolve("D:\\", rel);
    const fileinfo = path.parse(fileInDosbox);
    function cb(val: string) {
        const r = val
            .replace("${file}", fileInDosbox)
            .replace("${filename}", fileInDosbox.replace(fileinfo.ext, ""));
        if (val.startsWith('>')) {
            return r.replace(">", "");
        }
        return r + " >>C:\\" + ctx.logFileName;
    }
    if (ctx.actionType === conf.ActionType.run) {
        autoexec.push(...conf.extConf.action.run.map(cb));
    }
    if (ctx.actionType === conf.ActionType.debug) {
        autoexec.push(...conf.extConf.action.debug.map(cb));
    }

    if (ctx.actionType !== conf.ActionType.open) {
        switch (conf.extConf.get<string>('dosbox.run', "choose")) {
            case "keep":
                break;
            case "exit":
                autoexec.push('exit');
                USE_NODEFS_WATCH = false;
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

    updateDosboxConf(box);
    box.updateAutoexec(autoexec);

    let result = undefined;

    const [hook, promise] = messageCollector();
    if (ctx.actionType !== conf.ActionType.open && USE_NODEFS_WATCH) {
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
    }

    await box.run().catch(e => {
        console.error("dosbox run error", e);
        throw new Error(e);
    });

    if (result === undefined) {
        if (nodefs.existsSync(logUri.fsPath)) {
            result = nodefs.readFileSync(logUri.fsPath, { encoding: 'utf-8' });
            hook(result);
        }
    }

    const message = await promise;

    if (result === undefined) {
        throw new Error("can't get dosbox's result" + logUri.fsPath);
    }
    return { message, result };
}


export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const jsdos_api = activateJSdos(context);
    const dosbox_api = await activateDosbox(context);
    const cis = new CIManager(context);

    async function openEmulatorRunDebug(openOrRunOrDebug:conf.ActionType,uri: vscode.Uri) {
        const ctx=await makeDosboxActionContext(openOrRunOrDebug,uri,context)
        if (conf.extConf.emulator === conf.DosEmulatorType.dosboxX || conf.extConf.emulator === conf.DosEmulatorType.dosbox) {
            const box = conf.extConf.emulator === conf.DosEmulatorType.dosboxX ? dosbox_api.dosboxX : dosbox_api.dosbox;
            await runDosboxOrX(context, ctx, box)
        }
        if (conf.extConf.emulator === conf.DosEmulatorType.jsdos) {
            await jsdos.openEmulatorRunDebug(openOrRunOrDebug,uri, cis, context, jsdos_api)
        }
    }

    function openEmulator(uri:vscode.Uri){
        openEmulatorRunDebug(conf.ActionType.open,uri)
    }

    function runASM(uri: vscode.Uri) {
        openEmulatorRunDebug(conf.ActionType.run,uri)
    }


    function debugASM(uri: vscode.Uri) {
        openEmulatorRunDebug(conf.ActionType.debug,uri)
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('masm-tasm.openEmulator', openEmulator),
        vscode.commands.registerCommand('masm-tasm.runASM', runASM),
        vscode.commands.registerCommand('masm-tasm.debugASM', debugASM)
    );
}