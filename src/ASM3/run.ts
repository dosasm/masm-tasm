/**
 * run.ts — jsdos execution module (shared by Web and Desktop)
 *
 * Responsibilities:
 * - Prepare execution context (open files, find dosasm.jsonc, load bundles)
 * - Build autoexec commands (unified template expansion)
 * - Execute assembly programs in jsdos
 * - Collect output and generate diagnostic information
 *
 * Note: This module does not depend on DOSBox (child_process) and can be used in Web environments.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as Jszip from "jszip";
import * as nodefs from "fs";

import { logger } from "../utils/logger";
import { uriUtils } from "../utils/util";
import { ActionType } from "./types";
import * as config from "./config";
import * as Diag from "../diagnose/main";
import { CIManager } from "./jsdos";
import { Jsdos } from "./jsdos/main";
import {
    DosasmConfig, DosasmAction, ExpandVars,
    expandCommand,
    extractNetworkUrl, findBundleRefs, loadDosasmConfig, resolveBundleSource,
    resolveOverwrite,
} from "./dosasm-config";

// ─── Types ────────────────────────────────────────────────

export interface AsmResult {
    message: string;
    error?: number;
    warn?: number;
    [id: string]: unknown;
}

// ─── Shared Utility Functions ─────────────────────────────────────────

/**
 * Resolve URI (fall back to active editor), open document, save if needed.
 * Returns undefined when no file is found.
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

/** Load bundle data based on jsonc config or default config */
export async function resolveBundleData(
    context: vscode.ExtensionContext,
    cfg: DosasmConfig | null
): Promise<Uint8Array> {
    // Collect bundle refs from all command sections
    const allCommands: string[] = [];
    if (cfg) {
        allCommands.push(
            ...cfg.action.before,
            ...cfg.action.run,
            ...cfg.action.debug,
            ...(cfg.action.open ?? []),
        );
    } else {
        // Default config: scan the action profile's commands too
        const action = config.resolveOverwrite(config.getAction());
        allCommands.push(
            ...(action.before ?? []),
            ...action.run,
            ...action.debug,
            ...(action.open ?? []),
        );
    }

    const refs = findBundleRefs(allCommands);
    if (refs.length > 0) {
        logger.channel(`Using bundle: ${refs[0]}`);
        return resolveBundleSource(context.extensionUri, refs[0]);
    }
    // Fallback: no bundle refs found in commands — throw an error
    throw new Error("No bundle references found in commands. Ensure commands contain ${<built-in>/...} references.");
}

/** Log the action being executed */
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
 * Add all files in a directory and its subdirectories to jszip.
 * Skips directories matching the `ignore` glob patterns.
 * @param jszip - JSZip instance
 * @param dirUri - Host directory URI
 * @param zipPrefix - Prefix path in the zip (e.g. "action/")
 * @param ignorePatterns - Glob patterns for directories to skip
 */
async function addFolderToJszip(
    jszip: typeof Jszip.default,
    dirUri: vscode.Uri,
    zipPrefix: string,
    ignorePatterns: string[] = ["node_modules", ".git", ".vscode"]
): Promise<void> {
    const entries = await vscode.workspace.fs.readDirectory(dirUri);
    for (const [name, type] of entries) {
        // Check if this directory should be ignored
        if (type === vscode.FileType.Directory && ignorePatterns.some(p => name === p || name.startsWith(p.replace(/\*/g, "")))) {
            continue;
        }
        const entryUri = vscode.Uri.joinPath(dirUri, name);
        const zipPath = zipPrefix + name;
        if (type === vscode.FileType.Directory) {
            await addFolderToJszip(jszip, entryUri, zipPath + "/", ignorePatterns);
        } else if (type === vscode.FileType.File) {
            const data = await vscode.workspace.fs.readFile(entryUri);
            jszip.file(zipPath, data);
        }
    }
}

/**
 * Load dosasm.jsonc configuration (re-exported for external use).
 */
export { loadDosasmConfig };
export type { DosasmConfig };

// ─── jsdos Execution ──────────────────────────────────────────

/**
 * Get the list of commands to execute (selects run/debug/open based on actionType).
 * For default config, applies overwrite resolution first.
 */
function getCommands(
    actionType: ActionType,
    cfg: DosasmConfig | null
): string[] {
    if (cfg) {
        const a = resolveOverwrite(cfg.action, config.getEmulator());
        return actionType === ActionType.run ? a.run
            : actionType === ActionType.debug ? a.debug
                : a.open ?? [];
    }
    const action = config.resolveOverwrite(config.getAction());
    return actionType === ActionType.run ? action.run
        : actionType === ActionType.debug ? action.debug
            : action.open ?? [];
}

/**
 * Process a jsdos mount command at the JSZip level.
 *
 * Mount command formats:
 * - `mount c ${<built-in>/xxx.jsdos}` → extract bundle into `c/`
 * - `mount d ${seperateSpaceFolder}` → create empty `d/` directory
 * - `mount e ${fileOSfolder}` → copy real OS folder into `e/`, excluding ignored
 *
 * @returns `true` if the command was handled as a mount, `false` otherwise.
 */
async function processJsdosMount(
    jszip: typeof Jszip.default,
    cmd: string,
    context: vscode.ExtensionContext,
    ignorePatterns: string[] | undefined,
    fileOSPath: string
): Promise<{ handled: boolean; drive?: string; workspaceDrive?: string }> {
    const trimmed = cmd.trim();
    if (!trimmed.startsWith("mount ")) return { handled: false };

    const match = trimmed.match(/^mount\s+([a-zA-Z]):?\s+(.+)$/);
    if (!match) return { handled: false };

    const drive = match[1].toLowerCase();
    let target = match[2].trim().replace(/^["']|["']$/g, "");

    // mount c ${<built-in>/xxx.jsdos} or mount c ${https://...} → extract bundle into c/
    const builtInMatch = target.match(/^\$\{<built-in>\/([^}]+)\}$/);
    const networkUrl = extractNetworkUrl(target);
    const bundleRef = builtInMatch ? builtInMatch[1] : (networkUrl || "");
    if (bundleRef) {
        const bundleData = await resolveBundleSource(context.extensionUri, bundleRef);
        const bundleZip = await Jszip.loadAsync(bundleData);
        for (const [path, file] of Object.entries(bundleZip.files)) {
            if (!file.dir) {
                const data = await file.async("uint8array");
                jszip.file(`${drive}/${path}`, data);
            }
        }
        return { handled: true, drive };
    }

    // mount d ${seperateSpaceFolder} → create empty directory
    if (target === "${seperateSpaceFolder}") {
        jszip.folder(drive);
        return { handled: true, drive, workspaceDrive: drive };
    }

    // mount e ${fileOSfolder} → copy real OS folder, excluding ignored
    if (target === "${fileOSfolder}") {
        const ignore = ignorePatterns ?? ["node_modules", ".git", ".vscode"];
        // fileOSfolder is the parent directory of the file
        const parentDir = uriUtils.dirname(vscode.Uri.file(fileOSPath));
        await addFolderToJszip(jszip, parentDir, `${drive}/`, ignore);
        return { handled: true, drive };
    }

    return { handled: false };
}

/**
 * Execute assembly programs in jsdos.
 *
 * Flow:
 * 1. Load configuration
 * 2. Process mount commands at JSZip level (extract bundles, create dirs, copy files)
 * 3. Inject the current editor file into the workspace directory
 * 4. Build autoexec commands (non-mount commands + run/debug/open)
 * 5. Start the emulator
 * 6. Collect output for diagnostics
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

    // Load configuration
    const cfg = await loadDosasmConfig(resolved.uri);
    const action = cfg ? resolveOverwrite(cfg.action, config.getEmulator()) : config.resolveOverwrite(config.getAction());
    const beforeCommands = action.before ?? [];
    const actionIgnore = action.ignore;

    // Create empty jszip — mount commands will populate it
    const jszip = new Jszip.default();

    // ── Process mount commands at JSZip level ──
    const autoexecBefore: string[] = [];
    const mountedDrives: string[] = []; // tracks drives that need mount in autoexec
    let workspaceDrive = "d"; // default workspace drive

    for (const cmd of beforeCommands) {
        const result = await processJsdosMount(jszip, cmd, context, actionIgnore, resolved.uri.fsPath);
        if (result.handled) {
            // Add mount command for this drive so jsdos maps it correctly
            mountedDrives.push(result.drive || result.workspaceDrive || "");
            if (result.workspaceDrive) {
                workspaceDrive = result.workspaceDrive;
            }
            continue; // mount handled at JSZip level, not in autoexec
        }
        // Non-mount command: will be expanded and added to autoexec
        autoexecBefore.push(cmd);
    }

    // ── Inject the current file into the workspace directory ──
    const doc = resolved.doc;
    const copyFileAs = action.copyFileAs;
    let fileInJsdos = "";
    if (copyFileAs !== null) {
        const targetPath = copyFileAs || ("test" + uriUtils.extname(resolved.doc.uri));
        jszip.file(`${workspaceDrive}/${targetPath}`, doc.getText());
        fileInJsdos = `${workspaceDrive.toUpperCase()}:\\${targetPath}`;
    } else {
        fileInJsdos = `${workspaceDrive.toUpperCase()}:\\${path.basename(resolved.doc.uri.fsPath)}`;
    }

    // ── Build template vars ──
    const fileInJsdosParsed = path.parse(fileInJsdos);
    const fileOSParsed = path.parse(resolved.uri.fsPath);
    const actionFolder = cfg ? "./action" : "./code";
    const vars: ExpandVars = {
        file: fileInJsdos,
        filename: fileInJsdos.replace(fileInJsdosParsed.ext, ""),
        filefolder: fileInJsdosParsed.dir ? fileInJsdosParsed.dir + "\\" : fileInJsdos.substring(0, 2),
        fileDisk: fileInJsdos.substring(0, 1),
        fileOS: resolved.uri.fsPath,
        fileOSname: resolved.uri.fsPath.replace(fileOSParsed.ext, ""),
        fileOSfolder: fileOSParsed.dir ? fileOSParsed.dir + "\\" : "",
        actionFolder,
        bundlePath: ".",
        seperateSpaceFolder: "./tempdir",
    };

    // ── Add action directory (dosasm.jsonc mode) ──
    if (cfg) {
        await addFolderToJszip(jszip, cfg.actionFolder, "action/", action.ignore);
    }

    // ── Build autoexec ──
    const autoexec: string[] = [];
    // Add mount commands for drives that were mounted at JSZip level
    for (const drive of mountedDrives) {
        if (drive) {
            autoexec.push(`mount ${drive} ./${drive}/`);
        }
    }
    // Non-mount before commands (expanded)
    for (const cmd of autoexecBefore) {
        autoexec.push(expandCommand(cmd, vars));
    }
    // Run/debug/open commands (expanded)
    const commands = getCommands(actionType, cfg);
    for (const cmd of commands) {
        autoexec.push(expandCommand(cmd, vars));
    }

    jsdos_api.updateAutoexec(autoexec);
    jsdos_api.jszip = jszip;

    // Start the emulator
    const ci = await jsdos_api.runInHost(useX);
    cis.addCI(ci);
    cis.last.terminal();
    cis.showWebview();

    // Collect output for diagnostics
    if (actionType === ActionType.run || actionType === ActionType.debug) {
        const [hook, promise] = Diag.messageCollector();
        cis.last.onStdout["ASM3/run"] = (data: string) => hook(data);
        const message = await promise;
        const diagResult = await Diag.messageDiagnose(message, resolved.doc, diag);
        return { message, error: diagResult.error, warn: diagResult.warn, result: cis.last.stdout };
    }
}