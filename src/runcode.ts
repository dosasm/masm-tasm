import * as vscode from 'vscode'
import {Config} from './configration'
export class runcode{
    private readonly _masmChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal
    protected _config:Config
    constructor(content: vscode.ExtensionContext) {
        this._config=new Config()
        this._masmChannel = vscode.window.createOutputChannel('Masm-Tasm');
        const path = content.globalStoragePath.replace(/\\/g, '/');
        this._terminal = vscode.window.createTerminal({
            shellPath: 'cmd.exe',
            hideFromUser: true
        });
    
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
        this._config=new Config()
        if (this._config.savefirst) {
            vscode.workspace.saveAll()
        }
    }
    private crtTerminal(hide:boolean,more?:string):vscode.Terminal {
        if (this._terminal === null) {
            this._terminal = vscode.window.createTerminal({
                cwd: this._config.path,
                shellPath: "cmd.exe",
                hideFromUser: hide,
            });
        }
        const filename = vscode.window.activeTextEditor?.document.fileName;
        this._terminal.sendText(this._config.path+'" && del work\\T.* && copy "'+filename+'" work\\T.ASM');
        this._masmChannel.appendLine('清除原来的文件T.*并将当前编辑文件复制到' + this._config.path+'work/T.ASM');
        if(more){this._terminal.sendText(more)}
        return this._terminal
    }
    openDOSBox(more:string,bothtools:boolean) {
        this.crtTerminal(true);
        this._terminal.hide();
        this._config.writeConfig(more,bothtools);
        let command ='start/min/wait "" "dosbox/dosbox.exe" -conf "dosbox/VSC-ExtUse.conf" ';
        this._masmChannel.appendLine(command);
        this._terminal.sendText(command);
        this._masmChannel.appendLine('已打开dosbox，并配置相关环境');
    }
    private PlayerASM(more:string){
        this.crtTerminal(false);
        this._terminal.sendText('cd work');
        let command='msdos ..\\'+this._config.MASMorTASM+'\\';
        let command1=command+this._config.ASM+'&& if exist T.OBJ '+command+this._config.LINK
        this._terminal.show();
        this._terminal.sendText(command1+'&&'+more)
    }
    Run(){
        this.update()
        switch(this._config.DOSemu){
            case 'msdos player': this.PlayerASM('msdos T.EXE');break;
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
        this.update()
        if (this._config.DOSemu=='msdos player' && this._config.MASMorTASM=='MASM'){
            this.PlayerASM('msdos -v5.0 ../masm/'+this._config.DEBUG)
        }
        else{
            let text=`${this._config.ASM} \nif exist T.obj ${this._config.LINK} \nif exist T.exe `+this._config.DEBUG
            this.openDOSBox(text,false)
        }
    }
}