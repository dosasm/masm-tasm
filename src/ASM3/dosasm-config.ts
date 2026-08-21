/**
 * dosasm.jsonc 项目配置模块
 *
 * 功能：
 * - 从文件目录向上递归查找 dosasm.jsonc
 * - 解析 action 段的 before/open/run/debug 命令
 * - 提供统一的模板变量展开（${file}, ${filename}, ${actionFolder}, ${<built-in>/...}）
 */

import * as vscode from "vscode";
import * as path from "path";
import { logger } from "../utils/logger";

const DOSASM_JSONC = "dosasm.jsonc";

// ─── 类型定义 ────────────────────────────────────────────

/** dosasm.jsonc 中 action 段解析后的命令 */
export interface DosasmAction {
    before: string[];
    open: string[];
    run: string[];
    debug: string[];
    /**
     * 如果设置为字符串，运行或调试前会将当前活动文件复制到指定路径。
     * 如果设置为 null，运行或调试前不会复制文件。
     */
    copyFileAs: string | null;
}

/** 完整的 dosasm.jsonc 配置 */
export interface DosasmConfig {
    /** dosasm.jsonc 所在目录 */
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
    /** dosasm.jsonc 所在目录的路径 */
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
 * - ${file} — 汇编文件完整路径
 * - ${filename} — 不含扩展名的文件路径
 * - ${actionFolder} — dosasm.jsonc 所在目录
 * - ${<built-in>/xxx.jsdos} — bundle 路径（由 bundlePath 参数决定）
 */
export function expandCommand(cmd: string, vars: ExpandVars): string {
    let output = cmd;
    if (vars.bundlePath){
        output = output.replace(/\$\{<built-in>\/[^}]+\}/g, vars.bundlePath);
    }
    output = output.replace(/\$\{file\}/g, vars.file);
    output = output.replace(/\$\{filename\}/g, vars.filename);
    output = output.replace(/\$\{actionFolder\}/g, vars.actionFolder);
    return output;
}

/**
 * 展开一组命令，返回展开后的数组。
 */
export function expandCommands(commands: string[], vars: ExpandVars): string[] {
    return commands.map(cmd => expandCommand(cmd, vars));
}

// ─── JSONC 解析 ──────────────────────────────────────────

/**
 * 简单的 JSONC 解析器：去除注释后用 JSON.parse 解析。
 * 支持单行注释和多行注释，不会去除字符串内部的 content。
 */
function parseJSONC(text: string): any {
    let inString = false;
    let stringChar = "";
    let inLineComment = false;
    let inBlockComment = false;
    let result = "";

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (inLineComment) {
            if (ch === "\n") {
                inLineComment = false;
                result += ch;
            }
            continue;
        }

        if (inBlockComment) {
            if (ch === "*" && next === "/") {
                inBlockComment = false;
                i++;
            }
            continue;
        }

        if (inString) {
            result += ch;
            if (ch === "\\" && next) {
                result += next;
                i++;
            } else if (ch === stringChar) {
                inString = false;
                stringChar = "";
            }
            continue;
        }

        if (ch === "\"" || ch === "'") {
            inString = true;
            stringChar = ch;
            result += ch;
            continue;
        }

        if (ch === "/" && next === "/") {
            inLineComment = true;
            i++;
            continue;
        }

        if (ch === "/" && next === "*") {
            inBlockComment = true;
            i++;
            continue;
        }

        result += ch;
    }

    return JSON.parse(result);
}

// ─── dosasm.jsonc 查找与解析 ─────────────────────────────

function uriDirname(uri: vscode.Uri): vscode.Uri {
    return vscode.Uri.file(path.dirname(uri.fsPath));
}

/**
 * 从 startUri 向上递归查找 dosasm.jsonc。
 * 到达工作区根目录或文件系统根目录时停止。
 */
export async function findDosasmConfig(startUri: vscode.Uri): Promise<vscode.Uri | null> {
    let dir = uriDirname(startUri);
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
        wf => startUri.fsPath.startsWith(wf.uri.fsPath)
    );
    const stopAt = workspaceFolder?.uri.fsPath ?? path.parse(dir.fsPath).root;

    while (true) {
        const candidate = vscode.Uri.joinPath(dir, DOSASM_JSONC);
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

/** 读取并解析 dosasm.jsonc */
export async function parseDosasmConfig(configUri: vscode.Uri): Promise<DosasmConfig> {
    const raw = await vscode.workspace.fs.readFile(configUri);
    const text = Buffer.from(raw).toString("utf-8");
    const parsed = parseJSONC(text);
    const actionFolder = uriDirname(configUri);
    const s = (parsed as any).action;
    if (!s || typeof s !== "object") {
        throw new Error(`dosasm.jsonc at ${configUri.fsPath} is missing an "action" section`);
    }
    const toStringArray = (val: any): string[] => {
        if (Array.isArray(val)) {
            return val.map(String).filter(line => line.length > 0);
        }
        if (typeof val === "string") {
            return val.split("\n").map(line => line.trim()).filter(line => line.length > 0);
        }
        return [];
    };
    const action: DosasmAction = {
        before: toStringArray(s.before),
        open: toStringArray(s.open),
        run: toStringArray(s.run),
        debug: toStringArray(s.debug),
        copyFileAs: typeof s.copyFileAs === "string" ? s.copyFileAs : null,
    };
    logger.channel(`Loaded dosasm.jsonc from ${configUri.fsPath}`);
    return { actionFolder, action };
}

/**
 * 查找并解析 dosasm.jsonc。找不到返回 null，解析失败也返回 null（不中断执行）。
 */
export async function loadDosasmConfig(fileUri: vscode.Uri): Promise<DosasmConfig | null> {
    const configUri = await findDosasmConfig(fileUri);
    if (!configUri) return null;
    try {
        return await parseDosasmConfig(configUri);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.channel(`Failed to parse dosasm.jsonc: ${msg}`);
        vscode.window.showErrorMessage(`Failed to parse dosasm.jsonc: ${msg}`);
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