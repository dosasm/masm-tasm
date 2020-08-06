import { Uri,workspace, window} from 'vscode'

import { Config } from './configration'
import { execSync} from 'child_process'
import { landiagnose } from './diagnose'
export class DOSBox{
    constructor(){
    }
    /**打开dosbox,操作文件
     * @param conf 配置文件
     * @param more 需要执行的额外命令
     * @param fileuri 清理工作文件夹，复制该文件到工作文件夹，假如没有那么就不处理
     * @param diag 如果有则诊断输出信息
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
    
    
}



