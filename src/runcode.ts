import * as vscode from 'vscode'
import {Config} from './configration'
import {DOSBox} from './DOSBox'
import { MSDOSplayer } from './MSDOS-player'
import { landiagnose } from './diagnose';
import { Uri } from 'vscode';
import * as nls from 'vscode-nls';
const localize =  nls.loadMessageBundle();
export class runcode{
    private readonly extOutChannel: vscode.OutputChannel;
    private readonly exturi:Uri
    private _config:Config
    private msdosplayer:MSDOSplayer
    private dosbox: DOSBox
    private landiag:landiagnose
    constructor(content: vscode.ExtensionContext) {
        this.exturi = content.extensionUri
        this.extOutChannel = vscode.window.createOutputChannel('Masm-Tasm');
        this._config=new  Config(this.exturi);
        this.msdosplayer=new MSDOSplayer()
        this.dosbox=new DOSBox()
        this.landiag=new landiagnose(this.extOutChannel)
    }
    private Openemu(fileuri:Uri){
        let openemumsg=localize("openemu.msg","\nMASM/TASM>>Open DOSBox:{0}",fileuri.fsPath)
        this.extOutChannel.appendLine(openemumsg);
        this.dosbox.openDOSBox(this._config,undefined,fileuri,)
    }
    /**运行汇编代码的入口
     * 获取拓展的设置，并执行相应操作
     */
    private Run(fileuri:Uri){
        let runmsg=localize("run.msg","\n{0}({1})>>Run:{2}",this._config.MASMorTASM,this._config.DOSemu,fileuri.fsPath)
        this.extOutChannel.appendLine(runmsg);
        switch(this._config.DOSemu){
            case 'msdos player': this.msdosplayer.PlayerASM(this._config,true,true,this.landiag,fileuri);break;
            case 'dosbox':
                let text='x:\\boxasm.bat '+this._config.MASMorTASM+' run '+this._config.boxrunbat
                this.dosbox.openDOSBox(this._config,text,fileuri,this.landiag)
                break;
            case 'auto': this.msdosplayer.PlayerASM(this._config,true,false,this.landiag,fileuri);break;
            default: throw new Error("未指定emulator");  
        }
    }
    /**调试程序
     * 获取拓展的设置并执行相应操作
     */
    private Debug(fileuri:Uri){
        let debugmsg=localize("debug.msg","\n{0}({1})>>Debug:{2}",this._config.MASMorTASM,this._config.DOSemu,fileuri.fsPath)
        this.extOutChannel.appendLine(debugmsg);
        if (this._config.DOSemu=='msdos player' && this._config.MASMorTASM=='MASM'){
            this.msdosplayer.PlayerASM(this._config,false,true,this.landiag,fileuri)
        }
        else if (this._config.DOSemu=='auto')
        {
            let inplayer:boolean=false
            if (this._config.MASMorTASM=='MASM') inplayer=true
            this.msdosplayer.PlayerASM(this._config,false,inplayer,this.landiag,fileuri)
        }
        else{
            let text='x:\\boxasm.bat '+this._config.MASMorTASM+' debug'
            this.dosbox.openDOSBox(this._config,text,fileuri,this.landiag)
        }
    }
    public cleanalldiagnose(){
        this.landiag.cleandiagnose('both')
    }
    deactivate() {
        this.extOutChannel.dispose();
    }
    /**更新设置，根据设置保存编辑器文件
     **/
    public runcode(command:string){
        let exturi=this.exturi
        vscode.workspace.onDidChangeConfiguration((event) =>{this._config=new Config(exturi)},this._config)
        const fileuri=vscode.window.activeTextEditor?.document.uri
        if(fileuri)
        {
            if (this._config.savefirst && vscode.window.activeTextEditor?.document.isDirty) {
            vscode.window.activeTextEditor?.document.save().then(()=>this.asmit(command,fileuri))  
            }
            else this.asmit(command,fileuri)
        }
    }
    private asmit(command:string,fileuri:Uri){
        switch (command){
            case 'opendosbox':this.Openemu(fileuri);break
            case 'run':this.Run(fileuri);break
            case 'debug':this.Debug(fileuri);break
        }  
    }
}