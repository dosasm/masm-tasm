import * as vscode from 'vscode';
import { getType, KeywordType } from './wordinfo';

export class DocInfo {
    static docScaned: vscode.TextDocument | undefined = undefined;
    static docInfoScaned: DocInfo | undefined = undefined;
    static getDocInfo(doc: vscode.TextDocument): DocInfo {
        if (DocInfo.docInfoScaned && DocInfo.docScaned?.version === doc.version && DocInfo.docScaned.fileName === doc.fileName) {
        } else {
            DocInfo.docInfoScaned = new DocInfo(doc);
            DocInfo.docScaned = doc;
        }
        return DocInfo.docInfoScaned;
    }

    lines: Asmline[];
    flat?: AsmSymbol[];
    tree?: vscode.DocumentSymbol[];
    constructor(doc: vscode.TextDocument) {
        const asmlines = doc2lines(doc);
        const tree = lines2tree(asmlines);
        this.lines = asmlines;
        this.flat = tree.flat;
        this.tree = tree.tree;
    }
    public findSymbol(word: string): AsmSymbol | undefined {
        if (this.flat) {
            for (const sym of this.flat) {
                if (sym.name === word) {
                    return sym;
                }
            }
        }
        return;
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
function SymbolVSCfy(asmType: KeywordType): vscode.SymbolKind {
    switch (asmType) {
        case KeywordType.Macro: return vscode.SymbolKind.Module; break;
        case KeywordType.Segment: return vscode.SymbolKind.Class; break;
        case KeywordType.Procedure: return vscode.SymbolKind.Function; break;
        case KeywordType.Structure: return vscode.SymbolKind.Struct; break;
        case KeywordType.Label: return vscode.SymbolKind.Key; break;
        case KeywordType.Variable: return vscode.SymbolKind.Variable; break;
    }
    return vscode.SymbolKind.Null;
}

class AsmSymbol {
    type: KeywordType;
    name: string;
    RangeorPosition: vscode.Range | vscode.Position;
    constructor(type: number, name: string, RangeorPosition: vscode.Range | vscode.Position) {
        this.type = type;
        this.name = name;
        this.RangeorPosition = RangeorPosition;
    }
    public location(docuri: vscode.Uri): vscode.Location {
        return new vscode.Location(docuri, this.RangeorPosition);
    }
    public markdown(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        const typestr: string = getType(this.type);
        md.appendMarkdown('**' + typestr + "** " + this.name);
        return md;
    }
}

export enum linetype {
    other,
    macro, endm, segment, ends, struct, proc, endp,
    label, variable,
    end, onlycomment
}

//TODO: add support for structure
export class Asmline {
    docuri: vscode.Uri;
    type: linetype = linetype.other;
    line: number;
    str: string;

    name: string | undefined;
    index = 1;
    comment: string | undefined;
    main: string | undefined;
    commentIndex: number | undefined;
    operator: string | undefined;
    operand: string | undefined;
    treeUsed = false;
    constructor(str: string, line: number, docuri: vscode.Uri) {
        this.docuri = docuri;
        this.line = line;
        this.str = str;
        const main = this.getcomment(str);//split mainbody and comment
        if (main) {
            if (this.getsymbol1(main) === false)//get symbols of macros,segments,procedures
            { this.getvarlabel(main); }//get symbols of labels,variables
        }
        else {
            if (this.comment) { this.type = linetype.onlycomment; }
        }
    }
    private getcomment(str: string): string | undefined {
        let i: number, quoted: string | undefined = undefined;
        let main: string | null = null, comment: string | undefined = undefined;
        const arr = str.split("");
        for (i = 0; i < arr.length; i++) {
            if ((arr[i] === "'" || arr[i] === "\"")) {
                if (quoted === arr[i]) { quoted = undefined; }
                else if (quoted === undefined) { quoted = arr[i]; }
            }
            if (arr[i] === ";" && quoted === undefined) {
                break;
            }
        }
        if (i < arr.length) {
            comment = str.substring(i);
            this.comment = comment?.trim();
        }
        main = str.substring(0, i).trim();
        if (main.length === 0) { this.main = undefined; }
        else { this.main = main; }
        return this.main;
    }
    private getsymbol1(str: string): boolean {
        let r: RegExpMatchArray | null = null, name: string | undefined;
        let flag = false;
        r = str.match(/^\s*(\w+)\s+(\w+)\s*/);
        let type1: linetype | undefined;
        if (r) {
            switch (r[2].toUpperCase()) {
                case 'MACRO': type1 = linetype.macro; break;
                case 'SEGMENT': type1 = linetype.segment; break;
                case 'PROC': type1 = linetype.proc; break;
                case 'ENDS': type1 = linetype.ends; break;
                case 'ENDP': type1 = linetype.endp; break;
            }
            if (type1) { name = r[1]; }
            if (r[1].toLowerCase() === 'end') {
                type1 = linetype.end;
                name = r[2];
            }
        }
        //match the end of macro
        else if (r = str.match(/(endm|ENDM)/)) {
            type1 = linetype.endm;
            name = r[1];
        }
        //match the simplified segment definition
        else if (r = str.match(/^\s*\.([a-zA-Z_@?$]\w+)\s*$/)) {
            type1 = linetype.segment;
            name = r[1];
        }
        if (type1 && name) {
            this.type = type1;
            this.index = str.indexOf(name);
            this.name = name;
            flag = true;
        }
        return flag;
    }
    private getvarlabel(item: string): void {
        let r = item.match(/^\s*(\w+\s+|)([dD][bBwWdDfFqQtT]|=|EQU|equ)(\s+.*)$/);
        let name: string | undefined;
        if (r) {
            name = r[1].trim();
            this.type = linetype.variable;
            if (name.length !== 0) {
                this.name = name;
                this.index = item.indexOf(r[1]);
            }
            this.operator = r[2];
            this.operand = r[3].trim();
        }
        else if (r = item.match(/^\s*(\w+\s*:|)\s*(\w+|)(\s+.*|)$/)) {
            name = r[1];
            this.type = linetype.label;
            if (name.length !== 0) {
                this.name = name.slice(0, name.length - 1).trim();
                this.index = item.indexOf(r[1]);
            }
            this.operator = r[2];
            this.operand = r[3].trim();
        }
    }
    public toTasmSymbol(): AsmSymbol | undefined {
        let one: AsmSymbol | undefined = undefined;
        if (this.name) {
            if (this.type === linetype.label) {
                one = new AsmSymbol(KeywordType.Label, this.name, new vscode.Position(this.line, this.index));
            }
            else if (this.type === linetype.variable) {
                one = new AsmSymbol(KeywordType.Variable, this.name, new vscode.Position(this.line, this.index));
            }
        }
        return one;
    }
    public varlabelsymbol(): vscode.DocumentSymbol | undefined {
        let vscsymbol: vscode.DocumentSymbol | undefined;
        const name = this.name;
        if (name && (this.type === linetype.variable || this.type === linetype.label)) {
            let kind: vscode.SymbolKind;
            const range = new vscode.Range(this.line, 0, this.line, this.str.length);
            const start = this.str.indexOf(name);
            const srange = new vscode.Range(this.line, start, this.line, start + name.length);
            if (this.type === linetype.label) {
                kind = SymbolVSCfy(KeywordType.Label);
                vscsymbol = new vscode.DocumentSymbol(name, " ", kind, range, srange);
            }
            else if (this.type === linetype.variable) {
                kind = SymbolVSCfy(KeywordType.Variable);
                vscsymbol = new vscode.DocumentSymbol(name, " ", kind, range, srange);
            }
        }

        return vscsymbol;
    }
    public selectrange(): vscode.Range | undefined {
        if (this.name && this.index) {
            return new vscode.Range(this.line, this.index, this.line, this.index + this.name?.length);
        }
    }
}

function doc2lines(document: vscode.TextDocument): Asmline[] {
    const asmlines: Asmline[] = [];
    let splitor = '\r\n';
    if (document.eol === vscode.EndOfLine.LF) { splitor = '\n'; }
    const doc = document.getText().split(splitor);
    doc.forEach(
        (item, index) => {
            asmlines.push(new Asmline(item, index, document.uri));
        }
    );
    return asmlines;
}

interface SYMBOLINFO {
    tree: vscode.DocumentSymbol[];
    flat: AsmSymbol[];
}

function lines2tree(asmlines: Asmline[]): SYMBOLINFO {
    const VSCsymbols: vscode.DocumentSymbol[] = [], symbols: AsmSymbol[] = [];
    let i: number;
    //find the information of macro,segemnts and procedure
    asmlines.forEach(
        (line, index, array) => {
            //variables and labels
            const varlabel = line.toTasmSymbol();
            if (varlabel) {
                symbols.push(varlabel);
            }
            //find macro
            if (line.type === linetype.macro) {
                let lineEndmacro: Asmline | undefined;
                //find the end of macro
                for (i = index; i < asmlines.length; i++) {
                    if (array[i].type === linetype.endm) {
                        lineEndmacro = array[i];
                        break;
                    }
                }
                //finded the end of macro
                if (line.name && lineEndmacro?.line) {
                    const macrorange = new vscode.Range(line.line, line.index, lineEndmacro?.line, lineEndmacro?.index);
                    symbols.push(new AsmSymbol(KeywordType.Macro, line.name, macrorange));
                    const symbol1 = new vscode.DocumentSymbol(line.name, getType(KeywordType.Macro), SymbolVSCfy(KeywordType.Macro), macrorange, new vscode.Range(line.line, line.index, line.line, line.index + line.name.length));
                    VSCsymbols.push(symbol1);
                }
            }
            else if (line.type === linetype.segment) {
                let lineEndSegment: Asmline | undefined;//the line information of the endline of the segment
                let proc: Asmline | undefined;//the procedure finding
                const procschild: vscode.DocumentSymbol[] = [];
                //finding the end of segment line.name and collecting information of procedure 
                for (i = index; i < asmlines.length; i++) {
                    //find proc
                    if (array[i].type === linetype.proc) {
                        proc = array[i];
                    }
                    //finding the end of proc
                    if (array[i].type === linetype.endp && proc?.name === array[i].name) {
                        const _name = array[i].name;
                        if (proc?.name && _name) {
                            const range: vscode.Range = new vscode.Range(proc?.line, proc?.index, array[i].line, array[i].index + _name.length);
                            const srange: vscode.Range = new vscode.Range(proc.line, proc.index, proc?.line, proc?.index + proc?.name?.length);
                            procschild.push(new vscode.DocumentSymbol(proc?.name, getType(KeywordType.Procedure), SymbolVSCfy(KeywordType.Procedure), range, srange));
                            symbols.push(new AsmSymbol(KeywordType.Procedure, _name, range));
                        }
                    }
                    //finding the end of segment
                    if (array[i].type === linetype.ends && array[i].name === line.name) {
                        lineEndSegment = array[i];
                        break;
                    }
                    //if finding another start of segment, also view as end of the finding segment
                    if (array[i + 1].type === linetype.segment || array[i + 1].type === linetype.end) {
                        lineEndSegment = array[i];
                        break;
                    }
                }
                //finded the end of segment
                if (line.name && lineEndSegment?.line) {
                    const range = new vscode.Range(line.line, line.index, lineEndSegment?.line, lineEndSegment?.index);
                    symbols.push(new AsmSymbol(KeywordType.Segment, line.name, range));
                    const symbol1 = new vscode.DocumentSymbol(line.name, getType(KeywordType.Segment), SymbolVSCfy(KeywordType.Segment), range, new vscode.Range(line.line, line.line, line.line, line.line + line.name.length));
                    symbol1.children = procschild;
                    VSCsymbols.push(symbol1);
                }
            }
        }
    );
    //add information of variables and labels to the symbol tree
    VSCsymbols.forEach(
        (item) => {
            //add labels and variables to macro
            if (item.kind === SymbolVSCfy(KeywordType.Macro)) {
                let symbol3: vscode.DocumentSymbol | undefined;
                for (i = item.range.start.line; i <= item.range.end.line; i++) {
                    symbol3 = asmlines[i].varlabelsymbol();
                    if (symbol3) { item.children.push(symbol3); }
                }
            }
            //add labels and variables to segemnt and procedure
            else if (item.kind === SymbolVSCfy(KeywordType.Segment)) {
                let symbol2: vscode.DocumentSymbol | undefined;
                item.children.forEach(
                    (item2) => {
                        for (i = item2.range.start.line; i <= item2.range.end.line; i++) {
                            const symbol3 = asmlines[i].varlabelsymbol();
                            asmlines[i].treeUsed = true;
                            if (symbol3) { item2.children.push(symbol3); }
                        }
                    },
                );
                for (i = item.range.start.line + 1; i < item.range.end.line; i++) {
                    if (asmlines[i].treeUsed === false) { symbol2 = asmlines[i].varlabelsymbol(); }
                    if (symbol2) { item.children.push(symbol2); }
                }
            }
        }
    );
    return {
        tree: VSCsymbols,
        flat: symbols
    };

}

