import { Uri,FileSystem, OutputChannel,workspace, window} from 'vscode'
import { TextEncoder } from 'util'
import { Config } from './configration'
import {exec,execSync} from 'child_process'
import { landiagnose } from './diagnose'
export class DOSBox{
    static writefile: any
    constructor(Channel:OutputChannel,conf:Config){
        this.writeBoxconfig(conf,undefined,true)
    }
    /**打开dosbox,操作文件
     * @param fileuri 
     * @param conf 配置文件
     * @param more 需要执行的额外命令
     * @param cleancopy 为true将MASM和TASM都挂载到path中，并删除T.*复制相应文件到此处
     */
    public openDOSBox(conf:Config,more?:string,fileuri?:Uri,diag?:landiagnose) {
        let boxcommand=' '
        if(more){
            let boxparam=more.replace(/\n/g,'"-c "')
            boxcommand='-c "'+boxparam+'"'
        }
        if(process.platform=='win32'){
            let wincommand='start/min/wait "" "'+conf.path+'/dosbox/dosbox.exe" -conf "'+conf.dosboxconfuri.fsPath+'" '
            if(fileuri) wincommand='del/Q T*.* & copy "'+fileuri.fsPath+'" "T.ASM" & '+wincommand
            execSync(wincommand+boxcommand,{cwd:conf.workpath,shell:'cmd.exe'})
            console.log(wincommand+boxcommand)
        }
        else{
            let linuxcommand='dosbox -conf "'+conf.dosboxconfuri.fsPath+'" '
            if(fileuri) linuxcommand='rm -f [Tt]*.*;cp "'+fileuri.fsPath+'" T.ASM;'+linuxcommand
            console.log(linuxcommand+boxcommand)
            execSync(linuxcommand+boxcommand,{cwd:conf.workpath})
            
        }
        if(diag) this.BOXdiag(conf,diag)
    }
    private BOXdiag(conf:Config,diag:landiagnose):string{
        let info:string=' ',content
        let turi=window.activeTextEditor?.document.uri
        let texturi:Uri
        if (turi) {
            texturi=turi
            workspace.fs.readFile(conf.workloguri).then(
            (text)=>{
                info=text.toString()
                workspace.fs.readFile(texturi).then(
                    (text)=>{
                        content=text.toString()
                        if(diag.ErrMsgProcess(content,info,texturi,conf.MASMorTASM)==0){
                            let Errmsgwindow=conf.MASMorTASM+'汇编出错,无法运行/调试'
                            window.showErrorMessage(Errmsgwindow);
                        }
                    }
                )
            },
            ()=>{console.error('read dosbox mode T.txt FAILED')}
        )}
        return info
    }
    private writeBoxconfig(conf:Config,autoExec?: string,bothtool?:boolean)
    {
        let configUri=conf.dosboxconfuri
        let Pathadd=' '
        if (bothtool) Pathadd='set PATH=c:\\tasm;c:\\masm'
        let configContent = `[sdl]
windowresolution=${conf.resolution}
output=opengl
[autoexec]
mount c "${conf.path}"
mount d "${conf.workpath}"
mount x "${conf.batchpath}"
d:
${Pathadd}`;
        if (autoExec) configContent=configContent+'\n'+autoExec
        this.writefile(configUri,configContent)
    }
    public writefile(Uri:Uri,Content:string){
        let fs: FileSystem = workspace.fs
        fs.writeFile(Uri, new TextEncoder().encode(Content))
    }
    
}



