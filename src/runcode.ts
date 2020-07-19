import * as vscode from 'vscode'
import {Config} from './configration'
export class runcode{
    private readonly _masmChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal
    protected _config:Config
    private ASM:string
    private LINK:string
    private DEBUG:string
    constructor(content: vscode.ExtensionContext) {
        this._config=new Config()
        this._masmChannel = vscode.window.createOutputChannel('Masm-Tasm');
        const path = content.globalStoragePath.replace(/\\/g, '/');
        this._terminal = vscode.window.createTerminal({
            shellPath: 'cmd.exe',
            hideFromUser: true
        });
        if (this._config.MASMorTASM=='MASM'){
            this.ASM='MASM T.ASM;'
            this.LINK='LINK T.OBJ;'
            this.DEBUG='DEBUG T.EXE'
        }
        else{
            this.ASM='TASM /zi T.ASM'
            this.LINK='TLINK /v/3 T.OBJ;'
            this.DEBUG='if exist c:\\tasm\\TDC2.TD copy c:\\tasm\\TDC2.TD TDCONFIG.TD \nTD T.EXE'
        }
    
    }
    
    //删除原来的旧文件，复制编辑器的新文件
    private update(){
        this._config=new Config()
        if (this._config.MASMorTASM=='MASM'){
            this.ASM='MASM T.ASM;'
            this.LINK='LINK T.OBJ;'
            this.DEBUG='DEBUG T.EXE'
        }
        else{
            this.ASM='TASM /zi T.ASM'
            this.LINK='TLINK /v/3 T.OBJ;'
            this.DEBUG='if exist c:\\tasm\\TDC2.TD copy c:\\tasm\\TDC2.TD TDCONFIG.TD \nTD T.EXE'
        }
    }
    // private exitshell(){
    //     this._terminal.sendText('exit');
    //     this._terminal.dispose
    // }
    private PreDoing():vscode.Terminal {
        const filename = vscode.window.activeTextEditor?.document.fileName;
        this._terminal.sendText('cd "' + this._config.path+'" && del work\\T.* && copy "'+filename+'" work\\T.ASM');
        this._masmChannel.appendLine('清除原来的文件T.*并将当前编辑文件复制到' + this._config.path+'work/T.ASM');
        return this._terminal
    }
    openDOSBox(more:string,bothtools:boolean) {
        this.PreDoing();
        this._terminal.hide();
        this._config.writeConfig(more,bothtools);
        let command ='start/min/wait "" "dosbox/dosbox.exe" -conf "dosbox/VSC-ExtUse.conf" ';
        this._masmChannel.appendLine(command);
        this._terminal.sendText(command);
        this._masmChannel.appendLine('已打开dosbox，并配置相关环境');
        //this.exitshell()
    }
    private PlayerASM(more:string){
        this.PreDoing();
        this._terminal.sendText('cd work');
        let command='msdos ..\\'+this._config.MASMorTASM+'\\';
        let command1=command+this.ASM+'&& if exist T.OBJ '+command+this.LINK
        this._terminal.show();
        this._terminal.sendText(command1+'&&'+more)
        //this.exitshell()
    }
    Run(){
        this.update()
        if (this._config.DOSemu==true){
            this.PlayerASM('msdos T.EXE')
        }
        else if (this._config.DOSemu==false){
            let text=`${this.ASM} \nif exist T.obj ${this.LINK} \nif exist T.exe T.exe \n`+this._config.BOXrun
            this.openDOSBox(text,false)
        }
        else{
            throw new Error("未指定emulator");  
        }
    }
    Debug(){
        this.update()
        if (this._config.DOSemu==true && this._config.MASMorTASM=='MASM'){
            this.PlayerASM('msdos -v5.0 ../masm/'+this.DEBUG)
        }
        else{
            let text=`${this.ASM} \nif exist T.obj ${this.LINK} \nif exist T.exe `+this.DEBUG
            this.openDOSBox(text,false)
        }
    }
}