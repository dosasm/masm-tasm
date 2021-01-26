import { TextDocument, DiagnosticCollection, Diagnostic, DiagnosticSeverity } from "vscode";
import { ASMdiagnostic } from './diagnose';
export function masmDiagnose(MASMmsg: string, doc: TextDocument, collection: DiagnosticCollection) {
    let diagnostics: Diagnostic[] = [];
    let count_error: number = 0, count_warn: number = 0;
    const severity = (str: string): DiagnosticSeverity | undefined => {
        switch (str) {
            case 'error':
            case 'fatal error':
                count_error++;
                return DiagnosticSeverity.Error;
            case 'warning':
                count_warn++;
                return DiagnosticSeverity.Warning;
        }
    };
    //.ASM(1): fatal error A1000: cannot open file : mac.inc
    const masm = new RegExp(/(?=\n)T.ASM\((\d+)\):(.*)(?=\nT.ASM)/, 's');
    const masm0 = /\((\d+)\): (error|warning|fatal error)\s+([A-Z]\d+):\s+(.*)/;
    //const masml = /\s*T.ASM\((\d+)\): Out of memory/g;
    let allmsg = MASMmsg.split('\nT.ASM');
    allmsg.forEach(
        (value, index, array) => {
            let RegExec = masm0.exec(value);
            let diag: ASMdiagnostic = new ASMdiagnostic();
            if (RegExec) {
                diag.line = parseInt(RegExec[1]);
                diag.severity = severity(RegExec[2]);
                diag.code = RegExec[3];
                diag.message = RegExec[4];
            }
            RegExec = /(\w*)\((\d+)\): Macro Called From/.exec(value);
            if (RegExec) {
                diag.macro.uri = doc.uri;
                diag.macro.name = RegExec[1];
                diag.macro.line = parseInt(RegExec[2]);
            }
            let diagnostic: Diagnostic | undefined = diag.toVscDiagnostic(doc);
            if (diagnostic) {
                diagnostic.source = "MASM6.11";
                diagnostics.push(diagnostic);
            }
        }
    );
    collection.set(doc.uri, diagnostics);
    return {
        error: count_error,
        warn: count_warn,
        diagnotics: diagnostics
    };
}