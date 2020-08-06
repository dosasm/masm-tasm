import { workspace, window, Terminal,Uri} from 'vscode'
import { Config } from './configration';
import { exec } from 'child_process'
import { DOSBox } from './DOSBox'
import { landiagnose } from './diagnose'
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
     */
    public PlayerASM(conf:Config,isrun:boolean,viaplayer:boolean,diag:landiagnose,fileuri:Uri)
    {
        let filecontent:string
        if(fileuri){
            workspace.fs.readFile(fileuri).then(
                (text)=>{
                    filecontent=text.toString()
                }
            )
            const filename = fileuri.fsPath
            let command='"'+conf.msbatpath+'" "'+conf.path+'" '+conf.MASMorTASM+' "'+filename+'" "'+conf.workpath+'"'
            console.log(command)
            exec(command,{cwd:conf.path,shell:'cmd.exe'},(error, stdout, stderr) => 
            {
                if (error) {console.error(`执行的错误: ${error}`);}
                let code=diag.ErrMsgProcess(filecontent,stdout,fileuri,conf.MASMorTASM)//处理错误信息
                switch(code)
                {
                    case 0:
                        let Errmsgwindow=conf.MASMorTASM+'汇编出错,无法运行/调试'
                        window.showErrorMessage(Errmsgwindow);
                        break
                    case 1:
                        let warningmsgwindow=conf.MASMorTASM+'成功汇编链接生成EXE，但是汇编时产生了警告信息(warning)，可能无法运行/调试,是否继续操作'
                        window.showInformationMessage(warningmsgwindow, '继续', '否').then(result => {
                            if (result === '继续') {
                                this.afterlink(conf,viaplayer,isrun)
                            } 
                        });
                        break
                    case 2:
                        this.afterlink(conf,viaplayer,isrun)
                        break
                }
                Config.writefile(Uri.joinPath(conf.toolsUri,'./work/T.TXT'),stdout)
            })}
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