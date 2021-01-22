import { Diagnostic, TextDocument, DiagnosticCollection, DiagnosticSeverity } from "vscode";
import { ASMdiagnostic } from './diagnose';
/**
 * Process the output of TASM assembler
 * @param TASMmsg the output of TASM
 * @param doc the doc of the source codes
 * @param collection the  DiagnosticCollection for assign
 */
export function tasmDiagnose(TASMmsg: string, doc: TextDocument, collection: DiagnosticCollection) {
    const diagnostics: Diagnostic[] = [];
    const tasm = /\s*\*+(Error|Warning|Fatal)\*+\s+(.*.ASM)\((\d+)\)\s+(.*)/;
    const tasmMacro = /\s*\*+(Error|Warning|Fatal)\*+\s+(.*.ASM)\((\d+)\) (.*)\((\d+)\)\s+(.*)/;
    const severity = (str: string): DiagnosticSeverity | undefined => {
        switch (str) {
            case 'Error':
            case 'Fatal':
                count_error++;
                return DiagnosticSeverity.Error;
            case 'Warning':
                count_warn++;
                return DiagnosticSeverity.Warning;
        }
    };
    let count_error: number = 0, count_warn: number = 0;
    let allmsg = TASMmsg.split('\n');
    allmsg.forEach(
        (value, index) => {
            let RegExec = tasmMacro.exec(value);
            let diag: ASMdiagnostic = new ASMdiagnostic();
            let VSCdiag: Diagnostic | undefined;
            if (RegExec) {
                diag.severity = severity(RegExec[1]);
                diag.line = parseInt(RegExec[3]);//2错误所在行
                diag.macro.local = true;
                diag.macro.name = RegExec[4];//3宏名
                diag.macro.line = parseInt(RegExec[5]);//4错误所在宏的位置
                diag.macro.uri = doc.uri;
                diag.message = RegExec[6];//5错误名称
                VSCdiag = diag.toVscDiagnostic(doc);
            }
            if (VSCdiag === undefined) {
                RegExec = tasm.exec(value);
                if (RegExec && RegExec.length === 5) {
                    diag.severity = severity(RegExec[1]);
                    diag.line = parseInt(RegExec[3]);
                    diag.message = RegExec[4];
                    VSCdiag = diag.toVscDiagnostic(doc);
                }
            }
            if (VSCdiag) {
                VSCdiag.source = "TASM4.1";
                diagnostics.push(VSCdiag);
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



