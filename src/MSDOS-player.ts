import { OutputChannel,workspace, window, Terminal} from 'vscode'
import { Config } from './configration';
import { exec } from 'child_process'
import { DOSBox } from './DOSBox'
import { landiagnose } from './diagnose'
export class MSDOSplayer{
    private _terminal: Terminal|null
    private extpath:string
    private extOutChannel:OutputChannel
    constructor(Channel:OutputChannel,extpath:string){
        this.extpath = extpath
        this.extOutChannel=Channel
        this._terminal=null
    }
    /**
     * 使用msdos-player执行汇编链接，如果汇编成功执行运行或者调试，如果失败输出错误信息
     * @param conf 获取拓展的设置
     * @param isrun 决定是运行还是调试，true为运行，false为debug 
     * @param viaplayer 决定在什么中运行/调试,true为在msdos-player中运行或调试，fasle为在dosbox中进行
     */
    public PlayerASM(conf:Config,isrun:boolean,viaplayer:boolean,diag:landiagnose)
    {
        const fileuri=window.activeTextEditor?.document.uri
        let filecontent:string
        if(fileuri){
            workspace.fs.readFile(fileuri).then(
                (text)=>{
                    filecontent=text.toString()
                    console.log(text)}
            )
            const filename = window.activeTextEditor?.document.fileName;
            exec(this.extpath+'\\tools\\asmo.bat "'+conf.path+'" '+conf.MASMorTASM+' link "'+filename+'"',{cwd:conf.path,shell:'cmd.exe'},
        (error, stdout, stderr) => {
            if (error) {console.error(`执行的错误: ${error}`);return;}
            this.extOutChannel.append(stdout)
            let info=stdout.substring(0,4)
            diag.ErrMsgProcess(filecontent,stdout,fileuri)
            switch(info)
            {
                case 'Fail':
                    let Errmsgwindow=conf.MASMorTASM+'汇编出错,无法运行/调试'
                    window.showErrorMessage(Errmsgwindow);
                    break
                case 'warn':
                    let warningmsgwindow=conf.MASMorTASM+'成功汇编链接生成EXE，但是汇编时产生了警告信息(warning)，可能无法运行/调试,是否继续操作'
                    window.showInformationMessage(warningmsgwindow, '继续', '否').then(result => {
                        if (result === '继续') {
                            this.afterlink(conf,viaplayer,isrun)
                        } 
                    });
                    break
                case 'Succ': 
                    this.afterlink(conf,viaplayer,isrun)
                    break
            }
          })}
    }
    private outTerminal(run:boolean,conf:Config) {
        if (this._terminal?.exitStatus || this._terminal ===null) {
            this._terminal = window.createTerminal({
                cwd: conf.path+'\\work',
                shellPath: "cmd.exe",
                hideFromUser: false,
            });
        }
        this._terminal.show()  
        if (run){
            this._terminal.sendText('msdos T.EXE')}
        else{
            this._terminal.sendText('msdos -v5.0 ..\\masm\\debug T.EXE')}
        this._terminal.dispose
    }

    private afterlink(conf:Config,viaplayer:boolean,runordebug:boolean){
        if(viaplayer){
            this.outTerminal(runordebug,conf)
        }
        else {
            let dosbox=new  DOSBox(this.extOutChannel)
            if (runordebug){
            dosbox.openDOSBox(conf,'T.EXE\n'+conf.BOXrun,false)}
            else{
            dosbox.openDOSBox(conf,conf.DEBUG,false)}
        }
    }
}