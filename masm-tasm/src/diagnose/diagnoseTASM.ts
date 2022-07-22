import { Diagnostic, TextDocument, DiagnosticCollection, DiagnosticSeverity } from "vscode";
import { ASMdiagnostic, DIAGINFO } from './main';
/**
 * Process the output of TASM assembler
 * @param TASMmsg the output of TASM
 * @param doc the doc of the source codes
 * @param collection the  DiagnosticCollection for assign
 */
export function tasmDiagnose(TASMmsg: string, doc: TextDocument, collection: DiagnosticCollection): DIAGINFO {
    const diagnostics: Diagnostic[] = [];
    const tasm = /\s*\*+(Error|Warning|Fatal)\*+\s+(.*)\((\d+)\)\s+(.*)/;
    const tasmMacro = /\s*\*+(Error|Warning|Fatal)\*+\s+(.*)\((\d+)\) (.*)\((\d+)\)\s+(.*)/;
    let error = 0, warn = 0;
    const severity = (str: string): DiagnosticSeverity | undefined => {
        switch (str) {
            case 'Error':
            case 'Fatal':
                error++;
                return DiagnosticSeverity.Error;
            case 'Warning':
                warn++;
                return DiagnosticSeverity.Warning;
        }
    };

    const allmsg = TASMmsg.split('\n');
    allmsg.forEach(
        (value) => {
            let RegExec = tasmMacro.exec(value);
            const diag: ASMdiagnostic = new ASMdiagnostic();
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
    return { error, warn, diagnostics };
}



