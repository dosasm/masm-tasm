import { Diagnostic, DiagnosticCollection, DiagnosticRelatedInformation, DiagnosticSeverity, languages, Location, TextDocument, Uri } from 'vscode';
import { ASMTYPE } from '../configration';
import { masmDiagnose } from './diagnoseMASM';
import { getInternetlink } from './diagnoseMasm-error-list';
import { tasmDiagnose } from './diagnoseTASM';

export enum DIAGCODE {
    /**null*/
    null = -1,
    /**no error and warning information */
    ok,
    /**has error information */
    hasError,
    /**has no error but has warning information */
    hasWarn,
    /**TODO: not a text of assembler's output */
    notMSG
}

/**
 * the class use to diagnose the information from the MASM or TASM assembler
 */
export class AssemblerDiag {
    private _masmCollection: DiagnosticCollection;
    private _tasmCollection: DiagnosticCollection;
    constructor() {
        this._masmCollection = languages.createDiagnosticCollection("MASM");
        this._tasmCollection = languages.createDiagnosticCollection("TASM");
    }
    /**
     * process the output of the assembler of MASM or TASM
     * Note: currently only support assembly in a single file
     * @returns 0 represet hasError，1 represents hasWarn，2 represents no Warn or Error message collected
     * @param AsmMsg the output of the assembler
     * @param doc the document of source code
     * @param ASM MASM or TASM
     */
    public ErrMsgProcess(AsmMsg: string, doc: TextDocument, ASM: ASMTYPE): DIAGINFO | undefined {
        let diag: DIAGINFO | undefined;
        switch (ASM) {
            case ASMTYPE.TASM:
                diag = tasmDiagnose(AsmMsg, doc, this._tasmCollection);
                break;
            case ASMTYPE.MASM:
                diag = masmDiagnose(AsmMsg, doc, this._masmCollection);
                break;
            default:
                return undefined;
        }
        if (diag) {
            diag.code = DIAGCODE.ok;
            if (diag.error !== 0) {
                diag.code = DIAGCODE.hasError;
            }
            else if (diag.warn !== 0) {
                diag.code = DIAGCODE.hasWarn;
            }
            return diag;
        }
        return undefined;
    }
    /**
     * clean the diagnoses
     * @param ASM sepecify which ASM diagnositics to clear, if undefined, clear both MASM and TASM diagnositcs
     */
    public cleandiagnose(ASM?: ASMTYPE): void {
        if (ASM === undefined || ASM === ASMTYPE.MASM) {
            this._masmCollection.clear();
        }
        if (ASM === undefined || ASM === ASMTYPE.TASM) {
            this._tasmCollection.clear();
        }
    }
};

/**the information of diagnostics */
export interface DIAGINFO {
    code?: DIAGCODE;
    error: number;
    warn: number;
    diagnostics?: Diagnostic[];
}

/**
 * change the line number in macro to the line number in its doc
 * Note: it seems the line of the definition of macro is 0
 * but for TASM `Local` must be the next line of macro
 * and if it has `local` command, the line of `LOCAL` is 0
 * @param text the content of the source code
 * @param macroLine the line number in the macro
 * @param macroName the name of the macro
 * @param local if true, the Local of the command will be view as 0
 * @returns 0base line number in doc
 */
function lineMacro2DOC(text: string, macroName: string, macroLine: number, local?: boolean): number | undefined {
    const textarr: string[] = text.split("\n");
    const macro = new RegExp(`\\s*${macroName}\\s+(macro|MACRO)`);
    let docMacroLine: number | undefined = undefined;
    textarr.forEach(
        (value, index, array) => {
            if (value.match(macro)) {
                docMacroLine = index;
                if (local && array[index + 1].match(/LOCAL|local/)) {
                    docMacroLine = index + 1;
                }
            };
        }
    );
    if (docMacroLine) {
        return docMacroLine + macroLine;
    }
    else {
        console.error("can't get the MACRO information");
    }
}

export class ASMdiagnostic {
    line?: number;
    message?: string;
    severity?: DiagnosticSeverity;
    source?: string;
    macro: {
        name?: string;
        uri?: Uri;
        line?: number;//1-base
        local?: boolean;
    };
    code?: string;
    constructor() {
        this.macro = {};
    }
    toVscDiagnostic(doc: TextDocument): Diagnostic | undefined {
        let diag: Diagnostic | undefined = undefined;
        if (this.line && this.message) {
            diag = new Diagnostic(
                doc.lineAt(this.line - 1).range,
                this.message,
                this.severity
            );
            if (this.code) {
                const link: string | undefined = getInternetlink(this.code);
                if (link) {
                    diag.code = {
                        value: this.code,
                        target: Uri.parse(link)
                    };
                }
            }
            if (this.macro.line && this.macro.name && this.macro.uri) {
                let macroLocation: Location;
                const line = lineMacro2DOC(doc.getText(), this.macro.name, this.macro.line, this.macro.local);
                if (line) {
                    if (this.macro.uri === doc.uri) {
                        macroLocation = new Location(doc.uri, doc.lineAt(line).range);
                    }
                    else {
                        //TODO: if the macro is not in the current file
                        throw (line);
                    }
                    diag.relatedInformation = [new DiagnosticRelatedInformation(
                        macroLocation,
                        this.message
                    )];
                }
            }
        }
        return diag;
    }
    check(): boolean {
        if (this.line && this.message && this.severity) {
            return true;
        }
        return false;
    }
}
