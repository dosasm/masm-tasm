import { Uri, workspace, window, TextDocument } from 'vscode';

import { Config } from './configration';
import { execSync } from 'child_process';
import { AssemblerDiag } from './language/diagnose';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();
export class DOSBox {
    constructor() {
    }
    /**打开dosbox,操作文件
     * @param conf 配置信息
     * @param more 需要执行的额外命令
     * @param doc 需要处理的文件，假如有会清理工作文件夹，复制该文件到工作文件夹
     * @param diag 如果有则诊断输出信息
     */
    public openDOSBox(conf: Config, more?: string, doc?: TextDocument, diag?: AssemblerDiag) {
        let boxcommand = ' ';
        if (more) {
            let boxparam = more.replace(/\n/g, '"-c "');
            boxcommand = '-c "' + boxparam + '"';
        }
        let command = conf.OpenDosbox + ' -conf "' + conf.dosboxconfuri.fsPath + '" ';
        if (process.platform === 'win32') {
            if (doc) { command = 'del/Q T*.* & copy "' + doc.fileName + '" "T.ASM" & ' + command; }
            execSync(command + boxcommand, { cwd: conf.workpath, shell: 'cmd.exe' });
        }
        else {
            if (doc) { command = 'rm -f [Tt]*.*;cp "' + doc.fileName + '" T.ASM;' + command; }
            execSync(command + boxcommand, { cwd: conf.workpath });

        }
        if (diag && doc) { this.BOXdiag(conf, diag, doc); }
    }
    public BoxOpenCurrentFolder(conf: Config, doc: TextDocument) {
        let folderpath: string = Uri.joinPath(doc.uri, '../').fsPath;
        let Ecmd: string = '-noautoexec -c "mount e \\\"' + folderpath + '\\\"" -c "mount c \\\"' + conf.path + '\\\"" -c "set PATH=%%PATH%%;c:\masm;c:\\tasm"-c "e:"';
        let command = conf.OpenDosbox + ' -conf "' + conf.dosboxconfuri.fsPath + '" ';
        if (process.platform === 'win32') {
            execSync(command + Ecmd, { cwd: conf.workpath, shell: 'cmd.exe' });
        }
        else {
            execSync(command + Ecmd, { cwd: conf.workpath });
        }

    }
    private BOXdiag(conf: Config, diag: AssemblerDiag, doc: TextDocument): string {
        let info: string = ' ', content: string;
        let document = doc;
        if (document) {
            content = document.getText();
            workspace.fs.readFile(conf.workloguri).then(
                (text) => {
                    info = text.toString();
                    if (diag.ErrMsgProcess(content, info, doc.uri, conf.MASMorTASM) === 0) {
                        let Errmsgwindow = localize("dosbox.errmsg", '{0} Failed to compile. See the output for more information', conf.MASMorTASM);
                        window.showErrorMessage(Errmsgwindow);
                    }
                },
                () => { console.error('read dosbox mode T.txt FAILED'); }
            );
        }
        return info;
    }
}



