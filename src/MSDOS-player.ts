import { workspace, window, Terminal,Uri, TextDocument} from 'vscode'
import { Config } from './configration';
import { exec } from 'child_process'
import { DOSBox } from './DOSBox'
import { landiagnose } from './language/diagnose'
import * as nls from 'vscode-nls';
const localize =  nls.loadMessageBundle()
export class MSDOSplayer{
    private _terminal: Terminal|null
    constructor(){
        this._terminal=null
    }
    /**
     * 使用msdos-player执行汇编链接，如果汇编成功执行运行或者调试，如果失败输出错误信息
     * @param conf 获取拓展的设置
     * @param isrun 决定是运行还是调试，true为运行，false为debug 
     * @param viaplayer 决定在什么中运行/调试,true为在msdos-player中运行或调试，fasle为在dosbox中进行
     * @param diag 处理输出信息的类
     * @param fileuri 需要处理的文件的Uri
     */
    public PlayerASM(conf:Config,isrun:boolean,viaplayer:boolean,diag:landiagnose,doc:TextDocument)
    {
        let filecontent:string
        filecontent=doc.getText()
        const filename = doc.fileName
        let command='"'+conf.msbatpath+'" "'+conf.path+'" '+conf.MASMorTASM+' "'+filename+'" "'+conf.workpath+'"'
        exec(command,{cwd:conf.path,shell:'cmd.exe'},(error, stdout, stderr) => 
        {
            if (error) {console.error(`exec playerasm.bat: ${error}`);}
            let code=diag.ErrMsgProcess(filecontent,stdout,doc.uri,conf.MASMorTASM)
            switch(code)
            {
                case 0:
                    let Errmsgwindow=localize("msdos.error","{0} Error,Can't generate .exe file",conf.MASMorTASM)
                    window.showErrorMessage(Errmsgwindow);
                    break
                case 1:
                    let warningmsgwindow=localize("msdos.warn","{0} Warning,successfully generate .exe file,but assembler has some warning message",conf.MASMorTASM);
                    let Go_on=localize("msdos.continue","continue")
                    let Stop=localize("msdos.stop","stop")
                    window.showInformationMessage(warningmsgwindow, Go_on, Stop).then(result => {
                        if (result === Go_on) {
                            this.afterlink(conf,viaplayer,isrun)
                        } 
                    });
                    break
                case 2:
                    this.afterlink(conf,viaplayer,isrun)
                    break
            }
            Config.writefile(Uri.joinPath(conf.toolsUri,'./work/T.TXT'),stdout)
            })
    }
    private outTerminal(run:boolean,conf:Config) {
        let myenv=process.env
        let myenvPATH=myenv.PATH+';'+conf.path+'\\player;'+conf.path+'\\tasm;'+conf.path+'\\masm;'
        if (this._terminal?.exitStatus || this._terminal ===null) {
            this._terminal = window.createTerminal({
                cwd: conf.workpath,
                env: {
                    "PATH":myenvPATH
                },
                shellPath: "cmd.exe",
                hideFromUser: false,
            });
        }
        this._terminal.show()
        if (run){
            this._terminal.sendText('msdos T.EXE')}
        else{
            this._terminal.sendText('msdos -v5.0 debug T.EXE')}
        this._terminal.dispose
    }

    private afterlink(conf:Config,viaplayer:boolean,runordebug:boolean){
        let debug:string
        if(conf.MASMorTASM=='TASM'){
            debug='if exist c:\\tasm\\TDC2.TD copy c:\\tasm\\TDC2.TD TDCONFIG.TD \nTD T.EXE'
        }
        else{
            debug='DEBUG T.EXE'
        }
        if(viaplayer){
            this.outTerminal(runordebug,conf)
        }
        else {
            let box=new DOSBox()
            if (runordebug){
                box.openDOSBox(conf,'T.EXE\n'+conf.boxruncmd)}
            else{
                box.openDOSBox(conf,debug)}
        }
    }
}