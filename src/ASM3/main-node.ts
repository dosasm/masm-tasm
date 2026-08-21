/**
 * main-node.ts — Desktop 入口（支持 DOSBox + jsdos）
 *
 * 此文件是 Node.js 环境的扩展入口，支持所有四种模拟器：
 * - dosbox / dosbox-x：通过子进程调用本地 DOSBox
 * - jsdos / jsdos-x：通过 WebAssembly 在浏览器中运行
 *
 * jsdos 路径复用 run.ts 的逻辑，DOSBox 路径在此文件中实现。
 */

import * as vscode from "vscode";
import * as path from "path";
import * as nodefs from "fs";
import { Utils } from "vscode-uri";

import { ActionType, DosEmulatorType } from "./types";
import * as config from "./config";
import { emptyFolder, uriUtils } from "../utils/util";
import { logger } from "../utils/logger";
import * as statusBar from "./statusBar";
import * as Diag from "../diagnose/main";
import { activateDosbox, DOSBox } from "./dosbox/main";
import { activateJSdos } from "./jsdos/main";
import { CIManager } from "./jsdos";
import { runJsdos, resolveFile, resolveBundleData, logAction, loadDosasmConfig, type DosasmConfig } from "./run";
import { expandCommand, ExpandVars, findBundleRefs, getBundleUri } from "./dosasm-toml";

// ─── DOSBox 执行上下文 ────────────────────────────────────

interface DosboxContext {
    actionType: ActionType;
    fileUri: vscode.Uri;
    doc: vscode.TextDocument;
    fileCopyUri: vscode.Uri;
    logFileName: string;
    assemblyToolsFolder: vscode.Uri;
    seperateSpaceFolder: vscode.Uri;
    tomlConfig: DosasmConfig | null;
    bundleFolderMap: Map<string, string>;
}

/** 构建 DOSBox 执行上下文 */
async function makeDosboxContext(
    actionType: ActionType,
    uri: vscode.Uri,
    context: vscode.ExtensionContext,
    tomlConfig: DosasmConfig | null
): Promise<DosboxContext> {
    const resolved = await resolveFile(uri);
    if (!resolved) throw new Error("no file found");

    const timeStamp = Date.now().toString();
    const seperateSpaceFolder = uriUtils.joinPath(context.globalStorageUri, "workspace");

    return {
        actionType,
        fileUri: resolved.uri,
        doc: resolved.doc,
        assemblyToolsFolder: uriUtils.joinPath(context.globalStorageUri, config.getAssembler()),
        logFileName: timeStamp.substring(timeStamp.length - 5) + ".log".toUpperCase(),
        fileCopyUri: uriUtils.joinPath(seperateSpaceFolder, ("test" + uriUtils.extname(resolved.uri)).toUpperCase()),
        seperateSpaceFolder,
        tomlConfig,
        bundleFolderMap: new Map(),
    };
}

// ─── DOSBox bundle 解压 ──────────────────────────────────

/** 将 toml 引用的 bundle 解压到磁盘，返回 bundle 名 → 解压路径的映射 */
async function extractTomlBundles(
    tomlConfig: DosasmConfig,
    context: vscode.ExtensionContext,
    box: DOSBox
): Promise<Map<string, string>> {
    const bundleMap = new Map<string, string>();
    for (const bundleName of findBundleRefs(tomlConfig.action.before)) {
        const extractFolder = vscode.Uri.joinPath(context.globalStorageUri, "bundles", bundleName.replace(".jsdos", ""));
        if (!nodefs.existsSync(extractFolder.fsPath)) {
            const data = await vscode.workspace.fs.readFile(getBundleUri(context.extensionUri, bundleName));
            await box.fromBundle(data, extractFolder, false);
            logger.channel(`Extracted bundle ${bundleName} to ${extractFolder.fsPath}`);
        }
        bundleMap.set(bundleName, extractFolder.fsPath);
    }
    return bundleMap;
}

// ─── DOSBox autoexec 构建 ────────────────────────────────

/** 获取要执行的命令列表 */
function getCommands(actionType: ActionType, tomlConfig: DosasmConfig | null): string[] {
    if (tomlConfig) {
        const a = tomlConfig.action;
        return actionType === ActionType.run ? a.run
            : actionType === ActionType.debug ? a.debug
                : a.open ?? [];
    }
    const action = config.getAction();
    return actionType === ActionType.run ? action.run
        : actionType === ActionType.debug ? action.debug
            : [];
}

/** 构建 DOSBox 的 autoexec 命令数组 */
function buildDosboxAutoexec(
    actionType: ActionType,
    tomlConfig: DosasmConfig | null,
    ctx: DosboxContext,
    context: vscode.ExtensionContext
): string[] {
    const autoexec: string[] = [];

    if (tomlConfig) {
        // toml 模式：由 toml 控制所有挂载
        const vars: ExpandVars = {
            file: ctx.fileCopyUri.fsPath,
            filename: ctx.fileCopyUri.fsPath.replace(path.parse(ctx.fileCopyUri.fsPath).ext, ""),
            actionFolder: tomlConfig.actionFolder.fsPath,
            bundlePath: "", // 由 bundleFolderMap 替换
        };

        function expandDosboxCmd(cmd: string): string {
            let r = expandCommand(cmd, vars);
            r = r.replace(/\$\{<built-in>\/([^}]+)\}/g, (_m, name: string) => {
                const p = ctx.bundleFolderMap.get(name);
                return p ? `"${p}"` : `"${getBundleUri(context.extensionUri, name).fsPath}"`;
            });
            return r;
        }

        autoexec.push(...tomlConfig.action.before.map(expandDosboxCmd));

        const commands = getCommands(actionType, tomlConfig);
        for (const cmd of commands) {
            let r = expandDosboxCmd(cmd);
            if (!cmd.startsWith(">")) r += " >>C:\\" + ctx.logFileName;
            autoexec.push(r);
        }
    } else {
        // 默认单文件模式
        autoexec.push(
            `mount c "${ctx.assemblyToolsFolder.fsPath}"`,
            `mount d "${ctx.seperateSpaceFolder.fsPath}"`,
            "d:"
        );

        const before = config.getAction().before;
        if (before) autoexec.push(...before);

        const rel = path.relative(ctx.seperateSpaceFolder.fsPath, ctx.fileCopyUri.fsPath);
        const fileInDosbox = path.win32.resolve("D:\\", rel);
        const vars: ExpandVars = {
            file: fileInDosbox,
            filename: fileInDosbox.replace(path.parse(fileInDosbox).ext, ""),
            actionFolder: "",
            bundlePath: "",
        };

        const commands = getCommands(actionType, null);
        for (const cmd of commands) {
            let r = expandCommand(cmd, vars);
            if (!cmd.startsWith(">")) r += " >>C:\\" + ctx.logFileName;
            autoexec.push(r);
        }
    }

    // DOSBox 退出行为
    if (actionType !== ActionType.open) {
        switch (config.getDosboxRun()) {
            case "exit":
                autoexec.push("exit");
                break;
            case "pause":
                autoexec.push("pause", "exit");
                break;
            case "choose":
                autoexec.push("@choice Do you need to keep the DOSBox", "@IF ERRORLEVEL 2 exit", "@IF ERRORLEVEL 1 echo on");
                break;
        }
    }

    return autoexec;
}

// ─── DOSBox 配置更新 ─────────────────────────────────────

function updateDosboxConf(box: DOSBox, emulator: DosEmulatorType): void {
    const dosboxConf = config.getDosboxConfig(emulator);
    if (dosboxConf) {
        for (const id in dosboxConf) {
            const [section, key] = id.toLowerCase().split(".");
            box.updateConf(section, key, dosboxConf[id]);
        }
    }
}

// ─── DOSBox 执行 ─────────────────────────────────────────

/**
 * 在 DOSBox 中执行汇编程序。
 *
 * 流程：
 * 1. 复制文件到隔离目录
 * 2. 解压 bundle（如有 toml 引用）
 * 3. 构建 autoexec 命令
 * 4. 启动 DOSBox 子进程，监视日志文件
 */
async function runDosbox(
    context: vscode.ExtensionContext,
    ctx: DosboxContext,
    box: DOSBox
): Promise<{ message: string; result: string }> {
    logAction(ctx.actionType, ctx.fileUri.fsPath);

    // 准备隔离目录
    await emptyFolder(ctx.seperateSpaceFolder);
    await vscode.workspace.fs.copy(ctx.fileUri, ctx.fileCopyUri);

    // 解压 bundle（toml 模式）
    if (ctx.tomlConfig && ctx.bundleFolderMap.size === 0) {
        ctx.bundleFolderMap = await extractTomlBundles(ctx.tomlConfig, context, box);
    }

    // 解压默认 bundle（单文件模式）
    if (!ctx.tomlConfig && !nodefs.existsSync(ctx.assemblyToolsFolder.fsPath)) {
        const bundleData = await resolveBundleData(context, null);
        await box.fromBundle(bundleData, ctx.assemblyToolsFolder, false);
    }

    // 构建并设置 autoexec
    const autoexec = buildDosboxAutoexec(ctx.actionType, ctx.tomlConfig, ctx, context);
    updateDosboxConf(box, config.getEmulator());
    box.updateAutoexec(autoexec);

    // 启动 DOSBox 并监视日志
    const logUri = Utils.joinPath(ctx.assemblyToolsFolder, ctx.logFileName);
    const [hook, promise] = Diag.messageCollector();
    let useNodefsWatch = true;

    if (ctx.actionType !== ActionType.open) {
        // 检查 autoexec 中是否有 exit 命令
        if (autoexec.includes("exit")) useNodefsWatch = false;
    }

    if (ctx.actionType !== ActionType.open && useNodefsWatch) {
        nodefs.watchFile(logUri.fsPath, () => {
            try {
                if (nodefs.existsSync(logUri.fsPath)) {
                    hook(nodefs.readFileSync(logUri.fsPath, { encoding: "utf-8" }));
                }
            } catch (e) { console.error(e); }
        });
    }

    await box.run().catch(e => { throw new Error(e); });

    let result: string | undefined;
    if (nodefs.existsSync(logUri.fsPath)) {
        result = nodefs.readFileSync(logUri.fsPath, { encoding: "utf-8" });
        hook(result);
    }

    const message = await promise;
    if (!result) throw new Error("can't get dosbox's result" + logUri.fsPath);
    return { message, result };
}

// ─── 入口 ─────────────────────────────────────────────────

/**
 * 扩展激活函数（Desktop 版本）。
 *
 * 注册三个命令，根据配置的 emulator 类型分发到 DOSBox 或 jsdos。
 */
export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const jsdos_api = activateJSdos(context);
    const dosbox_api = await activateDosbox(context);
    const cis = new CIManager(context);
    const diag = Diag.activate(context);

    async function handleAction(actionType: ActionType, uri: vscode.Uri) {
        const emulator = config.getEmulator();

        // DOSBox 路径
        if (emulator === DosEmulatorType.dosbox || emulator === DosEmulatorType.dosboxX) {
            const box = emulator === DosEmulatorType.dosboxX ? dosbox_api.dosboxX : dosbox_api.dosbox;
            const tomlConfig = await loadDosasmConfig(uri);
            const ctx = await makeDosboxContext(actionType, uri, context, tomlConfig);
            const runResult = await runDosbox(context, ctx, box);
            const diagResult = await Diag.messageDiagnose(runResult.message, ctx.doc, diag);
            return { message: runResult.message, error: diagResult.error, warn: diagResult.warn, result: runResult.result };
        }

        // jsdos 路径
        if (emulator === DosEmulatorType.jsdos || emulator === DosEmulatorType.jsdosX) {
            const useX = emulator === DosEmulatorType.jsdosX;
            return runJsdos(context, actionType, uri, cis, useX, jsdos_api, diag);
        }
    }

    context.subscriptions.push(
        vscode.commands.registerCommand("masm-tasm.openEmulator", (uri: vscode.Uri) => handleAction(ActionType.open, uri)),
        vscode.commands.registerCommand("masm-tasm.runASM", (uri: vscode.Uri) => handleAction(ActionType.run, uri)),
        vscode.commands.registerCommand("masm-tasm.debugASM", (uri: vscode.Uri) => handleAction(ActionType.debug, uri))
    );
}
