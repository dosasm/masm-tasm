/**
 * dosasm.jsonc project configuration module
 *
 * Features:
 * - Recursively search upward from a file directory for dosasm.jsonc
 * - Parse the action section's before/open/run/debug commands
 * - Provide unified template variable expansion (${file}, ${filename}, ${actionFolder}, ${<built-in>/...}, ${logfile})
 */

import * as vscode from "vscode";
import { logger } from "../utils/logger";
import { uriUtils } from "../utils/util";
import { DosEmulatorType } from "./types";

const DOSASM_JSONC = "dosasm.jsonc";

// ─── Type Definitions ────────────────────────────────────

/** Parsed commands from the action section of dosasm.jsonc */
export interface DosasmAction {
    before: string[];
    open: string[];
    run: string[];
    debug: string[];
    /**
     * If set to a string, the active file is copied to the specified path before running or debugging.
     * If set to null, no file copy is performed before running or debugging.
     */
    copyFileAs: string | null;
    /** Glob patterns for directories to skip when injecting the action folder (jsdos mode only) */
    ignore?: string[];
    /** Conditional command overrides keyed by emulator */
    overwrite?: {
        when: {
            emulator: string;
        };
        before?: string[];
        open?: string[];
        run?: string[];
        debug?: string[];
        copyFileAs?: string | null;
    }[];
}

/** Complete dosasm.jsonc configuration */
export interface DosasmConfig {
    /** Directory containing dosasm.jsonc */
    actionFolder: vscode.Uri;
    /** Parsed commands */
    action: DosasmAction;
}

/** Template variables for expanding ${...} placeholders in commands */
export interface ExpandVars {
    /** Path of the assembly file inside DOS */
    file: string;
    /** File path without extension */
    filename: string;
    /** Parent directory of the file inside DOS */
    filefolder: string;
    /** Drive letter of the file inside DOS */
    fileDisk: string;
    /** Full path of the assembly file in the real OS (for mount commands) */
    fileOS: string;
    /** File path without extension in the real OS (for mount commands) */
    fileOSname: string;
    /** Parent directory of the file in the real OS (for mount commands) */
    fileOSfolder: string;
    /** Path of the directory containing dosasm.jsonc */
    actionFolder: string;
    /**
     * Bundle path:
     * - In jsdos mode: "." (the bundle root is the virtual filesystem root)
     * - In dosbox mode: the actual path of the extracted folder
     */
    bundlePath: string;
    /**
     * Seperate space folder (D: drive mount target):
     * - In jsdos mode: "./code" (virtual code directory)
     * - In dosbox mode: the actual path of the isolated workspace folder under globalStorageUri
     */
    seperateSpaceFolder: string;
    /** Log file path (DOSBox only), dynamically generated */
    logfile?: string;
}

// ─── Template Expansion ────────────────────────────────────

/**
 * Expand all template variables in a command.
 *
 * Supported variables:
 * - ${file} — Full path of the assembly file in DOS
 * - ${filename} — File path without extension in DOS
 * - ${filefolder} — Parent directory of the file in DOS
 * - ${fileDisk} — Drive letter of the file in DOS
 * - ${fileOS} — Full path of the assembly file in the real OS (for mount commands)
 * - ${fileOSname} — File path without extension in the real OS (for mount commands)
 * - ${fileOSfolder} — Parent directory of the file in the real OS (for mount commands)
 * - ${actionFolder} — Directory containing dosasm.jsonc
 * - ${<built-in>/xxx.jsdos} — Bundle path (determined by the bundlePath parameter)
 * - ${seperateSpaceFolder} — D: drive mount target
 * - ${logfile} — Log file path (DOSBox only)
 *
 * The '>' prefix has no special meaning in v1; if present it is silently stripped.
 */
export function expandCommand(cmd: string, vars: ExpandVars): string {
    let output = cmd;
    // v1: '>' prefix is silently stripped, no special semantics
    if (output.startsWith(">")) output = output.substring(1);
    if (vars.bundlePath) {
        output = output.replace(/\$\{<built-in>\/[^}]+\}/g, vars.bundlePath);
    }
    // Pass through ${https://...} and ${http://...} unchanged
    // (they are already valid URLs, used directly in mount commands)
    output = output.replace(/\$\{file\}/g, vars.file);
    output = output.replace(/\$\{filename\}/g, vars.filename);
    output = output.replace(/\$\{actionFolder\}/g, vars.actionFolder);
    if (vars.logfile) {
        output = output.replace(/\$\{logfile\}/g, vars.logfile);
    }
    if (vars.seperateSpaceFolder) {
        output = output.replace(/\$\{seperateSpaceFolder\}/g, vars.seperateSpaceFolder);
    }
    if (vars.filefolder) {
        output = output.replace(/\$\{filefolder\}/g, vars.filefolder);
    }
    if (vars.fileDisk) {
        output = output.replace(/\$\{fileDisk\}/g, vars.fileDisk);
    }
    if (vars.fileOS) {
        output = output.replace(/\$\{fileOS\}/g, vars.fileOS);
    }
    if (vars.fileOSname) {
        output = output.replace(/\$\{fileOSname\}/g, vars.fileOSname);
    }
    if (vars.fileOSfolder) {
        output = output.replace(/\$\{fileOSfolder\}/g, vars.fileOSfolder);
    }
    return output;
}

/**
 * Expand a group of commands, returning the expanded array.
 */
export function expandCommands(commands: string[], vars: ExpandVars): string[] {
    return commands.map(cmd => expandCommand(cmd, vars));
}

// ─── JSONC Parsing ──────────────────────────────────────────

/**
 * Simple JSONC parser: strips comments then parses with JSON.parse.
 * Supports single-line and multi-line comments; does not strip content inside strings.
 */
function parseJSONC(text: string): unknown {
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

// ─── dosasm.jsonc Lookup and Parsing ─────────────────────────

function uriDirname(uri: vscode.Uri): vscode.Uri {
    // Preserve the URI scheme (e.g. vscode-test-web, file, http) instead of
    // converting to a file:// URI, which is not available in the web environment.
    return uriUtils.dirname(uri);
}

/**
 * Recursively search upward from startUri for dosasm.jsonc.
 * Stops at the workspace root or the filesystem root.
 */
export async function findDosasmConfig(startUri: vscode.Uri): Promise<vscode.Uri | null> {
    let dir = uriDirname(startUri);
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
        wf => startUri.toString().startsWith(wf.uri.toString())
    );
    const stopUri = workspaceFolder?.uri;

    while (true) {
        const candidate = vscode.Uri.joinPath(dir, DOSASM_JSONC);
        try {
            await vscode.workspace.fs.stat(candidate);
            return candidate;
        } catch {
            // not found, walk up
        }
        if (stopUri && dir.toString() === stopUri.toString()) {
            break; // reached the workspace root without finding the config
        }
        const parent = uriDirname(dir);
        if (parent.toString() === dir.toString()) {
            break; // reached the filesystem root
        }
        dir = parent;
    }
    return null;
}

/** Read and parse dosasm.jsonc */
export async function parseDosasmConfig(configUri: vscode.Uri): Promise<DosasmConfig> {
    const raw = await vscode.workspace.fs.readFile(configUri);
    const text = Buffer.from(raw).toString("utf-8");
    const parsed = parseJSONC(text);
    const actionFolder = uriDirname(configUri);
    const s = (parsed as { action?: unknown }).action as Record<string, unknown> | undefined;
    if (!s || typeof s !== "object") {
        throw new Error(`dosasm.jsonc at ${configUri.fsPath} is missing an "action" section`);
    }
    const toStringArray = (val: unknown): string[] => {
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
    // Parse ignore patterns
    if (Array.isArray(s.ignore)) {
        action.ignore = s.ignore.map(String);
    }
    // Parse overwrite entries
    if (Array.isArray(s.overwrite)) {
        action.overwrite = (s.overwrite as unknown[]).map(ow => {
            const o = ow as Record<string, unknown>;
            const when = (o.when as Record<string, unknown>) || {};
            return {
                when: {
                    emulator: String(when.emulator || ""),
                },
                before: toStringArray(o.before),
                open: toStringArray(o.open),
                run: toStringArray(o.run),
                debug: toStringArray(o.debug),
                copyFileAs: typeof o.copyFileAs === "string" ? o.copyFileAs : null,
            };
        });
    }
    logger.channel(`Loaded dosasm.jsonc from ${configUri.fsPath}`);
    return { actionFolder, action };
}

/**
 * Find and parse dosasm.jsonc. Returns null if not found, and also returns null on parse failure (does not interrupt execution).
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

// ─── Bundle Utility Functions ────────────────────────────────

/**
 * Extract all ${<built-in>/xxx.jsdos} references from a command array, returning a deduplicated list of bundle names.
 */
export function findBundleRefs(commands: string[]): string[] {
    const refs = new Set<string>();
    // Match ${<built-in>/NAME.jsdos} and ${https://...} / ${http://...}
    const re = /\$\{(?:<built-in>\/([^}]+)|(https?:\/\/[^}]+))\}/g;
    for (const cmd of commands) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(cmd)) !== null) {
            refs.add(m[1] || m[2]);
        }
    }
    return [...refs];
}

/** Get the extension resource URI for a built-in bundle */
export function getBundleUri(extensionUri: vscode.Uri, bundleName: string): vscode.Uri {
    return vscode.Uri.joinPath(extensionUri, "resources", bundleName);
}

/**
 * Check if a bundle reference is an HTTPS/HTTP URL.
 */
export function isNetworkBundle(ref: string): boolean {
    return ref.startsWith("https://") || ref.startsWith("http://");
}

/**
 * Resolve a bundle reference to its data.
 * Supports both local built-in bundles and HTTPS/HTTP network zip packages.
 *
 * @param extensionUri - Extension URI for resolving local bundles
 * @param bundleRef - Bundle reference (e.g. "TASM.jsdos" or "https://example.com/bundle.jsdos")
 * @returns The bundle data as a Uint8Array
 */
export async function resolveBundleSource(
    extensionUri: vscode.Uri,
    bundleRef: string
): Promise<Uint8Array> {
    if (isNetworkBundle(bundleRef)) {
        const response = await fetch(bundleRef, { redirect: "follow" });
        if (!response.ok) {
            throw new Error(`Failed to fetch bundle from ${bundleRef}: ${response.status} ${response.statusText}`);
        }
        return new Uint8Array(await response.arrayBuffer());
    }
    const uri = getBundleUri(extensionUri, bundleRef);
    return vscode.workspace.fs.readFile(uri);
}

/**
 * Extract the bundle reference from a template variable if it's a direct HTTPS/HTTP URL.
 * Returns the URL string if the pattern is ${https://...} or ${http://...}, otherwise null.
 */
export function extractNetworkUrl(cmd: string): string | null {
    const re = /^\$\{(https?:\/\/[^}]+)\}$/;
    const m = cmd.trim().match(re);
    return m ? m[1] : null;
}