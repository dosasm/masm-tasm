/**
 * dosasm.toml 项目配置模块
 *
 * 功能：
 * - 从文件目录向上递归查找 dosasm.toml
 * - 解析 [action] 段的 before/open/run/debug 命令
 * - 提供统一的模板变量展开（${file}, ${filename}, ${actionFolder}, ${<built-in>/...}）
 */

import * as vscode from "vscode";
import * as path from "path";
import { logger } from "../utils/logger";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TOML = require("@iarna/toml/parse-string");

const DOSASM_TOML = "dosasm.toml";

// ─── 类型定义 ────────────────────────────────────────────

/** dosasm.toml 中 [action] 段解析后的命令 */
export interface DosasmAction {
    before: string[];
    open: string[];
    run: string[];
    debug: string[];
}

/** 完整的 dosasm.toml 配置 */
export interface DosasmConfig {
    /** dosasm.toml 所在目录 */
    actionFolder: vscode.Uri;
    /** 解析后的命令 */
    action: DosasmAction;
}

/** 模板变量，用于展开命令中的 ${...} 占位符 */
export interface ExpandVars {
    /** 汇编文件在 DOS 中的路径 */
    file: string;
    /** 不含扩展名的文件路径 */
    filename: string;
    /** dosasm.toml 所在目录的路径 */
    actionFolder: string;
    /**
     * bundle 路径：
     * - jsdos 模式下为 "."（bundle 就是虚拟文件系统根目录）
     * - dosbox 模式下为解压后的文件夹实际路径
     */
    bundlePath: string;
}

// ─── 模板展开 ────────────────────────────────────────────

/**
 * 展开命令中的所有模板变量。
 *
 * 支持的变量：
 * - `${file}` — 汇编文件完整路径
 * - `${filename}` — 不含扩展名的文件路径
 * - `${actionFolder}` — dosasm.toml 所在目录
 * - `${<built-in>/xxx.jsdos}` — bundle 路径（由 bundlePath 参数决定）
 */
export function expandCommand(cmd: string, vars: ExpandVars): string {
    return cmd
        .replace(/\$\{file\}/g, vars.file)
        .replace(/\$\{filename\}/g, vars.filename)
        .replace(/\$\{actionFolder\}/g, vars.actionFolder)
        .replace(/\$\{<built-in>\/[^}]+\}/g, vars.bundlePath);
}

/**
 * 展开一组命令，返回展开后的数组。
 */
export function expandCommands(commands: string[], vars: ExpandVars): string[] {
    return commands.map(cmd => expandCommand(cmd, vars));
}

// ─── dosasm.toml 查找与解析 ─────────────────────────────

function splitCommands(raw: string): string[] {
    return raw
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

function uriDirname(uri: vscode.Uri): vscode.Uri {
    return vscode.Uri.file(path.dirname(uri.fsPath));
}

/**
 * 从 startUri 向上递归查找 dosasm.toml。
 * 到达工作区根目录或文件系统根目录时停止。
 */
export async function findDosasmToml(startUri: vscode.Uri): Promise<vscode.Uri | null> {
    let dir = uriDirname(startUri);
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
        wf => startUri.fsPath.startsWith(wf.uri.fsPath)
    );
    const stopAt = workspaceFolder?.uri.fsPath ?? path.parse(dir.fsPath).root;

    while (true) {
        const candidate = vscode.Uri.joinPath(dir, DOSASM_TOML);
        try {
            await vscode.workspace.fs.stat(candidate);
            return candidate;
        } catch {
            // not found, walk up
        }
        const parent = uriDirname(dir);
        if (parent.fsPath === dir.fsPath || dir.fsPath.length < stopAt.length) {
            break;
        }
        dir = parent;
    }
    return null;
}

/** 读取并解析 dosasm.toml */
export async function parseDosasmToml(tomlUri: vscode.Uri): Promise<DosasmConfig> {
    const raw = await vscode.workspace.fs.readFile(tomlUri);
    const text = Buffer.from(raw).toString("utf-8");
    const parsed = TOML(text);
    const actionFolder = uriDirname(tomlUri);
    const s = (parsed as any).action;
    if (!s || typeof s !== "object") {
        throw new Error(`dosasm.toml at ${tomlUri.fsPath} is missing an [action] section`);
    }
    const action: DosasmAction = {
        before: typeof s.before === "string" ? splitCommands(s.before) : [],
        open: typeof s.open === "string" ? splitCommands(s.open) : [],
        run: typeof s.run === "string" ? splitCommands(s.run) : [],
        debug: typeof s.debug === "string" ? splitCommands(s.debug) : [],
    };
    logger.channel(`Loaded dosasm.toml from ${tomlUri.fsPath}`);
    return { actionFolder, action };
}

/**
 * 查找并解析 dosasm.toml。找不到返回 null，解析失败也返回 null（不中断执行）。
 */
export async function loadDosasmConfig(fileUri: vscode.Uri): Promise<DosasmConfig | null> {
    const tomlUri = await findDosasmToml(fileUri);
    if (!tomlUri) return null;
    try {
        return await parseDosasmToml(tomlUri);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.channel(`Failed to parse dosasm.toml: ${msg}`);
        vscode.window.showErrorMessage(`Failed to parse dosasm.toml: ${msg}`);
        return null;
    }
}

// ─── Bundle 工具函数 ─────────────────────────────────────

/**
 * 从命令数组中提取所有 ${<built-in>/xxx.jsdos} 引用，返回去重的 bundle 名称列表。
 */
export function findBundleRefs(commands: string[]): string[] {
    const refs = new Set<string>();
    const re = /\$\{<built-in>\/([^}]+)\}/g;
    for (const cmd of commands) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(cmd)) !== null) {
            refs.add(m[1]);
        }
    }
    return [...refs];
}

/** 获取内置 bundle 的扩展资源 URI */
export function getBundleUri(extensionUri: vscode.Uri, bundleName: string): vscode.Uri {
    return vscode.Uri.joinPath(extensionUri, "resources", bundleName);
}
