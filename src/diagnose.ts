import { languages,Diagnostic,FileSystem,workspace,Range,Position,DiagnosticCollection, Uri } from 'vscode'
export class landiagnose{
    private masmCollection:DiagnosticCollection
    private tasmCollection:DiagnosticCollection
    private diagnostics: Diagnostic[]
    private tasmmacro:string[]
    private masmerror:number=0
    private tasmerror:number=0
    private masmwarn:number=0
    private tasmwarn:number=0
    constructor(){
        this.tasmmacro=new Array()
        this.masmCollection=languages.createDiagnosticCollection("MASM")
        this.tasmCollection=languages.createDiagnosticCollection("TASM")
        this.diagnostics = []
    }

    /**
     * 根据行数生成range信息，vscode中的位置信息为0base
     * @param str 错误信息所在的文本
     * @param line_get 错误信息所在的行数（1base）
     */
    private rangeProvider(str:string,line_get:string|number):Range {
        let line:number
        if (typeof(line_get)=='number') line=line_get
        else line=parseInt(line_get)
        let ran=new Range(new Position(line-1, 0),new Position(line-1, 10))
        let startindex=0
        let endindex=0
        let strarr=str.split("\n")
        let myline=strarr[line-1]
        startindex=myline.search(/\w/)
        endindex=myline.search(";")
        if (endindex==-1) endindex=myline.length
        ran=new Range(new Position(line-1, startindex),new Position(line-1, endindex))
        return ran
    }
    private TasmMacroDiag(msg:string,text:string):string{
        let str:string=msg
        let tasmmacro=/(\w*)\((\d+)\)\s+(.+)/
        let r=tasmmacro.exec(msg)
        if (r!=null && r.length==4){
            let msg=r.pop()
            let line_str=r.pop()
            let name=r.pop()
            if(name && line_str && msg){
                if (this.tasmmacro.indexOf(name)==-1){
                    this.tasmmacro.push(name)
                    let realline:number|undefined
                    let line=parseInt(line_str)
                    let textarr=text.split("\n")
                    let macro=/\s*(\w+)\s+(MACRO|macro)/
                    let local=/local|LOCAL/
                    let i:number
                    for(i=0;i<textarr.length;i++){
                        let myline=textarr[i]
                        let macroreg=macro.exec(myline)
                        if (macroreg!=null && macroreg[1]==name){
                            if (local.exec(textarr[i+1])!=null){
                                realline=i+2
                            }
                            else{
                                realline=i+1
                            }
                            break    
                        }
                    }
                    if(realline){
                        line=line+realline
                        let diagnostic: Diagnostic
                        diagnostic= {
                            severity:0,
                            range:this.rangeProvider(text,line),
                            message: msg,
                            source: 'masm-tasm:TASM'
                    }
                    this.diagnostics.push(diagnostic)
                }
                }
            } 
        }
        return str
    }
//TODO:目前代码比较得简单粗暴
    /**
     * 错误匹配diagnose problemmatch，返回0无错误，返回1有警告信息，返回2有错误
     * @param msg 输出信息
     * @param type masm还是tasm
     */
    public ErrMsgProcess(text:string,info:string,fileuri:Uri):number{
        let flag =0;
        let firstreg:RegExp=/(Fail|Succeed)! ASMfilefrom \s*.*\s* with (TASM|MASM)\r\n/
        let r=firstreg.exec(info)
        console.log(text)
        this.tasmmacro=[]
        if (r == null){
            console.error('脚本输出中无法获得汇编工具信息')}
        else{
            let MASMorTASM=r.pop()
            if(MASMorTASM=='TASM'){
                this.diagnostics = [];
                let tasm=/\s*\*+(Error|Warning)\*+\s+(T.ASM)\((\d+)\)\s+(.*)/g
                var oneinfo=tasm.exec(info)
                this.tasmerror=0
                this.tasmwarn=0
                while(oneinfo !== null && oneinfo.length==5)
                { 
                    let severity:number=0
                    let msg:string=' '
                    oneinfo.shift()//弹出全部内容
                    switch(oneinfo.shift())
                    {
                        case 'Error':
                            severity=0
                            this.tasmerror++
                            break;
                        case 'Warning':
                            severity=1
                            this.tasmwarn++
                            break;
                    }
                    oneinfo.shift();//弹出文件内容
                    let line_get=oneinfo.shift()
                    let msg_get=oneinfo.shift()
                    if(msg_get) msg=msg_get
                    let diagnostic: Diagnostic
                    if(line_get) {
                        diagnostic= {
                        severity:severity,
                        range:this.rangeProvider(text,line_get),
                        message: this.TasmMacroDiag(msg,text),
                        source: 'TASM'
                        }
                        this.diagnostics.push(diagnostic)
                    };
                    oneinfo=tasm.exec(info)
                }
                if (text){
                    this.tasmCollection.set(fileuri,this.diagnostics)
                }
            }
            else if(MASMorTASM=='MASM'){
                this.diagnostics = [];
                this.masmerror=0
                this.masmwarn=0
                let masm=/\s*T.ASM\((\d+)\): (error|warning)\s+([A-Z]\d+):\s+(.*)/g
                let masml=/\s*T.ASM\((\d+)\): Out of memory/g
                let oneinfo=masml.exec(info)
                while(oneinfo != null && oneinfo.length==2){
                    let diagnostic: Diagnostic
                    let line=oneinfo.pop()
                    if(line){
                    diagnostic= {
                        severity:0,
                        message: "Out of memory",
                        range:this.rangeProvider(text,line)
                    }
                    this.masmerror++
                    this.diagnostics.push(diagnostic)
                    oneinfo=masml.exec(info)
                }   
                }
                oneinfo=masm.exec(info)
                while(oneinfo != null && oneinfo.length==5)
                {
                    let severity:number=0
                    let msg:string=' '
                    oneinfo.shift()//弹出全部内容
                    let line_get=oneinfo.shift()
                    switch(oneinfo.shift())
                    {
                        case 'Error':
                            severity=0
                            this.masmerror++
                            break
                        case 'Warning':severity=1
                            this.masmwarn++
                            break
                    }
                    let tag=oneinfo.shift()
                    let msg_get=oneinfo.shift()
                    if(msg_get) msg=msg_get
                    let diagnostic: Diagnostic
                    if(line_get ) {
                        diagnostic= {
                            severity:severity,
                            range:this.rangeProvider(text,line_get),
                            message: msg,
                            source: 'MASM',
                        }
                        this.diagnostics.push(diagnostic)
                    };
                    oneinfo=masm.exec(info)
                }
                if (text){
                    this.masmCollection.set(fileuri,this.diagnostics)
                }
            }
        }
        return flag
    }
    public cleandiagnose(MASMorTASMorboth:string){
        switch(MASMorTASMorboth){
            case 'both':
            case 'MASM':
                this.masmCollection.clear()
                if (MASMorTASMorboth=='MASM') break
            case 'TASM':
                this.tasmCollection.clear()
        }
    }
}
