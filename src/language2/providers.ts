import * as vscode from 'vscode';
import {Parser} from "./parser/parser";
import { Lexer } from './lexer/lexer';
import { ASTNode, ProgramNode } from './ast';
import { format } from './format/format';
import { MasmtasmFormatConfig } from './format/config';
import { logger } from '../utils/logger';
import { FlattenTree, search } from './ast/tool';

export function parser_code(code:string,path:string):ProgramNode|undefined{
    const parser = new Parser(new Lexer(code), path);
    try{
        const ast = parser.parseProgram();
        return ast;
    }catch(e){
        console.error(e);
        logger.channel("ERROR"+JSON.stringify(e,undefined,"  "))
        return undefined
    }
}

export class AsmDefProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Definition {
        const range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
        const ast=parser_code(document.getText(),document.uri.toString())
        const output:vscode.Location[]=[];
        if(!ast) return output;
        const offset=document.offsetAt(position);
        const tree=new FlattenTree(ast);
        const node=tree.search(offset);
        const wordo = document.getText(range);
        if(node?.type==="Instruction"){
            const node=tree.nodes.find(a=>{
                if(a.type==="Label"){
                    return a.name===wordo
                }
                if(a.type==="Macro"){
                    return a.name===wordo
                }
                if(a.type==="Procedure"){
                    return a.name===wordo
                }
                return false
            })
            if(node){
                output.push(new vscode.Location(
                    document.uri,document.positionAt(node?.trace.index)
                ))
            }
        }
        return output;
    }
}


export class AsmReferenceProvider implements vscode.ReferenceProvider {
    provideReferences(document: vscode.TextDocument, position: vscode.Position): vscode.Location[] {
        const range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
        const word=document.getText(range);
        let output: vscode.Location[] = [];


        const ast=parser_code(document.getText(),document.uri.toString())
        if(!ast) return output;
        const offset=document.offsetAt(position);
        const tree=new FlattenTree(ast);
        const node=tree.search(offset);
        if (node?.type==="Label"){
            for(const n of tree.nodes){
                if(n.type==="Instruction"){
                    for(const o of n.operands){
                        if(o.kind==="Identifier" && o.name===word){
                            output.push(new vscode.Location(
                                document.uri,document.positionAt(n.trace.index)
                            ))
                        }
                    }
                }
            }
        }
        return output;
    }
}

export class AsmRenameProvider implements vscode.RenameProvider {
    provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.WorkspaceEdit> {
        const ast = parser_code(document.getText(), document.uri.toString());
        if(!ast) return undefined;
        const offset = document.offsetAt(position);
        const tree = new FlattenTree(ast);
        const node = tree.search(offset);
        if(!node) return undefined;

        const oldName = (() => {
            if((node as any).name) return (node as any).name as string;
            // fallback: word at position
            const range = document.getWordRangeAtPosition(position);
            return range ? document.getText(range) : undefined;
        })();
        if(!oldName) return undefined;

        const edit = new vscode.WorkspaceEdit();

        function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
        const nameRe = new RegExp(escapeRegExp(oldName), 'g');

        // replace definitions for same-type symbols
        for(const n of tree.nodes){
            if((n.type === 'Label' || n.type === 'Macro' || n.type === 'Procedure' || n.type === 'Segment' || n.type === 'Struct') && (n as any).name === oldName){
                const start = document.positionAt(n.trace.index);
                const end = document.positionAt(n.trace.index + (n as any).name.length);
                edit.replace(document.uri, new vscode.Range(start,end), newName);
            }
        }

        // replace instruction-level occurrences: mnemonic and operand identifiers
        for(const n of tree.nodes){
            if(n.type === 'Instruction'){
                // replace mnemonic when it matches
                try{
                    const instrStart = n.trace.index;
                    const instrEnd = n.trace.end;
                    const r = new vscode.Range(document.positionAt(instrStart), document.positionAt(instrEnd));
                    const text = document.getText(r);

                    // check mnemonic (first token)
                    const m = text.match(/^\s*([^\s]+)/);
                    if(m && m[1] === oldName){
                        const idx = text.indexOf(m[1]);
                        const abs = instrStart + idx;
                        edit.replace(document.uri, new vscode.Range(document.positionAt(abs), document.positionAt(abs + oldName.length)), newName);
                    }

                    // replace operand identifier occurrences (best-effort within instruction text)
                    const instrOperands = (n as any).operands as any[] || [];
                    if(instrOperands.length>0){
                        let match: RegExpExecArray | null;
                        const re = nameRe;
                        while((match = re.exec(text))){
                            // best-effort: ensure this occurrence corresponds to an Identifier operand
                            // if any operand has the same name, accept replacement
                            const hasOperand = instrOperands.some(o=>o.kind === 'Identifier' && o.name === oldName);
                            if(hasOperand){
                                const abs = instrStart + match.index;
                                edit.replace(document.uri, new vscode.Range(document.positionAt(abs), document.positionAt(abs + oldName.length)), newName);
                            }
                        }
                    }
                }catch(e){
                    // ignore per-instruction errors
                }
            }
        }

        return edit;
    }
    prepareRename?(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string; }> {
        const ast = parser_code(document.getText(), document.uri.toString());
        if(!ast) return undefined;
        const offset = document.offsetAt(position);
        const tree = new FlattenTree(ast);
        const node = tree.search(offset);
        if(!node) return undefined;
        if(node.type === 'Label' || node.type === 'Macro' || node.type === 'Procedure' || node.type === 'Segment' || node.type === 'Struct'){
            const name = (node as any).name as string;
            const start = document.positionAt(node.trace.index);
            const end = document.positionAt(node.trace.index + name.length);
            return { range: new vscode.Range(start,end), placeholder: name };
        }
        return undefined;
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
        case "Segment": return vscode.SymbolKind.Class; break;
        case "Program": return vscode.SymbolKind.Function; break;
        case "Struct": return vscode.SymbolKind.Struct; break;
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
            const fullEnd = doc.positionAt(node.trace.end-1);
            const a=doc.validateRange(new vscode.Range(selStart, selEnd));
            const b=doc.validateRange(new vscode.Range(selStart, fullEnd));
            const sym = new vscode.DocumentSymbol(
                node.name,
                "",
                kind,
                a,a
            );
            output.push(sym);
        }
        if (node.type === "Macro"||node.type === "Procedure"||node.type === "Segment"||node.type === "Struct") {
            const kind = SymbolVSCfy(node.type);
            const selStart = doc.positionAt(node.trace.index);
            const selEnd = doc.positionAt(node.trace.index + node.name.length);
            const fullEnd = doc.positionAt(node.trace.end);
            const a=doc.validateRange(new vscode.Range(selStart, selEnd));
            const b=doc.validateRange(new vscode.Range(selStart, fullEnd));
            const sym = new vscode.DocumentSymbol(
                node.name,
                "",
                kind,
                a,a
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
