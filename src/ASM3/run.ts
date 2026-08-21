/**
 * run.ts — jsdos 执行模块（Web 和 Desktop 共享）
 *
 * 职责：
 * - 准备执行上下文（打开文件、查找 dosasm.toml、加载 bundle）
 * - 构建 autoexec 命令（统一的模板展开）
 * - 在 jsdos 中执行汇编程序
 * - 收集输出并生成诊断信息
 *
 * 注意：此模块不依赖 DOSBox（child_process），可在 Web 环境中使用。
 */

import * as vscode from "vscode";
import * as path from "path";
import * as Jszip from "jszip";

import { logger } from "../utils/logger";
import { uriUtils } from "../utils/util";
import { ActionType } from "./types";
import * as config from "./config";
import * as Diag from "../diagnose/main";
import { CIManager } from "./jsdos";
import { Jsdos } from "./jsdos/main";
import {
    DosasmConfig, ExpandVars,
    expandCommands,
    findBundleRefs, getBundleUri, loadDosasmConfig,
} from "./dosasm-toml";

// ─── 类型 ────────────────────────────────────────────────

export interface AsmResult {
    message: string;
    error?: number;
    warn?: number;
    [id: string]: unknown;
}

// ─── 共享工具函数 ─────────────────────────────────────────

/**
 * 解析 URI（回退到活动编辑器），打开文档，按需保存。
 * 返回 undefined 表示找不到文件。
 */
export async function resolveFile(
    uri: vscode.Uri
): Promise<{ uri: vscode.Uri; doc: vscode.TextDocument } | undefined> {
    let _uri = uri;
    if (!_uri && vscode.window.activeTextEditor) {
        _uri = vscode.window.activeTextEditor.document.uri;
    }
    if (!_uri) {
        logger.channel("cannot find the file", uri?.fsPath);
        return undefined;
    }
    const doc = await vscode.workspace.openTextDocument(_uri);
    if (doc.isDirty && config.getSaveFirst()) {
        await doc.save();
    }
    return { uri: _uri, doc };
}

/** 根据 toml 配置或默认配置加载 bundle 数据 */
export async function resolveBundleData(
    context: vscode.ExtensionContext,
    tomlConfig: DosasmConfig | null
): Promise<Uint8Array> {
    if (tomlConfig) {
        const refs = findBundleRefs(tomlConfig.action.before);
        if (refs.length > 0) {
            logger.channel(`Using toml bundle: ${refs[0]}`);
            return vscode.workspace.fs.readFile(getBundleUri(context.extensionUri, refs[0]));
        }
    }
    // 默认 bundle
    const bundlePath = vscode.Uri.joinPath(
        context.extensionUri,
        config.getBaseBundle().replace("<built-in>/", "resources/")
    );
    return vscode.workspace.fs.readFile(bundlePath);
}

/** 记录正在执行的动作 */
export function logAction(act: ActionType, file: string): void {
    const asmType = config.getAssembler();
    const emulator = config.getEmulator();
    const key = act === ActionType.open ? "ASM.openemu.msg"
        : act === ActionType.run ? "ASM.run.msg"
            : "ASM.debug.msg";
    const log = logger.localize(key, file, asmType, emulator);
    logger.channel(log);
    console.log(log);
}

/**
 * 加载 dosasm.toml 配置（重新导出，方便外部使用）。
 */
export { loadDosasmConfig };
export type { DosasmConfig };

// ─── jsdos 执行 ──────────────────────────────────────────

/**
 * 获取要执行的命令列表（根据 actionType 选择 run/debug/open）。
 */
function getCommands(
    actionType: ActionType,
    tomlConfig: DosasmConfig | null
): string[] {
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

/**
 * 构建 jsdos 的 autoexec 命令数组。
 *
 * @param actionType - 执行类型（open/run/debug）
 * @param tomlConfig - dosasm.toml 配置（null 表示使用默认配置）
 * @param fileInJsdos - 文件在 jsdos 虚拟文件系统中的路径（如 "D:\\test.ASM"）
 */
function buildJsdosAutoexec(
    actionType: ActionType,
    tomlConfig: DosasmConfig | null,
    fileInJsdos: string
): string[] {
    const autoexec: string[] = [];
    const vars: ExpandVars = {
        file: fileInJsdos,
        filename: fileInJsdos ? fileInJsdos.replace(path.parse(fileInJsdos).ext, "") : "",
        actionFolder: "./code",
        bundlePath: ".",
    };

    if (tomlConfig) {
        // toml 模式：由 toml 控制所有挂载
        autoexec.push(...expandCommands(tomlConfig.action.before, vars));
    } else {
        // 默认模式：自动挂载
        autoexec.push("mount c .", "mount d ./code", "d:");
        const before = config.getAction().before;
        if (before) autoexec.push(...before);
    }

    // 添加 run/debug/open 命令
    const commands = getCommands(actionType, tomlConfig);
    if (commands.length > 0) {
        autoexec.push(...expandCommands(commands, vars));
    }

    return autoexec;
}

/**
 * 在 jsdos 中执行汇编程序。
 *
 * 流程：
 * 1. 加载 bundle → JSZip
 * 2. 将当前编辑器文件注入到 code/test.<ext>
 * 3. 构建 autoexec 命令
 * 4. 启动模拟器
 * 5. 收集输出用于诊断
 */
export async function runJsdos(
    context: vscode.ExtensionContext,
    actionType: ActionType,
    uri: vscode.Uri,
    cis: CIManager,
    useX: boolean,
    jsdos_api: Jsdos,
    diag: Diag.AssemblerMessageDiagnose
): Promise<AsmResult | undefined> {
    const resolved = await resolveFile(uri);
    if (!resolved) return undefined;
    await vscode.window.showTextDocument(resolved.doc, { preview: false });
    logAction(actionType, resolved.uri.fsPath);

    // 加载配置和 bundle
    const tomlConfig = await loadDosasmConfig(resolved.uri);
    const bundleData = await resolveBundleData(context, tomlConfig);
    const jszip = await Jszip.loadAsync(bundleData);

    // 将当前文件注入 jsdos bundle
    let fileInJsdos = "";
    const doc = vscode.window.activeTextEditor?.document;
    if (doc) {
        jszip.file("code/test" + uriUtils.extname(doc.uri), doc.getText());
        fileInJsdos = "D:\\test" + uriUtils.extname(doc.uri);
    }

    // 构建并设置 autoexec
    const autoexec = buildJsdosAutoexec(actionType, tomlConfig, fileInJsdos);
    jsdos_api.updateAutoexec(autoexec);
    jsdos_api.jszip = jszip;

    // 启动模拟器
    const ci = await jsdos_api.runInHost(useX);
    cis.addCI(ci);
    cis.last.terminal();
    cis.showWebview();

    // 收集输出用于诊断
    if (actionType === ActionType.run || actionType === ActionType.debug) {
        const [hook, promise] = Diag.messageCollector();
        cis.last.onStdout["ASM3/run"] = (data: string) => hook(data);
        const message = await promise;
        const diagResult = await Diag.messageDiagnose(message, resolved.doc, diag);
        return { message, error: diagResult.error, warn: diagResult.warn, result: cis.last.stdout };
    }
}
