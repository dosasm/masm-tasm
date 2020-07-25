import { Uri,FileSystem, OutputChannel,workspace, window} from 'vscode'
import { TextEncoder } from 'util';
import { Config } from './configration';
import {exec} from 'child_process'
export class DOSBox{
    private _OutChannel:OutputChannel
    constructor(Channel:OutputChannel){
        this._OutChannel=Channel
    }
    private cleanandcopy(cleanpath:string,copyfilename:string){
        // let filename = vscode.window.activeTextEditor?.document.fileName;
        exec('  del work\\T.* && copy "'+copyfilename+'" work\\T.ASM',{cwd:cleanpath,shell:'cmd.exe'});
        this._OutChannel.appendLine(copyfilename+'已将该文件复制到'+cleanpath+'work/T.ASM');
     }
    private writeBoxconfig(autoExec: string,conf:Config,bothtool?:boolean)
    {
        let fs: FileSystem = workspace.fs;
        let configUri:Uri = Uri.parse('file:///' + conf.path + '/dosbox/VSC-ExtUse.conf');
        let Pathadd=conf.MASMorTASM
        if (bothtool){Pathadd='tasm;c:\\masm'}
        const configContent = `[sdl]
windowresolution=${conf.resolution}
output=opengl
[autoexec]
mount c ${conf.path}
mount d ${conf.path}\\work
set PATH=c:\\${Pathadd}
d:
${autoExec}`;
        fs.writeFile(configUri, new TextEncoder().encode(configContent));
    }

     /**打开dosbox,操作文件
     * @param more 在挂载和设置路径之后执行什么命令 
     * @param bothtools 为true将MASM和TASM都挂载到path中，并删除T.*复制相应文件到此处
     * @param conf 配置文件类
     */
    openDOSBox(more:string,conf:Config,bothtools?:boolean) {
        let filename=window.activeTextEditor?.document.fileName
        if (filename){
            this.writeBoxconfig(more,conf,bothtools);
            exec('start/min/wait "" "dosbox/dosbox.exe" -conf "dosbox/VSC-ExtUse.conf" ',{cwd:conf.path,shell:'cmd.exe'})
            if(bothtools)this.cleanandcopy(conf.path,filename)
            this._OutChannel.appendLine("已打开DOSBox，并配置汇编环境")
        }   
    }
}



