/**
 * 使用msdos-player 来完成一些操作
 */
import { window, Terminal, Uri, TextDocument } from 'vscode';
import { Config } from './configration';
import { exec } from 'child_process';
import * as DOSBox from './DOSBox';
import { AssemblerDiag } from './language/diagnose';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();
export class MSDOSplayer {
    private _terminal: Terminal | null;
    constructor() {
        this._terminal = null;
    }
    /**
     * 使用msdos-player执行汇编链接，如果汇编成功执行运行或者调试，如果失败输出错误信息
     * @param conf 获取拓展的设置
     * @param isrun 决定是运行还是调试，true为运行，false为debug 
     * @param viaplayer 决定在什么中运行/调试,true为在msdos-player中运行或调试，fasle为在dosbox中进行
     * @param diag 处理输出信息的类，如果有将使用diag.ErrMsgProcess处理错误信息
     * @param doc 需要处理的文件
     */
    public async PlayerASM(conf: Config, isrun: boolean, viaplayer: boolean, diag: AssemblerDiag, doc: TextDocument) {
        let filecontent: string = doc.getText();
        const filename = doc.fileName;
        let stdout: string = await runPlayer(conf, filename);
        let code = diag.ErrMsgProcess(filecontent, stdout, doc.uri, conf.MASMorTASM);
        let goon: boolean = false;
        switch (code) {
            case 0:
                let Errmsgwindow = localize("msdos.error", "{0} Error,Can't generate .exe file", conf.MASMorTASM);
                window.showErrorMessage(Errmsgwindow);
                break;
            case 1:
                let warningmsgwindow = localize("msdos.warn", "{0} Warning,successfully generate .exe file,but assembler has some warning message", conf.MASMorTASM);
                let Go_on = localize("msdos.continue", "continue");
                let Stop = localize("msdos.stop", "stop");
                window.showInformationMessage(warningmsgwindow, Go_on, Stop).then(result => {
                    if (result === Go_on) { goon = true; }
                });
                break;
            case 2:
                goon = true;
                break;
        }
        if (goon) { this.RunDebug(conf, viaplayer, isrun); };
    }
    private outTerminal(run: boolean, conf: Config) {
        let myenv = process.env;
        let myenvPATH = myenv.PATH + ';' + conf.path + '\\player;' + conf.path + '\\tasm;' + conf.path + '\\masm;';
        if (this._terminal?.exitStatus || this._terminal === null) {
            this._terminal = window.createTerminal({
                cwd: conf.workpath,
                env: {
                    "PATH": myenvPATH
                },
                shellPath: "cmd.exe",
                hideFromUser: false,
            });
        }
        this._terminal.show();
        if (run) {
            this._terminal.sendText('msdos T.EXE');
        }
        else {
            this._terminal.sendText('msdos -v5.0 debug T.EXE');
        }
    }
    public deactivate() {
        if (this._terminal) { this._terminal.dispose(); }
    }

    private RunDebug(conf: Config, viaplayer: boolean, runordebug: boolean) {
        let debug: string;
        if (conf.MASMorTASM === 'TASM') {
            debug = 'if exist c:\\tasm\\TDC2.TD copy c:\\tasm\\TDC2.TD TDCONFIG.TD \nTD T.EXE';
        }
        else {
            debug = 'DEBUG T.EXE';
        }
        if (viaplayer) {
            this.outTerminal(runordebug, conf);
        }
        else {
            if (runordebug) {
                DOSBox.runDosbox(conf, 'T.EXE' + conf.boxruncmd);
            }
            else {
                DOSBox.runDosbox(conf, debug);
            }
        }
    }
}
function runPlayer(conf: Config, filename: string): Promise<string> {
    let command = '"' + conf.msbatpath + '" "' + conf.path + '" ' + conf.MASMorTASM + ' "' + filename + '" "' + conf.workpath + '"';
    return new Promise<string>(
        (resolve, reject) => {
            let child = exec(
                command, { cwd: conf.path, shell: 'cmd.exe' }, (error, stdout, stderr) => {
                    if (error) {
                        reject(["exec msdos player error", error, stderr]);
                    }
                    else {
                        resolve(stdout);
                    }
                }
            );
        }
    );

}