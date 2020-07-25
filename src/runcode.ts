import * as vscode from 'vscode'
import {Config} from './configration'
import {exec} from 'child_process'
import {landiagnose} from './diagnose'
export class runcode{
    private readonly _masmChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal|null
    private _config:Config|null
    private extpath:string
    private landiag:landiagnose
    private filecontent:string=' '
    constructor(content: vscode.ExtensionContext) {
        const path = content.globalStoragePath.replace(/\\/g, '/');
        this.extpath = content.extensionPath
        this.landiag=new landiagnose()
        this._masmChannel = vscode.window.createOutputChannel('Masm-Tasm');
        this._terminal = null;
        this._config=null;
    }
    deactivate() {
        this._masmChannel.dispose();
        if (this._terminal !== null) {
            this._terminal.dispose();
        }
    }
    /**更新设置，根据设置保存编辑器文件
     **/
    private update(){
        this._config=new Config(this.extpath)
        if (this._config.savefirst) {
            vscode.workspace.saveAll()
        }
        return this._config
    }

    /**
     * 执行msdos需要的终端操作，打开终端并输出内容
     * @param run 为true执行运行命令，为false执行调试任务
     * @param conf 
     */
    private outTerminal(run:boolean,conf:Config) {
        if (this._terminal?.exitStatus || this._terminal ===null) {
            this._terminal = vscode.window.createTerminal({
                cwd: conf.path+'\\work',
                shellPath: "cmd.exe",
                hideFromUser: false,
            });
        }
        this._terminal.show()  
        if (run){
            this._terminal.sendText('msdos T.EXE')}
        else{
            this._terminal.sendText('msdos -v5.0 ..\\masm\\debug T.exe')}
        this._terminal.dispose
    }
    private cleanandcopy(conf:Config){
        let filename = vscode.window.activeTextEditor?.document.fileName;
        exec('  del work\\T.* && copy "'+filename+'" work\\T.ASM',{cwd:conf.path,shell:'cmd.exe'});
        this._masmChannel.appendLine(filename+'已将该文件复制到'+conf.path+'work/T.ASM');
     }
    private afterlink(conf:Config,viaplayer:boolean,runordebug:boolean){
        if(viaplayer){
            this.outTerminal(runordebug,conf)
        }
        else {
            if (runordebug){
            this.openDOSBox('T.exe\n'+conf.BOXrun,false,conf)}
            else{
            this.openDOSBox(conf.DEBUG,false,conf)}
        }
    }
    /**
     * 使用msdos来实现相关操作
     * @param mode 为link表示调用batch脚本执行汇编、链接
     * @param conf 
     * @param runordebug true为运行，false为debug 
     * @param viaplayer true为在msdos-player中运行或调试，fasle为在dosbox中进行
     */
    private PlayerASM(mode:string,conf:Config,runordebug:boolean,viaplayer:boolean)
    {
        const fileuri=vscode.window.activeTextEditor?.document.uri
        if(fileuri){
            vscode.workspace.fs.readFile(fileuri).then(
                (text)=>{
                    this.filecontent=text.toString()
                    console.log(text)}
            )
            const filename = vscode.window.activeTextEditor?.document.fileName;
            exec(this.extpath+'\\tools\\asmo.bat "'+conf.path+'" '+conf.MASMorTASM+' '+mode+' "'+filename+'"',{cwd:conf.path,shell:'cmd.exe'},
        (error, stdout, stderr) => {
            if (error) {console.error(`执行的错误: ${error}`);return;}
            this._masmChannel.append(stdout)
            let info=stdout.substring(0,4)
            this.landiag.ErrMsgProcess(this.filecontent,stdout,fileuri)
            switch(info)
            {
                case 'Fail':
                    let Errmsgwindow=conf.MASMorTASM+'汇编出错,无法运行/调试'
                    vscode.window.showErrorMessage(Errmsgwindow);
                    break
                case 'warn':
                    let warningmsgwindow=conf.MASMorTASM+'成功汇编链接生成EXE，但是汇编时产生了警告信息(warning)，可能无法运行/调试,是否继续操作'
                    vscode.window.showInformationMessage(warningmsgwindow, '继续', '否').then(result => {
                        if (result === '继续') {
                            this.afterlink(conf,viaplayer,runordebug)
                        } 
                    });
                    break
                case 'Succ': 
                    this.afterlink(conf,viaplayer,runordebug)
                    break
            }
          })}
    }
    /**打开dosbox,操作文件
     * @param more 在挂载和设置路径之后执行什么命令 
     * @param bothtools 为true将MASM和TASM都挂载到path中，并删除T.*复制相应文件到此处
     * @param conf 配置文件类
     */
    openDOSBox(more:string,bothtools?:boolean,conf?:Config) {
        if(!conf)       conf=this.update()
        if(bothtools)   this.cleanandcopy(conf)
        conf.writeConfig(more,bothtools);
        exec('start/min/wait "" "dosbox/dosbox.exe" -conf "dosbox/VSC-ExtUse.conf" ',{cwd:conf.path,shell:'cmd.exe'})
        this._masmChannel.appendLine('已打开dosbox，并配置相关环境');
    }

    /**运行汇编代码的入口
     * 获取拓展的设置，并执行相应操作
     */
    Run(){
        this._config=this.update()
        this._masmChannel.appendLine('运行程序，使用'+this._config.MASMorTASM+' 在'+this._config.DOSemu+'模式下运行');
        switch(this._config.DOSemu){
            case 'msdos player': this.PlayerASM('link',this._config,true,true);break;
            case 'dosbox':
                let text=`${this._config.ASM} \nif exist T.obj ${this._config.LINK} \nif exist T.exe T.exe \n`+this._config.BOXrun
                this.openDOSBox(text,true)
                break;
            case 'auto': this.PlayerASM('link',this._config,true,false);break;
            default: throw new Error("未指定emulator");  
        }
    }
    /**调试程序
     * 获取拓展的设置并执行相应操作
     */
    Debug(){
        this._config=this.update()
        if (this._config.DOSemu=='msdos player' && this._config.MASMorTASM=='MASM'){
            this.PlayerASM('link',this._config,false,true)
        }
        else if (this._config.DOSemu=='auto')
        {
            let inplayer:boolean=false
            if (this._config.MASMorTASM=='MASM') inplayer=true
            this.PlayerASM('link',this._config,false,inplayer)
        }
        else{
            let text=`${this._config.ASM} \nif exist T.obj ${this._config.LINK} \nif exist T.exe `+this._config.DEBUG
            this.openDOSBox(text,true)
        }   
    }
    public cleanalldiagnose(){
        this.landiag.cleandiagnose('both')
    }
}