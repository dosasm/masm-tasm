import { languages,Diagnostic,FileSystem,workspace,Range,Position,DiagnosticCollection, Uri } from 'vscode'
export class landiagnose{
    private masmCollection:DiagnosticCollection
    private tasmCollection:DiagnosticCollection
    private masmerror:number=0
    private tasmerror:number=0
    private masmwarn:number=0
    private tasmwarn:number=0
    constructor(){
        this.masmCollection=languages.createDiagnosticCollection("MASM")
        this.tasmCollection=languages.createDiagnosticCollection("TASM")
    }
    private rangeProvider(str:string,line_str:string):Range {
        let line=parseInt(line_str)
        let ran=new Range(new Position(line-1, 0),new Position(line-1, 10))
        let i:number=0
        let startindex=0
        let endindex=0
        let counteof:number=0
                var strarr=str.split("\n")
                var myline=strarr[line-1]
                startindex=myline.search(/\w/)
                endindex=myline.search(";")
                if (endindex==-1) endindex=myline.length
                ran=new Range(new Position(line-1, startindex),new Position(line-1, endindex))
                return ran
    }
//TODO:目前代码比较得简单粗暴，希望能过获取行字符位置，这样比较美观
    /**
     * 错误匹配diagnose problemmatch，返回0无错误，返回1有警告信息，返回2有错误
     * @param msg 输出信息
     * @param type masm还是tasm
     */
    public ErrMsgProcess(text:string,info:string,fileuri:Uri,filename?:string,ASM?:string):number{
        let flag =0;
        let firstreg:RegExp=/(Fail|Succeed)! ASMfilefrom \s*.*\s* with (TASM|MASM)\r\n/
        let r=firstreg.exec(info)
        console.log(text)
        if (r == null){
            console.error('脚本输出中无法获得汇编工具信息')}
        else{
            let MASMorTASM=r.pop()
            if(MASMorTASM=='TASM'){
                let tasm=/\s*\*+(Error|Warning)\*+\s+(T.ASM)\((\d+)\)\s+(.*)/g
                let diagnostics: Diagnostic[] = []
                var oneinfo=tasm.exec(info)
                this.tasmerror=0
                this.tasmwarn=0
                while(oneinfo !== null && oneinfo.length==5)
                { 
                    let severity:number=0
                    let msg:string=' '
                    let line:number
                    let ran
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
                        message: msg,
                        source: 'masm-tasm:TASM'
                        }
                        diagnostics.push(diagnostic)
                    };
                    oneinfo=tasm.exec(info)
                }
                if (text){
                    this.tasmCollection.set(fileuri,diagnostics)
                }
            }
            else if(MASMorTASM=='MASM'){
                let diagnostics: Diagnostic[] = [];
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
                    diagnostics.push(diagnostic)
                    oneinfo=masml.exec(info)
                }   
                }
                oneinfo=masm.exec(info)
                while(oneinfo != null && oneinfo.length==5)
                {
                    let severity:number=0
                    let msg:string=' '
                    let line:number
                    let ran
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
                    let src=oneinfo.shift()
                    let msg_get=oneinfo.shift()
                    if(msg_get) msg=msg_get
                    let diagnostic: Diagnostic
                    if(line_get) {
                        diagnostic= {
                        severity:severity,
                        range:this.rangeProvider(text,line_get),
                        message: msg,
                        source: src
                        }
                        diagnostics.push(diagnostic)
                    };
                    oneinfo=masm.exec(info)
                }
                if (text){
                    this.masmCollection.set(fileuri,diagnostics)
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
