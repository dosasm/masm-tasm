/** 
 * Process the message from Assembler
 * 
 * @file diagnose/main.ts
 */
import { Diagnostic, DiagnosticCollection, DiagnosticRelatedInformation, DiagnosticSeverity, languages, Location, TextDocument, Uri } from 'vscode';
import * as vscode from 'vscode';
import { extConf } from '../utils/configuration';
import { masmDiagnose } from './diagnoseMASM';
import { getInternetlink } from './diagnoseMasm-error-list';
import { tasmDiagnose } from './diagnoseTASM';
import { SeeinCPPDOCS } from './codeAction';

export enum Assembler {
    MASM = "MASM",
    TASM = "TASM"
}

export function activate(context: vscode.ExtensionContext) {
    if (extConf.asmType.includes("MASM")) {
        const disposable: vscode.Disposable = vscode.languages.registerCodeActionsProvider('assembly', new SeeinCPPDOCS(), {
            providedCodeActionKinds: SeeinCPPDOCS.providedCodeActionKinds
        });
        context.subscriptions.push(disposable);
    }

    const diag = new AssemblerMessageDiagnose();
    const disposable = vscode.commands.registerCommand('masm-tasm.cleanalldiagnose', () => diag.clean());
    context.subscriptions.push(disposable);

    return diag;
}

/**
 * the class used to diagnose the information from the MASM or TASM assembler
 * 
 * - use `process` method to process the message
 * - use `clean` to clear all diagnostic information produced by this class
 */
export class AssemblerMessageDiagnose {
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
    public process(AsmMsg: string, doc: TextDocument, ASM: string): DIAGINFO | undefined {
        let diag: DIAGINFO | undefined;
        if (ASM.includes("MASM")) {
            diag = masmDiagnose(AsmMsg, doc, this._masmCollection);
        }
        else if (ASM.includes("TASM")) {
            diag = tasmDiagnose(AsmMsg, doc, this._tasmCollection);
        }
        if (diag) {
            return diag;
        }
        return undefined;
    }
    /**
     * clean the diagnoses
     * @param ASM sepecify which ASM diagnositics to clear, if undefined, clear both MASM and TASM diagnositcs
     */
    public clean(ASM?: Assembler): void {
        if (ASM === undefined || ASM === Assembler.MASM) {
            this._masmCollection.clear();
        }
        if (ASM === undefined || ASM === Assembler.TASM) {
            this._tasmCollection.clear();
        }
    }
}

/**the information of diagnostics */
export interface DIAGINFO {
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
            }
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
