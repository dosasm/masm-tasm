import { languages,Diagnostic,window,Range,Position,DiagnosticCollection } from 'vscode'
export class landiagnose{
    private masmCollection:DiagnosticCollection
    private tasmCollection:DiagnosticCollection
    constructor(){
        this.masmCollection=languages.createDiagnosticCollection("MASM")
        this.tasmCollection=languages.createDiagnosticCollection("TASM")
    }
//TODO:目前代码比较得简单粗暴，希望能过获取行字符位置，这样比较美观
    /**
     * 错误匹配diagnose problemmatch，返回0无错误，返回1有警告信息，返回2有错误
     * @param msg 输出信息
     * @param type masm还是tasm
     */
    public ErrMsgProcess(info:string,filename?:string,ASM?:string):number{
        let fileuri=window.activeTextEditor?.document.uri
        let flag =0;
        let firstreg:RegExp=/(Fail|Succeed)! ASMfilefrom \s*.*\s* with (TASM|MASM)\r\n/
        let r=firstreg.exec(info)
        let counterror=0
        let countwarning=0

        if (r == null){
            console.error('脚本输出中无法获得汇编工具信息')}
        else{
            let MASMorTASM=r.pop()
            if(MASMorTASM=='TASM'){
                let tasm=/\s*\*+(Error|Warning)\*+\s+(.*)\((\d+)\)\s+(.*)/g
                let diagnostics: Diagnostic[] = [];
                var oneinfo=tasm.exec(info)
                while(oneinfo != null && oneinfo.length==5)
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
                        ran=new Range(new Position(line-1, 0),new Position(line-1, 10))
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
                    oneinfo=tasm.exec(info)
                }
                if (fileuri){
                    this.tasmCollection.clear()
                    this.tasmCollection.set(fileuri,diagnostics)
                }
            }
            else if(MASMorTASM=='MASM'){
                var masm=/\s*(.*)\((\d+)\):\s+(error|warning)\s+([A-Z]\d+:\s+.*)/g
                let diagnostics: Diagnostic[] = [];
                var oneinfo=masm.exec(info)
                while(oneinfo != null && oneinfo.length==5)
                { 
                    let severity:number=0
                    let msg:string=' '
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
                        ran=new Range(new Position(line-1, 2),new Position(line-1, 12))
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
                    oneinfo=masm.exec(info)
                }
                if (fileuri){
                    this.masmCollection.set(fileuri,diagnostics)
                }
            }
        }
        console.log(info)
        return flag
    }
}
