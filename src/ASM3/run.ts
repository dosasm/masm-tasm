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
    DosasmConfig, ExpandVars,
    expandCommands,
    findBundleRefs, getBundleUri, loadDosasmConfig,
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
    if (cfg) {
        // Scan all command sections for bundle references
        const allCommands = [
            ...cfg.action.before,
            ...cfg.action.run,
            ...cfg.action.debug,
            ...(cfg.action.open ?? []),
        ];
        const refs = findBundleRefs(allCommands);
        if (refs.length > 0) {
            logger.channel(`Using jsonc bundle: ${refs[0]}`);
            return vscode.workspace.fs.readFile(getBundleUri(context.extensionUri, refs[0]));
        }
    }
    // Default bundle
    const bundlePath = vscode.Uri.joinPath(
        context.extensionUri,
        config.getBaseBundle().replace("<built-in>/", "resources/")
    );
    return vscode.workspace.fs.readFile(bundlePath);
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
 * @param jszip - JSZip instance
 * @param dirUri - Host directory URI
 * @param zipPrefix - Prefix path in the zip (e.g. "action/")
 */
async function addFolderToJszip(jszip: typeof Jszip.default, dirUri: vscode.Uri, zipPrefix: string): Promise<void> {
    const entries = await vscode.workspace.fs.readDirectory(dirUri);
    for (const [name, type] of entries) {
        const entryUri = vscode.Uri.joinPath(dirUri, name);
        const zipPath = zipPrefix + name;
        if (type === vscode.FileType.Directory) {
            await addFolderToJszip(jszip, entryUri, zipPath + "/");
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
 */
function getCommands(
    actionType: ActionType,
    cfg: DosasmConfig | null
): string[] {
    if (cfg) {
        const a = cfg.action;
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
 * Build the jsdos autoexec command array.
 *
 * @param actionType - Execution type (open/run/debug)
 * @param cfg - dosasm.jsonc configuration (null means use default config)
 * @param fileInJsdos - Path of the file in the jsdos virtual filesystem (e.g. "D:\\test.ASM")
 */
function buildJsdosAutoexec(
    actionType: ActionType,
    cfg: DosasmConfig | null,
    fileInJsdos: string
): string[] {
    const autoexec: string[] = [];
    // In jsdos, actionFolder maps to the ./action directory in the virtual filesystem
    const actionFolder = cfg ? "./action" : "./code";
    const vars: ExpandVars = {
        file: fileInJsdos,
        filename: fileInJsdos ? fileInJsdos.replace(path.parse(fileInJsdos).ext, "") : "",
        actionFolder,
        bundlePath: ".",
    };

    if (cfg) {
        // jsonc mode: dosasm.jsonc controls all mount points
        autoexec.push(...expandCommands(cfg.action.before, vars));
    } else {
        // Default mode: automatic mounting
        autoexec.push("mount c .", "mount d ./code", "d:");
        const before = config.getAction().before;
        if (before) autoexec.push(...before);
    }

    // Add run/debug/open commands
    const commands = getCommands(actionType, cfg);
    if (commands.length > 0) {
        autoexec.push(...expandCommands(commands, vars));
    }

    return autoexec;
}

/**
 * Execute assembly programs in jsdos。
 *
 * Flow:
 * 1. Load bundle → JSZip
 * 2. Inject the current editor file into code/test.<ext>
 * 3. Build autoexec commands
 * 4. Start the emulator
 * 5. Collect output for diagnostics
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

    // Load configuration and bundle
    const cfg = await loadDosasmConfig(resolved.uri);
    const bundleData = await resolveBundleData(context, cfg);
    const jszip = await Jszip.loadAsync(bundleData);

    // Inject the current file into the jsdos bundle
    const copyFileAs = cfg?.action.copyFileAs;
    let fileInJsdos = "";
    // Use the explicitly opened document instead of the active editor: the active
    // editor can be the output channel (or a webview) which would give a wrong URI.
    const doc = resolved.doc;
    if (copyFileAs !== null) {
        const targetPath = copyFileAs || ("test" + uriUtils.extname(resolved.doc.uri));
        jszip.file("code/" + targetPath, doc.getText());
        fileInJsdos = "D:\\" + targetPath;
    } else {
        // When copyFileAs is null, do not inject the file; use the original file path
        fileInJsdos = "D:\\" + path.basename(resolved.doc.uri.fsPath);
    }

    // Add the action directory (containing dosasm.jsonc) to the jsdos bundle
    if (cfg) {
        await addFolderToJszip(jszip, cfg.actionFolder, "action/");
    }

    // Build and set autoexec
    const autoexec = buildJsdosAutoexec(actionType, cfg, fileInJsdos);
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
