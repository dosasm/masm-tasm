import * as vscode from 'vscode'
import {Config} from './configration'
import {DOSBox} from './DOSBox'
import { MSDOSplayer } from './MSDOS-player'
import { Uri } from 'vscode';
import * as nls from 'vscode-nls';
const localize =  nls.loadMessageBundle()
import { landiagnose } from './language/diagnose';
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
    private Openemu(doc:vscode.TextDocument){
        let openemumsg=localize("openemu.msg","\nMASM/TASM>>Open DOSBox:{0}",doc.fileName)
        this.extOutChannel.appendLine(openemumsg);
        this.dosbox.openDOSBox(this._config,undefined,doc)
    }
    /**运行汇编代码的入口
     * 获取拓展的设置，并执行相应操作
     */
    private Run(doc:vscode.TextDocument){
        let runmsg=localize("run.msg","\n{0}({1})>>Run:{2}",this._config.MASMorTASM,this._config.DOSemu,doc.fileName)
        this.extOutChannel.appendLine(runmsg);
        switch(this._config.DOSemu){
            case 'msdos player': this.msdosplayer.PlayerASM(this._config,true,true,this.landiag,doc);break;
            case 'dosbox':
                let text='x:\\boxasm.bat '+this._config.MASMorTASM+' run '+this._config.boxrunbat
                this.dosbox.openDOSBox(this._config,text,doc,this.landiag)
                break;
            case 'auto': this.msdosplayer.PlayerASM(this._config,true,false,this.landiag,doc);break;
            default: throw new Error("未指定emulator");  
        }
    }
    /**调试程序
     * 获取拓展的设置并执行相应操作
     */
    private Debug(doc:vscode.TextDocument){
        let debugmsg=localize("debug.msg","\n{0}({1})>>Debug:{2}",this._config.MASMorTASM,this._config.DOSemu,doc.fileName)
        this.extOutChannel.appendLine(debugmsg);
        if (this._config.DOSemu=='msdos player' && this._config.MASMorTASM=='MASM'){
            this.msdosplayer.PlayerASM(this._config,false,true,this.landiag,doc)
        }
        else if (this._config.DOSemu=='auto')
        {
            let inplayer:boolean=false
            if (this._config.MASMorTASM=='MASM') inplayer=true
            this.msdosplayer.PlayerASM(this._config,false,inplayer,this.landiag,doc)
        }
        else{
            let text='x:\\boxasm.bat '+this._config.MASMorTASM+' debug'
            this.dosbox.openDOSBox(this._config,text,doc,this.landiag)
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
        let document=vscode.window.activeTextEditor?.document
        if(document)
        {
            if (this._config.savefirst && vscode.window.activeTextEditor?.document.isDirty) {
            document.save().then(()=>{if(document) this.asmit(command,document)})  
            }
            else this.asmit(command,document)
        }
    }
    
    private asmit(command:string,doc:vscode.TextDocument){
        switch (command){
            case 'opendosbox':this.Openemu(doc);break
            case 'run':this.Run(doc);break
            case 'debug':this.Debug(doc);break
            case 'here':this.dosbox.BoxOpenCurrentFolder(this._config,doc)
        }  
    }
}