import * as vscode from 'vscode'
import {Config} from './configration'
import {exec} from 'child_process'
import { Diagnostic } from 'vscode';
export class runcode{
    private readonly _masmChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal|null
    private _config:Config|null
    private extpath:string
    private count:number=1
    private masmCollection=vscode.languages.createDiagnosticCollection("MASM")
    private tasmCollection=vscode.languages.createDiagnosticCollection("TASM")
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

     //TODO:目前代码比较得简单粗暴，希望能过获取行字符位置，这样比较美观
    /**
     * 错误匹配diagnose problemmatch，返回0无错误，返回1有警告信息，返回2有错误
     * @param msg 输出信息
     * @param type masm还是tasm
     */
    private ErrMsgProcess(msg:string,filename?:string,ASM?:string):number{
        let fileuri=vscode.window.activeTextEditor?.document.uri
        let flag =0;
        let firstreg:RegExp=/(Fail|Succeed)! ASMfilefrom \s*.*\s* with (TASM|MASM)\r\n/
        let r=firstreg.exec(msg)
        let counterror=0
        let countwarning=0

        if (r == null){
            console.error('脚本输出中无法获得汇编工具信息')}
        else{
            let MASMorTASM=r.pop()
            if(MASMorTASM=='TASM'){
                let tasm=/\s*\*+(Error|Warning)\*+\s+(.*)\((\d+)\)\s+(.*)/g
                let diagnostics: Diagnostic[] = [];
                var oneinfo=tasm.exec(msg)
                while(oneinfo != null && oneinfo.length==5)
                { 
                    let severity:number=0
                    let message:string
                    let line:number
                    let ran
                    oneinfo.shift()//弹出全部内容
                    switch(oneinfo.shift())
                    {
                        case 'Error':
                            severity=0
                            counterror++
                            break;
                        case 'Warning':
                            severity=1
                            countwarning++
                            break;
                    }
                    oneinfo.shift();//弹出文件内容
                    let line_get=oneinfo.shift()
                    let msg_get=oneinfo.shift()
                    if(line_get) {
                        line=parseInt(line_get)
                        ran=new vscode.Range(new vscode.Position(line-1, 0),new vscode.Position(line-1, 10))
                    }
                    if(msg_get) msg=msg_get
                    let diagnostic: Diagnostic
                    if(ran) {
                        diagnostic= {
                        severity:severity,
                        range:ran,
                        message: msg,
                        source: 'masm-tasm:TASM'
                        }
                        diagnostics.push(diagnostic)
                    };
                    oneinfo=tasm.exec(msg)
                }
                if (fileuri){
                    this.tasmCollection.clear()
                    this.tasmCollection.set(fileuri,diagnostics)
                }
            }
            else if(MASMorTASM=='MASM'){
                var masm=/\s*(.*)\((\d+)\):\s+(error|warning)\s+([A-Z]\d+:\s+.*)/g
                let diagnostics: Diagnostic[] = [];
                var oneinfo=masm.exec(msg)
                while(oneinfo != null && oneinfo.length==5)
                { 
                    let severity:number=0
                    let message:string
                    let line:number
                    let ran
                    oneinfo.shift()//弹出全部内容
                    oneinfo.shift();//弹出文件内容
                    let line_get=oneinfo.shift()
                    switch(oneinfo.shift())
                    {
                        case 'Error':
                            severity=0
                            counterror++
                            break
                        case 'Warning':severity=1
                            countwarning++
                            break
                    }
                    let msg_get=oneinfo.shift()
                    if(line_get) {
                        line=parseInt(line_get)
                        ran=new vscode.Range(new vscode.Position(line-1, 2),new vscode.Position(line-1, 12))
                    }
                    if(msg_get) msg=msg_get
                    let diagnostic: Diagnostic
                    if(ran) {
                        diagnostic= {
                        severity:severity,
                        range:ran,
                        message: msg,
                        source: 'masm-tasm:MASM'
                        }
                        diagnostics.push(diagnostic)
                    };
                    oneinfo=masm.exec(msg)
                }
                if (fileuri){
                    this.masmCollection.set(fileuri,diagnostics)
                }
            }
        }
        console.log(msg)
        return flag
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
        const filename = vscode.window.activeTextEditor?.document.fileName;
        let outmsg:string
        exec(this.extpath+'\\tools\\asmo.bat "'+conf.path+'" '+conf.MASMorTASM+' '+mode+' "'+filename+'"',{cwd:conf.path,shell:'cmd.exe'},
        (error, stdout, stderr) => {
            if (error) {
                this._masmChannel.append(stderr)
              console.error(`执行的错误: ${error}`);
              return;
            }
            this.ErrMsgProcess(stdout,filename,conf.MASMorTASM)
            outmsg=stdout;
            let failinfo=stdout.substring(0,4)
            if (failinfo=='Fail'){
                let Errmsgwindow=conf.MASMorTASM+'汇编出错,无法运行/调试，请到输出-->masm-tasm中查看相关信息'
                vscode.window.showInformationMessage(Errmsgwindow);
                this._masmChannel.show
                this._masmChannel.append(stdout)
            }
            else {
                if(failinfo=='warn'){
                    let warningmsgwindow=conf.MASMorTASM+'成功汇编链接，但是汇编时产生了警告信息(warning)，可能无法运行/调试'
                    vscode.window.showInformationMessage(warningmsgwindow);
                }
                this._masmChannel.append(stdout)
                if(viaplayer){
                    this.outTerminal(runordebug,conf)
                }
                else {if (runordebug){
                    this.openDOSBox('T.exe\n'+conf.BOXrun)}
                else{
                    this.openDOSBox(conf.DEBUG)}
                } 
                }
             //console.log(`stdout: ${stdout}`);
             
            // console.error(`stderr: ${stderr}`);
          }) 
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
                this.openDOSBox(text,false)
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
            this.openDOSBox(text,false)
        }   
    }
}