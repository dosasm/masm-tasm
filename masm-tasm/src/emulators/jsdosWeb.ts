import { ExtensionContext, workspace } from "vscode";
import { DosEmulatorType } from "../utils/configuration";
import { ActionContext, AsmResult, ExecAction, API } from "../ASM/manager";
import { getFiles, uriUtils } from "../utils/util";

import * as conf from "../utils/configuration";
import * as path from "path";
import { messageCollector } from "../diagnose/messageCollector";

export class JsdosWeb implements ExecAction {
    name: DosEmulatorType | DosEmulatorType[] = DosEmulatorType.jsdos;
    async run(context: ExtensionContext, ctx: ActionContext, api: API): Promise<AsmResult> {
        await api.jsdos.jszip.loadAsync(ctx.bundleData);

        let fileInJsdos = "";
        if (ctx.mountMode === conf.MountMode.workspace) {
            for await (const f of getFiles(ctx.workspaceFolderUri)) {
                const rel = path.relative(ctx.workspaceFolderUri.fsPath, f.fsPath);
                const dst = path.posix.join('code/', rel);
                const _data = await workspace.fs.readFile(f);
                api.jsdos.jszip.file(dst, _data);
            }
            const rel = path.relative(
                ctx.workspaceFolderUri.fsPath,
                ctx.fileUri.fsPath,
            );
            fileInJsdos = "D:\\"+ rel.replace(/\//g,"\\");
        } else if (ctx.mountMode === conf.MountMode.single) {
            api.jsdos.jszip.file('code/test' + uriUtils.extname(ctx.fileUri), ctx.doc.getText());
            fileInJsdos = "D:\\test" + uriUtils.extname(ctx.fileUri);
        }

        const fileinfo = path.parse(fileInJsdos);
        const autoexec = [
            `mount c .`,
            `mount d ./code`,
            'd:'
        ];
        const before = conf.extConf.action.before;
        if (before) {
            autoexec.push(...before);
        }
        function cb(val: string) {
            const r = val
                .replace("${file}", fileInJsdos)
                .replace("${filename}", fileInJsdos.replace(fileinfo.ext, ""));
            if (val.startsWith('>')) {
                return r.replace(">", "");
            }
            return r;
        }
        if (ctx.actionType === conf.ActionType.run) {
            autoexec.push(...conf.extConf.action.run.map(cb));
        }
        if (ctx.actionType === conf.ActionType.debug) {
            autoexec.push(...conf.extConf.action.debug.map(cb));
        }
        api.jsdos.updateAutoexec(autoexec);
        const webview = await api.jsdos.runInWebview();
        if (ctx.actionType !== conf.ActionType.open) {
            const [hook, promise] = messageCollector();
            webview.onDidReceiveMessage(e => {
                switch (e.command) {
                    case 'stdout':
                        hook(e.value);
                        break;
                }
            });
            const message = await promise;
            return { message, webview };
        }
        throw new Error("can't get message from" + this.name);
    }
}