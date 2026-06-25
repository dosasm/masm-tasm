/**
 * Completion provider.
 * Provides context-aware completions for instructions, registers, directives,
 * user-defined symbols, and snippets.
 */

import * as vscode from 'vscode';
import { DocumentAnalysis } from '../analysis';
import { workspaceManager } from '../workspace';
import { TokenType } from '../tokens';
import { SymbolKind } from '../symbol';

export class AsmCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        const analysis = DocumentAnalysis.get(document);
        const line = document.lineAt(position);
        const lineText = line.text.substring(0, position.character);

        // Determine context: are we at the start of a line, after an instruction, or in an operand?
        const isFirstToken = /^\s*$/.test(lineText) || /^\s*\.\w*$/.test(lineText);
        const isAfterInstruction = this.isAfterInstruction(lineText);

        const items: vscode.CompletionItem[] = [];

        if (isFirstToken) {
            // Suggest instructions, directives, labels, and macros
            items.push(...this.getInstructionCompletions());
            items.push(...this.getDirectiveCompletions());
            items.push(...this.getSymbolCompletions(document, analysis, [SymbolKind.Label, SymbolKind.Macro, SymbolKind.Procedure]));
        } else if (isAfterInstruction) {
            // Suggest registers, variables, labels, constants, and memory operands
            items.push(...this.getRegisterCompletions());
            items.push(...this.getSymbolCompletions(document, analysis, [SymbolKind.Variable, SymbolKind.Constant, SymbolKind.Label]));
            items.push(...this.getSizeDirectiveCompletions());
        } else {
            // General: suggest everything
            items.push(...this.getSymbolCompletions(document, analysis));
        }

        return items;
    }

    private isAfterInstruction(lineText: string): boolean {
        // Check if there's an instruction mnemonic earlier on the line
        const trimmed = lineText.trimStart();
        // Match: optional-label: INSTRUCTION ...
        const match = trimmed.match(/^(\w+\s*:?\s+)?(\w+)\s+/);
        if (match) {
            const word = match[2].toUpperCase();
            // Quick check: is this a known instruction?
            return ['MOV', 'ADD', 'SUB', 'PUSH', 'POP', 'JMP', 'CALL', 'RET', 'CMP',
                'LEA', 'XCHG', 'INC', 'DEC', 'MUL', 'DIV', 'AND', 'OR', 'XOR', 'NOT',
                'SHL', 'SHR', 'INT', 'NOP', 'LOOP', 'JE', 'JNE', 'JZ', 'JNZ', 'JA',
                'JB', 'JG', 'JL', 'JGE', 'JLE', 'JAE', 'JBE'].includes(word);
        }
        return false;
    }

    private getInstructionCompletions(): vscode.CompletionItem[] {
        const instructions = [
            'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'INC', 'DEC', 'CMP', 'TEST',
            'AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR', 'SAL', 'SAR', 'ROL', 'ROR',
            'PUSH', 'POP', 'PUSHF', 'POPF', 'PUSHA', 'POPA',
            'CALL', 'RET', 'RETF', 'INT', 'IRET',
            'JMP', 'JE', 'JNE', 'JZ', 'JNZ', 'JA', 'JAE', 'JB', 'JBE',
            'JG', 'JGE', 'JL', 'JLE', 'JS', 'JNS', 'JO', 'JNO', 'JP', 'JNP',
            'LOOP', 'LOOPE', 'LOOPNE', 'JCXZ', 'JECXZ',
            'LEA', 'LDS', 'LES', 'LFS', 'LGS', 'LSS',
            'MOVSB', 'MOVSW', 'MOVSD', 'CMPSB', 'CMPSW', 'CMPSD',
            'STOSB', 'STOSW', 'STOSD', 'LODSB', 'LODSW', 'LODSD',
            'SCASB', 'SCASW', 'SCASD',
            'REP', 'REPE', 'REPNE', 'REPZ', 'REPNZ',
            'XCHG', 'NOP', 'HLT', 'WAIT', 'LOCK',
            'IN', 'OUT', 'INSB', 'OUTSB',
            'CLC', 'STC', 'CMC', 'CLD', 'STD', 'CLI', 'STI',
            'CBW', 'CWD', 'CDQ', 'CWDE',
            'DAA', 'DAS', 'AAA', 'AAS', 'AAM', 'AAD',
            'INTO', 'BOUND', 'ENTER', 'LEAVE',
            'NEG', 'ADC', 'SBB', 'IMUL', 'IDIV',
        ];

        return instructions.map(inst => {
            const item = new vscode.CompletionItem(inst, vscode.CompletionItemKind.Keyword);
            item.detail = 'Instruction';
            return item;
        });
    }

    private getDirectiveCompletions(): vscode.CompletionItem[] {
        const directives = [
            '.CODE', '.DATA', '.DATA?', '.CONST', '.STACK', '.MODEL', '.EXIT', '.STARTUP',
            'SEGMENT', 'ENDS', 'PROC', 'ENDP', 'MACRO', 'ENDM',
            'DB', 'DW', 'DD', 'DQ', 'DF', 'DT',
            'EQU', 'TEXTEQU',
            'ASSUME', 'END', 'INCLUDE', 'INCLUDELIB',
            'PUBLIC', 'EXTERN', 'EXTERNDEF',
            'IF', 'ELSE', 'ENDIF', 'IFDEF', 'IFNDEF',
            '.IF', '.ELSE', '.ENDIF', '.WHILE', '.ENDW', '.REPEAT', '.UNTIL',
            'REPEAT', 'WHILE', 'FOR', 'FORC',
            'ORG', 'ALIGN', 'EVEN', 'LABEL',
            'INVOKE', 'PROTO',
            'STRUCT', 'UNION', 'RECORD', 'TYPEDEF',
            '.386', '.386P', '.486', '.486P', '.586', '.586P',
            'COMMENT', 'ECHO', 'OPTION',
        ];

        return directives.map(dir => {
            const item = new vscode.CompletionItem(dir, vscode.CompletionItemKind.Keyword);
            item.detail = 'Directive';
            return item;
        });
    }

    private getRegisterCompletions(): vscode.CompletionItem[] {
        const registers = [
            'AL', 'AH', 'BL', 'BH', 'CL', 'CH', 'DL', 'DH',
            'AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP',
            'EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP', 'EIP',
            'CS', 'DS', 'ES', 'FS', 'GS', 'SS',
            'ST', 'ST(0)', 'ST(1)', 'ST(2)', 'ST(3)', 'ST(4)', 'ST(5)', 'ST(6)', 'ST(7)',
            'MM0', 'MM1', 'MM2', 'MM3', 'MM4', 'MM5', 'MM6', 'MM7',
            'XMM0', 'XMM1', 'XMM2', 'XMM3', 'XMM4', 'XMM5', 'XMM6', 'XMM7',
        ];

        return registers.map(reg => {
            const item = new vscode.CompletionItem(reg, vscode.CompletionItemKind.Variable);
            item.detail = 'Register';
            return item;
        });
    }

    private getSizeDirectiveCompletions(): vscode.CompletionItem[] {
        const sizes = ['BYTE', 'WORD', 'DWORD', 'QWORD', 'FWORD', 'TBYTE', 'REAL4', 'REAL8', 'REAL10', 'PTR'];
        return sizes.map(s => {
            const item = new vscode.CompletionItem(s, vscode.CompletionItemKind.Keyword);
            item.detail = 'Size directive';
            return item;
        });
    }

    private getSymbolCompletions(
        document: vscode.TextDocument,
        analysis: DocumentAnalysis,
        kinds?: SymbolKind[],
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const seen = new Set<string>();

        // Get symbols visible from this file (includes cross-file via INCLUDE)
        const visibleSymbols = workspaceManager.getVisibleSymbols(document.uri.toString());

        for (const sym of visibleSymbols.getAll()) {
            if (kinds && !kinds.includes(sym.kind)) { continue; }
            const upperName = sym.name.toUpperCase();
            if (seen.has(upperName)) { continue; }
            seen.add(upperName);

            const item = new vscode.CompletionItem(sym.name, symbolKindToCompletionKind(sym.kind));
            item.detail = sym.detail;
            items.push(item);
        }

        return items;
    }
}

function symbolKindToCompletionKind(kind: SymbolKind): vscode.CompletionItemKind {
    switch (kind) {
        case SymbolKind.Segment: return vscode.CompletionItemKind.Class;
        case SymbolKind.Procedure: return vscode.CompletionItemKind.Function;
        case SymbolKind.Macro: return vscode.CompletionItemKind.Snippet;
        case SymbolKind.Structure: return vscode.CompletionItemKind.Struct;
        case SymbolKind.Label: return vscode.CompletionItemKind.Reference;
        case SymbolKind.Variable: return vscode.CompletionItemKind.Variable;
        case SymbolKind.Constant: return vscode.CompletionItemKind.Constant;
        case SymbolKind.Parameter: return vscode.CompletionItemKind.TypeParameter;
        case SymbolKind.Extern: return vscode.CompletionItemKind.Interface;
    }
}
