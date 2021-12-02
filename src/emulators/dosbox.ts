import { ExtensionContext, workspace } from "vscode";
import { ActionContext, AsmResult, ExecAction, API, Dosbox as _Dosbox } from "../ASM/manager";
import { Utils } from 'vscode-uri';
import * as path from "path";
import { messageCollector } from "../diagnose/messageCollector";

import * as nodefs from "fs";
import * as conf from "../utils/configuration";
import { emptyFolder } from "../utils/util";

let USE_NODEFS_WATCH = true;

const fs = workspace.fs;

function updateDosboxConf(box: _Dosbox) {
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

export class Dosbox implements ExecAction {
    name: conf.DosEmulatorType[] = [
        conf.DosEmulatorType.dosbox,
        conf.DosEmulatorType.dosboxX
    ];
    async run(context: ExtensionContext, ctx: ActionContext, api: API): Promise<AsmResult> {
        if (ctx.mountMode === conf.MountMode.single) {
            await emptyFolder(ctx.seperateSpaceFolder);
            await fs.copy(ctx.fileUri, ctx.fileCopyUri);
        }

        const box = conf.extConf.emulator === conf.DosEmulatorType.dosboxX ? api.dosboxX : api.dosbox;
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
        const file = path.relative(
            workspaceFolder.fsPath,
            ctx.mountMode === conf.MountMode.single ? ctx.fileCopyUri.fsPath : ctx.fileUri.fsPath,
        );
        const fileinfo = path.parse(file);
        function cb(val: string) {
            const r = val
                .replace("${file}", file)
                .replace("${filename}", file.replace(fileinfo.ext, ""));
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

        if (ctx.actionType !== conf.ActionType.open && USE_NODEFS_WATCH) {
            const [hook, promise] = messageCollector();
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
            promise.then(val => {
                console.log(val);
                result = val;
            });
        }

        await box.run().catch(e => {
            console.error("dosbox run error", e);
        });

        if (result === undefined) {
            if (nodefs.existsSync(logUri.fsPath)) {
                result = nodefs.readFileSync(logUri.fsPath, { encoding: 'utf-8' });
            }
        }
        if (result === undefined) {
            throw new Error("can't get dosbox's result" + logUri.fsPath);
        }
        return { message: result };
    }
}
