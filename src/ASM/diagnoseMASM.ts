import { TextDocument, DiagnosticCollection, Diagnostic, DiagnosticSeverity } from "vscode";
import { ASMdiagnostic } from './diagnose';
export function masmDiagnose(MASMmsg: string, doc: TextDocument, collection: DiagnosticCollection) {
    let diagnostics: Diagnostic[] = [];
    let count_error: number = 0, count_warn: number = 0;
    const masm = /\s*T.ASM\((\d+)\): (error|warning)\s+([A-Z]\d+):\s+(.*)/g;
    const masml = /\s*T.ASM\((\d+)\): Out of memory/g;
    const severity = (str: string): DiagnosticSeverity | undefined => {
        switch (str) {
            case 'error':
                count_error++;
                return DiagnosticSeverity.Error;
            case 'warning':
                count_warn++;
                return DiagnosticSeverity.Warning;
        }
    }
    let diag: ASMdiagnostic = new ASMdiagnostic();
    let oneinfo = masml.exec(MASMmsg);
    while (oneinfo !== null && oneinfo.length === 2) {
        let diagnostic: Diagnostic;
        let line = oneinfo.pop();
        if (line) {
            diagnostic = {
                severity: 0,
                message: "Out of memory",
                range: rangeProvider(text, line)
            };
            count_error++;
            diagnostics.push(diagnostic);
            oneinfo = masml.exec(MASMmsg);
        }
    }
    oneinfo = masm.exec(MASMmsg);
    while (oneinfo !== null && oneinfo.length === 5) {
        let severity: number = 3;
        let msg: string = ' ';
        oneinfo.shift();//弹出全部内容
        let line_get = oneinfo.shift();
        switch (oneinfo.shift()) {
            case 'error':
                severity = 0;
                count_error++;
                break;
            case 'warning': severity = 1;
                count_warn++;
                break;
        }
        let msgcode_get = oneinfo.shift();
        let msg_get = oneinfo.shift();
        if (msgcode_get && msg_get) { msg = msgcode_get + ' ' + msg_get; }
        let diagnostic: Diagnostic;
        if (line_get) {
            diagnostic = {
                severity: severity,
                range: rangeProvider(text, line_get),
                message: msg,
                source: 'MASM',
            };
            diagnostics.push(diagnostic);
        };
        oneinfo = masm.exec(MASMmsg);
    }
    let flag: number = 2;
    if (count_error !== 0) { flag = 0; }
    else if (count_warn !== 0) { flag = 1; }
    return {
        flag: flag,
        error: count_error,
        warn: count_warn,
        diagnotics: diagnostics
    };
}