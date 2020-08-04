import { languages,Diagnostic,Range,Position,DiagnosticCollection, Uri, DiagnosticRelatedInformation, OutputChannel } from 'vscode'
export class landiagnose{
    private masmCollection:DiagnosticCollection
    private tasmCollection:DiagnosticCollection
    private diagnostics: Diagnostic[]
    private asmerror:number=0
    private asmwarn:number=0
    private _OutChannel:OutputChannel
    constructor(Channel:OutputChannel){
        this._OutChannel=Channel
        this.masmCollection=languages.createDiagnosticCollection("MASM")
        this.tasmCollection=languages.createDiagnosticCollection("TASM")
        this.diagnostics = []
    }
    /**
     * 错误匹配diagnose problemmatch，返回0无错误，返回1有警告信息，返回2有错误
     * 返回一个数字 0表示有错误，1表示无错误有警告，2表示无错误无警告
     * @param text 源代码文件的文本内容
     * @param info 输出的错误信息
     * @param fileuri 源代码文件的位置uri定位
     */
    public ErrMsgProcess(text:string,info:string,fileuri:Uri,ASM?:string):number{
        let firstreg:RegExp=/(Fail|Succeed)! ASMfilefrom \s*.*\s* with (TASM|MASM)\r\n/
        let flag =2
        this.asmerror=0
        this.asmwarn=0
        //console.log(text,info)
        let MASMorTASM:string|undefined
        if (ASM) MASMorTASM=ASM
        else{
            let r=firstreg.exec(info)
            if (r == null){
                console.error('输出中无法获得汇编工具信息')}
            else{
                MASMorTASM=r.pop()
            }
        }
        if(MASMorTASM=='TASM') flag=this.tasmdiagnose(text,info,fileuri,ASM)
        else if(MASMorTASM=='MASM') flag=this.masmdiagnose(text,info,fileuri,ASM)
        this._OutChannel.appendLine('收集到'+this.asmerror.toString()+'条错误，'+this.asmwarn+'条警告信息');
        //this.channaloutput(info)
        console.log(info)
        return flag
    }
    /**
     * 将输出的错误信息，以一种比较美观的方式打印到输出面板上
     * @param info 错误信息
     */
    private channaloutput(info:string){
        this._OutChannel.append(info.replace('\r\n\r\n','\r\n'))
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
        if(myline){
            startindex=myline.search(/\w/)
            endindex=myline.search(";")
            if (endindex==-1) endindex=myline.length
            ran=new Range(new Position(line-1, startindex),new Position(line-1, endindex))
        }
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

    private tasmdiagnose(text:string,info:string,fileuri:Uri,ASM?:string):number{
        this.diagnostics = [];
        let tasm=/\s*\*+(Error|Warning)\*+\s+(T.ASM)\((\d+)\)\s+(.*)/
        let tasm2=/\s*\*+(Error|Warning)\*+\s+(T.ASM)\((\d+)\) (.*)\((\d+)\)\s+(.*)/
        let allmsg=info.split('\n')
        let i=0
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
                        this.asmerror++
                        break;
                    case 'Warning':
                        severity=1
                        this.asmwarn++
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
                        this.asmerror++
                        break;
                    case 'Warning':
                        severity=1
                        this.asmwarn++
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
            if (this.asmerror != 0) return 0
            else if(this.asmwarn != 0) return 1
            else return 2
    }
    
    private masmdiagnose(text:string,info:string,fileuri:Uri,ASM?:string):number
        {
            this.diagnostics = [];
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
                this.asmerror++
                this.diagnostics.push(diagnostic)
                oneinfo=masml.exec(info)
            }   
            }
            oneinfo=masm.exec(info)
            while(oneinfo != null && oneinfo.length==5)
            {
                let severity:number=3
                let msg:string=' '
                oneinfo.shift()//弹出全部内容
                let line_get=oneinfo.shift()
                switch(oneinfo.shift())
                {
                    case 'error':
                        severity=0
                        this.asmerror++
                        break
                    case 'warning':severity=1
                        this.asmwarn++
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
            this.masmCollection.set(fileuri,this.diagnostics)         
            if (this.asmerror != 0) return 0
                else if(this.asmwarn != 0) return 1
                else return 2
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
