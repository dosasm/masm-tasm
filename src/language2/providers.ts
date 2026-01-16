import * as vscode from 'vscode';
import {Parser} from "./parser/parser";
import { Lexer } from './lexer/lexer';
import { ASTNode, ProgramNode } from './ast';
import { format } from './format/format';
import { MasmtasmFormatConfig } from './format/config';

export function parser_code(code:string,path:string):ProgramNode|undefined{
    const parser = new Parser(new Lexer(code), path);
    try{
        const ast = parser.parseProgram();
        return ast;
    }catch(e){
        console.error(e);
        return undefined
    }
}

export class AsmDefProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Definition {
        const range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
        const ast=parser_code(document.getText(),document.uri.toString());

        const wordo = document.getText(range);
        // const tasmsymbol = docinfo.findSymbol(wordo);
        // if (tasmsymbol) {
        //     return tasmsymbol.location(document.uri);
        // }
        return [];
    }
}


/** convert the symboltype from assembly language to VSCode
 * 
 * | assembly symbol | vscode symbol | 汇编关键字 | vscode关键字 |
 * | --------------- | ------------- | ---------- | ------------ |
 * | macro           | Module        | 宏         | 模块         |
 * | segment         | Class         | 段         | 类           |
 * | procedure       | Function      | 子程序     | 函数         |
 * | struct          | Struct        | 结构体     | 结构体       |
 * | label           | Key           | 标号       | 键           |
 * | variable        | Variable      | 变量       | 变量         |
 */
function SymbolVSCfy(asmType: string): vscode.SymbolKind {
    switch (asmType) {
        //"Macro" | "Label" | "Program" | "Instruction" | "Conditional"
        case "Macro": return vscode.SymbolKind.Module; break;
        // case KeywordType.Segment: return vscode.SymbolKind.Class; break;
        case "Program": return vscode.SymbolKind.Function; break;
        // case KeywordType.Structure: return vscode.SymbolKind.Struct; break;
        case "Label": return vscode.SymbolKind.Key; break;
        // case KeywordType.Variable: return vscode.SymbolKind.Variable; break;
    }
    return vscode.SymbolKind.Null;
}

function search_symbol(doc:vscode.TextDocument,output:vscode.DocumentSymbol[],nodes:ASTNode[]){
    for (const node of nodes) {
        if (node.type === "Label") {
            const kind = SymbolVSCfy(node.type);
            const selStart = doc.positionAt(node.trace.index);
            const selEnd = doc.positionAt(node.trace.index + node.name.length);
            const fullEnd = doc.positionAt(node.trace.end);
            const sym = new vscode.DocumentSymbol(
                node.name,
                "",
                kind,
                new vscode.Range(selStart, selEnd),
                new vscode.Range(selStart, fullEnd)
            );
            output.push(sym);
        }
        if (node.type === "Macro") {
            const kind = SymbolVSCfy(node.type);
            const selStart = doc.positionAt(node.trace.index);
            const selEnd = doc.positionAt(node.trace.index + node.name.length);
            const fullEnd = doc.positionAt(node.trace.end);
            const sym = new vscode.DocumentSymbol(
                node.name,
                "",
                kind,
                new vscode.Range(selStart, selEnd),
                new vscode.Range(selStart, fullEnd)
            );
            output.push(sym);
            // recurse into macro body
            search_symbol(doc, sym.children, node.body);
        }
    }
}

export class Asmsymbolprovider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(doc: vscode.TextDocument): vscode.DocumentSymbol[] {
        const ast=parser_code(doc.getText(),doc.uri.toString());
        if(!ast) return [];
        const output:vscode.DocumentSymbol[]=[];
        search_symbol(doc,output,ast.body);
        return output;
    }
}


//TODO: offer different operation for different vscode.FormattingOptions
export class AsmDocFormat implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        doc: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        const config = loadFormatConfig();
        const textedits: vscode.TextEdit[] = [];
        const t=doc.getText();
        const ast = parser_code(t,doc.uri.toString());
        if(!ast) return [];
        let indent="\t";
        if(options.insertSpaces){
            indent="";
            for (let i=1;i<options.tabSize;i++){
                indent+=" "
            }
        }
        const newstr=format(config,ast,indent);
        const r=new vscode.Range(doc.positionAt(0),doc.positionAt(t.length));
        textedits.push(new vscode.TextEdit(r,newstr))
        return textedits;
    }
}

type caseType = "upper" | "lower" | "title" | "off";

function loadFormatConfig(): MasmtasmFormatConfig {
    const config = vscode.workspace.getConfiguration("masmtasm.language.Format");
    const casing = config.get<{
        instruction: caseType,
        register: caseType,
        directive: caseType,
        operator: caseType,
    }>('casing');
    return {
        align: config.get<'indent' | 'label' | 'segment'>('align') ?? 'segment',
        casing:{
            instruction: casing?.instruction ?? 'off',
            register: casing?.register ?? 'off',
            directive: casing?.directive ?? 'off',
            operator: casing?.operator ?? 'off',
        },
        alignOperand: config.get<boolean>('alignOperand') ?? true,
        alignTrailingComment: config.get<boolean>('alignTrailingComment') ?? true,
        alignSingleLineComment: config.get<boolean>('alignSingleLineComment') ?? true,
        spaceAfterComma: config.get<'always' | 'never' | 'off'>('spaceAfterComma') ?? 'off',
    };
}