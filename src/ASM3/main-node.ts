/**
 * main-node.ts — Desktop entry point (supports DOSBox + jsdos)
 *
 * This file is the Node.js environment extension entry point, supporting all four emulators:
 * - dosbox / dosbox-x: invokes local DOSBox via child process
 * - jsdos / jsdos-x: runs in browser via WebAssembly
 *
 * The jsdos path reuses logic from run.ts; the DOSBox path is implemented in this file.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as nodefs from "fs";
import * as cp from "child_process";
import { Utils } from "vscode-uri";

import { ActionType, DosEmulatorType, ActionProfile } from "./types";
import * as config from "./config";
import { getStorageBasePath } from "./config";
import { emptyFolder, uriUtils } from "../utils/util";
import { logger } from "../utils/logger";
import * as statusBar from "./statusBar";
import * as Diag from "../diagnose/main";
import { activateDosbox, DOSBox } from "./dosbox/main";
import { activateJSdos } from "./jsdos/main";
import { CIManager } from "./jsdos";
import { runJsdos, resolveFile, resolveBundleData, logAction, loadDosasmConfig, type DosasmConfig } from "./run";
import { DosasmAction, expandCommand, expandCommands, ExpandVars, findBundleRefs, getBundleUri, resolveBundleSource, resolveOverwrite } from "./dosasm-config";

// ─── Logfile Archiving ─────────────────────────────────────────────

/**
 * Move all existing .log files from the assembly tools folder to a `logs` subfolder.
 * This prevents log files from accumulating in the main folder.
 */
function archiveLogFiles(folder: string): void {
    const logsDir = path.join(folder, "logs");
    if (!nodefs.existsSync(logsDir)) {
        nodefs.mkdirSync(logsDir, { recursive: true });
    }

    try {
        const entries = nodefs.readdirSync(folder);
        for (const entry of entries) {
            if (entry.endsWith(".log") || entry.endsWith(".LOG")) {
                const srcPath = path.join(folder, entry);
                const destPath = path.join(logsDir, entry);
                // Only move if the file exists and is a regular file
                if (nodefs.existsSync(srcPath) && nodefs.lstatSync(srcPath).isFile()) {
                    nodefs.renameSync(srcPath, destPath);
                }
            }
        }
    } catch (e) {
        console.error("archiveLogFiles error:", e);
    }
}

// ─── DOSBox Execution Context ────────────────────────────────────

interface DosboxContext {
    actionType: ActionType;
    fileUri: vscode.Uri;
    doc: vscode.TextDocument;
    fileCopyUri: vscode.Uri | null;
    logFileName: string;
    assemblyToolsFolder: vscode.Uri;
    seperateSpaceFolder: vscode.Uri;
    config: DosasmConfig | null;
    resolvedAction: DosasmAction | null;
    bundleFolderMap: Map<string, string>;
    logMountFolder: string | null;
}

/**
 * Build a DOSBox Execution Context.
 *
 * `copyFileAs` copies the active file to a path under DOS. The program parses mount
 * commands from `before` to determine the final DOS location. Different emulators may
 * behave differently at the underlying level, but the effect under DOS is similar.
 */
async function makeDosboxContext(
    actionType: ActionType,
    uri: vscode.Uri,
    context: vscode.ExtensionContext,
    cfg: DosasmConfig | null
): Promise<DosboxContext> {
    const resolved = await resolveFile(uri);
    if (!resolved) throw new Error("no file found");

    const storageBase = getStorageBasePath(context);
    const timeStamp = Date.now().toString();
    const seperateSpaceFolder = uriUtils.joinPath(storageBase, "workspace");

    const resolvedAction = cfg ? resolveOverwrite(cfg.action, config.getEmulator()) : null;
    const copyFileAs = resolvedAction?.copyFileAs ?? undefined;
    // `copyFileAs` copies the active file to a path under DOS.
    // The program parses mount commands from `before` to determine the final DOS location.
    // Different emulators may behave differently at the underlying level, but the effect under DOS is similar.
    // - `null`: Do not copy; rely on mount commands to make the original file accessible
    // - string: Copy to this path relative to ${seperateSpaceFolder}; DOS path is determined by mount d command
    // - `undefined`: Copy with default filename (TEST.<EXT> for DOSBox)
    const fileCopyUri = copyFileAs === null
        ? null
        : copyFileAs
            ? uriUtils.joinPath(seperateSpaceFolder, copyFileAs)
            : uriUtils.joinPath(seperateSpaceFolder, ("test" + uriUtils.extname(resolved.uri)).toUpperCase());

    return {
        actionType,
        fileUri: resolved.uri,
        doc: resolved.doc,
        assemblyToolsFolder: uriUtils.joinPath(storageBase, "bundles", config.getAssembler()),
        logFileName: timeStamp.substring(timeStamp.length - 5) + ".log".toUpperCase(),
        fileCopyUri,
        seperateSpaceFolder,
        config: cfg,
        resolvedAction,
        bundleFolderMap: new Map(),
        logMountFolder: null,
    };
}

// ─── DOSBox Bundle Extraction ──────────────────────────────────

/** Extract bundles referenced in jsonc to disk, returning a map of bundle name → extraction path */
async function extractConfigBundles(
    action: DosasmAction,
    context: vscode.ExtensionContext,
    box: DOSBox
): Promise<Map<string, string>> {
    const bundleMap = new Map<string, string>();
    // Scan all command sections (before/run/debug/open) for bundle references
    const allCommands = [
        ...action.before ?? [],
        ...action.run,
        ...action.debug,
        ...(action.open ?? []),
    ];
    for (const bundleName of findBundleRefs(allCommands)) {
const extractFolder = vscode.Uri.joinPath(getStorageBasePath(context), "bundles", bundleName.replace(".jsdos", ""));
        const data = await resolveBundleSource(context.extensionUri, bundleName);
        await box.fromBundle(data, extractFolder, false);
        logger.channel(`Extracted bundle ${bundleName} to ${extractFolder.fsPath}`);
        bundleMap.set(bundleName, extractFolder.fsPath);
    }
    return bundleMap;
}

// ─── DOSBox Autoexec Construction ────────────────────────────────

/** Get the list of commands to execute */
function getCommands(actionType: ActionType, resolvedAction: DosasmAction | null): string[] {
    if (resolvedAction) {
        return actionType === ActionType.run ? resolvedAction.run
            : actionType === ActionType.debug ? resolvedAction.debug
                : resolvedAction.open ?? [];
    }
    const action = config.resolveOverwrite(config.getAction());
    return actionType === ActionType.run ? action.run
        : actionType === ActionType.debug ? action.debug
            : action.open ?? [];
}

/**
 * Build the DOSBox autoexec command array.
 *
 * The program parses mount commands from `before` to determine the final DOS location
 * of the copied file. Different emulators may behave differently at the underlying level,
 * but the effect under DOS is similar.
 */
function buildDosboxAutoexec(
    actionType: ActionType,
    cfg: DosasmConfig | null,
    ctx: DosboxContext,
    context: vscode.ExtensionContext,
    insertPause?: boolean
): string[] {
    const autoexec: string[] = [];

    if (cfg) {
        // jsonc mode: dosasm.jsonc controls all mount points (no default auto-mount)
        const fileUri = ctx.fileCopyUri ?? ctx.fileUri;
        const fileParsed = path.parse(fileUri.fsPath);
        const fileOSParsed = path.parse(ctx.fileUri.fsPath);
        const vars: ExpandVars = {
            file: fileUri.fsPath,
            filename: fileUri.fsPath.replace(fileParsed.ext, ""),
            filefolder: fileParsed.dir ? fileParsed.dir + "\\" : fileUri.fsPath.substring(0, 2),
            fileDisk: fileUri.fsPath.substring(0, 1),
            fileOS: ctx.fileUri.fsPath,
            fileOSname: ctx.fileUri.fsPath.replace(fileOSParsed.ext, ""),
            fileOSfolder: fileOSParsed.dir ? fileOSParsed.dir + "\\" : "",
            actionFolder: cfg.actionFolder.fsPath,
            bundlePath: "", // Replaced by bundleFolderMap
            seperateSpaceFolder: ctx.seperateSpaceFolder.fsPath,
            logfile: "C:\\" + ctx.logFileName,
        };

        function expandDosboxCmd(cmd: string): string {
            // First expand variables and built-in bundles
            let r = expandCommand(cmd, vars);
            r = r.replace(/\$\{<built-in>\/([^}]+)\}/g, (_m, name: string) => {
                const p = ctx.bundleFolderMap.get(name);
                return p ? `"${p}"` : `"${getBundleUri(context.extensionUri, name).fsPath}"`;
            });
            // Replace network URLs with local extraction paths
            r = r.replace(/\$\{(https?:\/\/[^}]+)\}/g, (_m, url: string) => {
                const p = ctx.bundleFolderMap.get(url);
                return p ? `"${p}"` : `"${url}"`;
            });

            // Parse mount commands to determine the final DOS location of the copied file.
            // The program automatically parses mount instructions from `before` to make the file
            // appear at the corresponding DOS location. Different emulators may behave differently
            // at the underlying level, but the effect under DOS is similar.
            const mountMatch = r.match(/^\s*mount\s+([a-zA-Z])\s+(.+)/i);
            if (mountMatch) {
                const disk = mountMatch[1].toLowerCase();
                let mountPath = mountMatch[2].trim();
                // Remove surrounding quotes if present
                if ((mountPath.startsWith('"') && mountPath.endsWith('"')) ||
                    (mountPath.startsWith("'") && mountPath.endsWith("'"))) {
                    mountPath = mountPath.slice(1, -1);
                }

                // Track mount folder for logfile placement
                if (ctx.logMountFolder === null) {
                    ctx.logMountFolder = mountPath; // first mount
                }
                if (disk === "c") {
                    ctx.logMountFolder = mountPath; // C: overrides
                }

                // Check if the file is within this mount path and update DOS path accordingly
                if (fileUri.fsPath.startsWith(mountPath)) {
                    const relativePath = path.relative(mountPath, fileUri.fsPath);
                    vars.file = disk + ":\\" + relativePath;
                    vars.filename = vars.file.replace(path.parse(vars.file).ext, "");
                }
            }

            return r;
        }

        autoexec.push(...(ctx.resolvedAction?.before ?? []).map(expandDosboxCmd));

        const commands = getCommands(actionType, ctx.resolvedAction);
        for (const cmd of commands) {
            let r = expandDosboxCmd(cmd);
            autoexec.push(r);
        }
    } else {
        // Default single-file mode: mount commands must be explicitly defined in `before`
        const action = config.resolveOverwrite(config.getAction());
        const fileUri = ctx.fileCopyUri ?? ctx.fileUri;
        const rel = path.relative(ctx.seperateSpaceFolder.fsPath, fileUri.fsPath);
        const fileInDosbox = path.win32.resolve("D:\\", rel);
        const fileOSParsed = path.parse(ctx.fileUri.fsPath);
        const vars: ExpandVars = {
            file: fileInDosbox,
            filename: fileInDosbox.replace(path.parse(fileInDosbox).ext, ""),
            filefolder: path.parse(fileInDosbox).dir ? path.parse(fileInDosbox).dir + "\\" : "D:\\",
            fileDisk: "D",
            fileOS: ctx.fileUri.fsPath,
            fileOSname: ctx.fileUri.fsPath.replace(fileOSParsed.ext, ""),
            fileOSfolder: fileOSParsed.dir ? fileOSParsed.dir + "\\" : "",
            actionFolder: "",
            bundlePath: ctx.assemblyToolsFolder.fsPath,
            seperateSpaceFolder: ctx.seperateSpaceFolder.fsPath,
            logfile: "C:\\" + ctx.logFileName,
        };

        if (action.before) {
            for (const cmd of action.before) {
                let r = expandCommand(cmd, vars);
                // Track mount folder for logfile placement
                const mountMatch = r.match(/^\s*mount\s+([a-zA-Z])\s+(.+)/i);
                if (mountMatch) {
                    const disk = mountMatch[1].toLowerCase();
                    let mountPath = mountMatch[2].trim();
                    if ((mountPath.startsWith('"') && mountPath.endsWith('"')) ||
                        (mountPath.startsWith("'") && mountPath.endsWith("'"))) {
                        mountPath = mountPath.slice(1, -1);
                    }
                    if (ctx.logMountFolder === null) {
                        ctx.logMountFolder = mountPath;
                    }
                    if (disk === "c") {
                        ctx.logMountFolder = mountPath;
                    }
                }
                autoexec.push(r);
            }
        }

        const commands = getCommands(actionType, null);
        for (const cmd of commands) {
            let r = expandCommand(cmd, vars);
            autoexec.push(r);
        }
    }

    // DOSBox exit behavior
    if (actionType !== ActionType.open && insertPause) {
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

// ─── DOSBox Configuration Update ─────────────────────────────────────

function updateDosboxConf(box: DOSBox, emulator: DosEmulatorType): void {
    const dosboxConf = config.getDosboxConfig(emulator);
    if (dosboxConf) {
        for (const id in dosboxConf) {
            const [section, key] = id.toLowerCase().split(".");
            box.updateConf(section, key, dosboxConf[id]);
        }
    }
}

// ─── DOSBox Execution ─────────────────────────────────────────

/**
 * Execute an assembly program in DOSBox.
 *
 * Flow:
 * 1. Copy files to an isolated directory
 *    - `copyFileAs` specifies the filename; the DOS path is determined by parsing mount commands from `before`
 *    - Different emulators may behave differently at the underlying level, but the effect under DOS is similar
 * 2. Extract bundles (if referenced in jsonc)
 * 3. Build autoexec commands (parsing mount commands to determine the final DOS location)
 * 4. Start the DOSBox child process and monitor the log file
 */
async function runDosbox(
    context: vscode.ExtensionContext,
    ctx: DosboxContext,
    box: DOSBox
): Promise<{ message: string; result: string }> {
    logAction(ctx.actionType, ctx.fileUri.fsPath);

    // Archive previous log files to logs/ subfolder
    archiveLogFiles(ctx.assemblyToolsFolder.fsPath);

    // Prepare the isolated directory
    await emptyFolder(ctx.seperateSpaceFolder);
    if (ctx.fileCopyUri) {
        await vscode.workspace.fs.copy(ctx.fileUri, ctx.fileCopyUri);
    }

    // Extract bundles (jsonc mode)
    if (ctx.config && ctx.bundleFolderMap.size === 0) {
        ctx.bundleFolderMap = await extractConfigBundles(ctx.resolvedAction!, context, box);
    }

    // Extract default bundle (single-file mode)
    if (!ctx.config) {
        const bundleData = await resolveBundleData(context, null);
        await box.fromBundle(bundleData, ctx.assemblyToolsFolder, false);
    }

    // Kill any previous DOSBox process before starting
    box.kill();
    // Small delay to ensure previous process has exited
    await new Promise(r => setTimeout(r, 100));

    // Build and set autoexec
    const autoexec = buildDosboxAutoexec(ctx.actionType, ctx.config, ctx, context, true);
    updateDosboxConf(box, config.getEmulator());
    box.updateAutoexec(autoexec);

    // Determine logfile folder from mount commands
    if (ctx.logMountFolder === null) {
        vscode.window.showErrorMessage("No mount command found in dosasm.jsonc. Cannot determine logfile location.");
        throw new Error("No mount command found in dosasm.jsonc. Cannot determine logfile location.");
    }
    const logUri = Utils.joinPath(vscode.Uri.file(ctx.logMountFolder), ctx.logFileName);
    const [hook, promise] = Diag.messageCollector();
    let useNodefsWatch = true;

    if (ctx.actionType !== ActionType.open) {
        // Check if the autoexec contains an exit command
        if (autoexec.includes("exit")) useNodefsWatch = false;
    }

    await box.run().catch(e => {
        console.error(e);
        throw new Error(e);
    });

    // seems useless, almost never fired.
    // if (ctx.actionType !== ActionType.open && useNodefsWatch) {
    //     nodefs.watchFile(logUri.fsPath, () => {
    //         try {
    //             if (nodefs.existsSync(logUri.fsPath)) {
    //                 hook(nodefs.readFileSync(logUri.fsPath, { encoding: "utf-8" }));
    //             }
    //         } catch (e) { console.error(e); }
    //     });
    // }

    const waitResultPromise = new Promise<string>((resolve, reject) => {
        let checkCount = 0;
        const id = setInterval(() => {
            if (nodefs.existsSync(logUri.fsPath)) {
                clearInterval(id);
                const result = nodefs.readFileSync(logUri.fsPath, { encoding: "utf-8" });
                resolve(result);
            }
            if (checkCount > 10) {
                reject();
            }
            checkCount++;
        }, 1000);
    });

    let result: string | undefined = await waitResultPromise.catch(e => { return undefined; });
    if (result) {
        hook(result+"\nD:\\>");
    }

    // Add timeout for the diagnose promise to prevent hanging
    const message = await Promise.race([
        promise,
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Diagnose timeout')), 15000))
    ]).catch(e => { throw new Error("can't get dosbox's result: " + e.message); });
    if (!result) throw new Error("can't get dosbox's result (no log file)");
    return { message, result };
}


/**
 * Execute an assembly program in DOSBox-X.
 *
 * Flow:
 * 1. Copy files to an isolated directory
 *    - `copyFileAs` specifies the filename; the DOS path is determined by parsing mount commands from `before`
 *    - Different emulators may behave differently at the underlying level, but the effect under DOS is similar
 * 2. Extract bundles (if referenced in jsonc)
 * 3. Build autoexec commands (parsing mount commands to determine the final DOS location)
 * 4. Start the DOSBox-X child process and monitor stderr for log output
 */
async function runDosboxX(
    context: vscode.ExtensionContext,
    ctx: DosboxContext,
    box: DOSBox
): Promise<{ message: string; result: string }> {
    logAction(ctx.actionType, ctx.fileUri.fsPath);

    // Archive previous log files to logs/ subfolder
    archiveLogFiles(ctx.assemblyToolsFolder.fsPath);

    // Prepare the isolated directory
    await emptyFolder(ctx.seperateSpaceFolder);
    if (ctx.fileCopyUri) {
        await vscode.workspace.fs.copy(ctx.fileUri, ctx.fileCopyUri);
    }

    // Extract bundles (jsonc mode)
    if (ctx.config && ctx.bundleFolderMap.size === 0) {
        ctx.bundleFolderMap = await extractConfigBundles(ctx.resolvedAction!, context, box);
    }

    // Extract default bundle (single-file mode)
    if (!ctx.config) {
        const bundleData = await resolveBundleData(context, null);
        await box.fromBundle(bundleData, ctx.assemblyToolsFolder, false);
    }

    // Kill any previous DOSBox process before starting
    box.kill();
    // Small delay to ensure previous process has exited
    await new Promise(r => setTimeout(r, 100));

    // Build and set autoexec
    const autoexec = buildDosboxAutoexec(ctx.actionType, ctx.config, ctx, context, true);
    updateDosboxConf(box, config.getEmulator());
    box.updateAutoexec(autoexec);

    // Determine logfile folder from mount commands
    if (ctx.logMountFolder === null) {
        vscode.window.showErrorMessage("No mount command found in dosasm.jsonc. Cannot determine logfile location.");
        throw new Error("No mount command found in dosasm.jsonc. Cannot determine logfile location.");
    }
    const logUri = Utils.joinPath(vscode.Uri.file(ctx.logMountFolder), ctx.logFileName);
    const [lineHook, diagPromise] = Diag.messageCollector();
    let useNodefsWatch = true;

    if (ctx.actionType !== ActionType.open) {
        // Check if the autoexec contains an exit command
        if (autoexec.includes("exit")) useNodefsWatch = false;
    }

    let result: string = "";
    const cpHandler = (p: cp.ChildProcess) => {
        // Listen stderr streams

        p.stderr?.on('data', (data) => {
            const loglines = data.toString().split("\n");
            console.log(data);
            for (const line of loglines) {
                if (line.trim().startsWith("LOG: DOS CON: ")) {
                    const trimed = line.replace("LOG: DOS CON: ", "") + "\n";
                    lineHook(trimed);
                    result += trimed;
                }
            }
        });

        p.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    };

    // This promise is for the dosbox process itself, not the log collection.
    // It is not awaited here, but it is important to handle errors from the dosbox process.
    const _dosboxRunPromise = box.run(["-log-con"], cpHandler).catch(e => { throw new Error(e); });

    const message = await Promise.race([
        diagPromise,
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Diagnose timeout')), 15000))
    ]).catch(e => { throw new Error("can't get dosbox's result: " + e.message); });
    if (!result) throw new Error("can't get dosbox's result (no log file)");
    return { message, result };
}



// ─── Entry Point ─────────────────────────────────────────────────

/**
 * Extension activation function (Desktop version).
 *
 * Registers three commands, dispatching to DOSBox or jsdos based on the configured emulator type.
 */
export async function activate(context: vscode.ExtensionContext) {
    statusBar.activate(context);
    const jsdos_api = activateJSdos(context);
    const dosbox_api = await activateDosbox(context);
    const cis = new CIManager(context);
    const diag = Diag.activate(context);

    async function handleAction(actionType: ActionType, uri: vscode.Uri) {
        const emulator = config.getEmulator();

        // DOSBox path
        if (emulator === DosEmulatorType.dosbox) {
            const box = dosbox_api.dosbox;
            const config = await loadDosasmConfig(uri);
            const ctx = await makeDosboxContext(actionType, uri, context, config);
            const runResult = await runDosbox(context, ctx, box);
            const diagResult = await Diag.messageDiagnose(runResult.message, ctx.doc, diag);
            return { message: runResult.message, error: diagResult.error, warn: diagResult.warn, result: runResult.result };
        }

        // DOSBox path
        if (emulator === DosEmulatorType.dosboxX) {
            const box = dosbox_api.dosboxX;
            const config = await loadDosasmConfig(uri);
            const ctx = await makeDosboxContext(actionType, uri, context, config);
            const runResult = await runDosboxX(context, ctx, box);
            const diagResult = await Diag.messageDiagnose(runResult.message, ctx.doc, diag);
            return { message: runResult.message, error: diagResult.error, warn: diagResult.warn, result: runResult.result };
        }

        // jsdos path
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