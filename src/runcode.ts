import * as vscode from 'vscode'
import {Config} from './configration'
import {exec} from 'child_process'
export class runcode{
    private readonly _masmChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal|null
    private _config:Config|null
    private extpath:string
    private count:number=1
    constructor(content: vscode.ExtensionContext) {
        const path = content.globalStoragePath.replace(/\\/g, '/');
        this.extpath = content.extensionPath
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
    /**删除原来的旧文件，复制编辑器中的新文件
     * 更新设置，根据设置保存编辑器文件
     * 根据设置指定不同的汇编指令
     **/
    private update(){
        this._config=new Config(this.extpath)
        if (this._config.savefirst) {
            vscode.workspace.saveAll()
        }
        return this._config
    }
    private crtTerminal(hide:boolean,cwdpath:string):vscode.Terminal {
        this._config=this.update()
        if (this._terminal?.exitStatus || this._terminal ===null) {
            this._terminal = vscode.window.createTerminal({
                cwd: cwdpath,
                shellPath: "cmd.exe",
                hideFromUser: hide,
            });
        }
        return this._terminal
    }

    /**
     * 打开dosbox
     * @param more需要额外写入配置文件 让dosbox运行的额外命令 ，如编译运行等相关操作
     * @param bothtools 是否将两种工具都写入dosbox path变量中
     * @param conf 配置文件类
     */
    openDOSBox(more:string,bothtools:boolean,conf?:Config) {
        if(!conf){conf=this.update()}
        conf.writeConfig(more,bothtools);
        let filename = vscode.window.activeTextEditor?.document.fileName;
        exec('  del work\\T.* && copy "'+filename+'" work\\T.ASM',{cwd:conf.path,shell:'cmd.exe'});
        this._masmChannel.appendLine(filename+'已将该文件复制到'+conf.path+'work/T.ASM');
        exec('start/min/wait "" "dosbox/dosbox.exe" -conf "dosbox/VSC-ExtUse.conf" ',{cwd:conf.path,shell:'cmd.exe'})
        this._masmChannel.appendLine('已打开dosbox，并配置相关环境');
    }

    /**
     * 使用msdos来实现相关操作
     * @param mode 
     * @param conf 
     * @param runordebug true为运行，false为debug 
     */
    private PlayerASM(mode:string,conf:Config,runordebug:boolean)
    {
        const filename = vscode.window.activeTextEditor?.document.fileName;
        exec(this.extpath+'\\tools\\asmo.bat "'+conf.path+'" '+conf.MASMorTASM+' '+mode+' "'+filename+'"',{cwd:conf.path,shell:'cmd.exe'},
        (error, stdout, stderr) => {
                this._terminal=this.crtTerminal(false,conf.path+'\\work')
                this._terminal.show()
                if (runordebug){this._terminal.sendText('msdos T.EXE')}
                else{this._terminal.sendText('msdos -v5.0 ..\\masm\\debug T.exe')}
                this._terminal.dispose
            if (error) {
              console.error(`执行的错误: ${error}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
          })
        
    }
    Run(){
        this._config=this.update()
        this._masmChannel.appendLine('运行程序，使用'+this._config.MASMorTASM+' 在'+this._config.DOSemu+'中运行');
        switch(this._config.DOSemu){
            case 'msdos player': this.PlayerASM('link',this._config,true);break;
            case 'dosbox':
                let text=`${this._config.ASM} \nif exist T.obj ${this._config.LINK} \nif exist T.exe T.exe \n`+this._config.BOXrun
                this.openDOSBox(text,false)
                break;
            case 'mixed':
                break;
            default: throw new Error("未指定emulator");  
        }
    }
    Debug(){
        this._config=this.update()
        if (this._config.DOSemu=='msdos player' && this._config.MASMorTASM=='MASM'){
            this.PlayerASM('link',this._config,false)
        }
        else{
            let text=`${this._config.ASM} \nif exist T.obj ${this._config.LINK} \nif exist T.exe `+this._config.DEBUG
            this.openDOSBox(text,false)
        }
    }
}