import { languages,Diagnostic,FileSystem,workspace,Range,Position,DiagnosticCollection, Uri, DiagnosticRelatedInformation } from 'vscode'
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
    /**
     * 
     * @param uri 文件的uri定位符
     * @param text 文件的文本内容string
     * @param macroname 需要寻找的宏名
     * @param line_str 宏中错误的相对（宏）位置
     * @param msg 错误信息
     */
    private TasmMacroRelated(uri:Uri,text:string,macroname:string,line_str:string,msg:string):DiagnosticRelatedInformation{
        let related:DiagnosticRelatedInformation
        let realline:number=-1
        let line=parseInt(line_str)
        let textarr=text.split("\n")
        let macro=/\s*(\w+)\s+(MACRO|macro)/
        let local=/local|LOCAL/
        let i:number
        for(i=0;i<textarr.length;i++){
            let myline=textarr[i]
            let macroreg=macro.exec(myline)
            if (macroreg!=null && macroreg[1]==macroname){
                if (local.exec(textarr[i+1])!=null){
                    realline=i+2
                }
                else{
                    realline=i+1
                }
                break    
            }
        }
        if(realline==-1){
            console.error("找不到对应的宏名");
        }
        line=line+realline  
        related={
            location:{
                range:this.rangeProvider(text,line),
                uri: uri
            },
            message:msg
        }
        return related
    }
private tasmdiagpush(severity:number,line:number,msg:string,text:string,related?:DiagnosticRelatedInformation){
    let diagnostic:Diagnostic
    let relatedinfo:DiagnosticRelatedInformation[]=[]
        if(related) relatedinfo.push(related)
        diagnostic= {
            severity:severity,
            range:this.rangeProvider(text,line),
            message: msg,
            source: 'TASM',
            relatedInformation:relatedinfo
        }
        diagnostic.relatedInformation
        this.diagnostics.push(diagnostic)
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
                let tasm=/\s*\*+(Error|Warning)\*+\s+(T.ASM)\((\d+)\)\s+(.*)/
                let tasm2=/\s*\*+(Error|Warning)\*+\s+(T.ASM)\((\d+)\) (.*)\((\d+)\)\s+(.*)/
                let allmsg=info.split('\n')
                let i=0
                this.tasmerror=0
                this.tasmwarn=0
                for (i=1;i<allmsg.length;i++)
                {
                    let oneinfo=tasm2.exec(allmsg[i])
                    if(oneinfo !== null ){
                        let severity:number=0
                        oneinfo.shift()//弹出全部信息
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
                        oneinfo.shift()//弹出文件名
                        let line_get=oneinfo.shift()//错误所在行
                        let macroname=oneinfo.shift()//宏名
                        let macroline=oneinfo.shift()//错误所在宏的位置
                        let msg=oneinfo.shift()//错误名称
                        if( line_get && macroname && macroline && msg )
                        {
                            let related=this.TasmMacroRelated(fileuri,text,macroname,macroline,msg)
                            let line=parseInt(line_get)
                            this.tasmdiagpush(severity,line,msg,text,related)
                            delete allmsg[i]
                        }
                    }
                    oneinfo=tasm.exec(allmsg[i])
                    if(oneinfo !== null && oneinfo.length==5)
                    { 
                        let severity:number=0
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
                        let msg=oneinfo.shift()
                        if(line_get && msg) {
                            let line=parseInt(line_get)
                            this.tasmdiagpush(severity,line,msg,text)
                        }
                    }
                }
                 this.tasmCollection.set(fileuri,this.diagnostics)
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
                    let msgcode_get=oneinfo.shift()
                    let msg_get=oneinfo.shift()
                    if(msgcode_get && msg_get) msg=msgcode_get+' '+msg_get
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
