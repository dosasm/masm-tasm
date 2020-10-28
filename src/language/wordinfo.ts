import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();
let symbols: TasmSymbol[] = [];//record symbols in the doc in a simple way
let _documentText: string | undefined;//record the processing document
let _docUri: vscode.Uri | undefined;
let asmline: Asmline[] = [];//split and analyse the document
let docsymbol: vscode.DocumentSymbol[] = [];//record symbols in the doc in a VSCode way

export function getrefer(word: string, doc: vscode.TextDocument): vscode.Location[] {
	let output: vscode.Location[] = [];
	let r: vscode.Range, skip: boolean = false;
	let def = findSymbol(word);
	if (def?.location) {
		output.push(def.location);
		asmline.forEach(
			(item, index) => {
				switch (item.type) {
					case linetype.macro: skip = true; break;
					case linetype.endm: skip = false; break;
					case linetype.label:
						if (skip === false) {
							//TODO：优化匹配方式，对于变量应该考虑多种复杂的表达式如：查找var不能找到nvar，对注释信息进行对齐
							if (def?.type === symboltype.variable && item.operand?.match(new RegExp("\\b" + word + "\\b"))) {
								let start = item.str.indexOf(word);
								r = new vscode.Range(index, start, index, start + word.length);
							}
							else if (def?.type === symboltype.macro && item.operator === word) {
								let start = item.str.indexOf(word);
								r = new vscode.Range(index, start, index, start + word.length);
							}
							else if ((def?.type === symboltype.procedure || def?.type === symboltype.label) && item.operand === word) {
								let start = item.str.indexOf(word);
								r = new vscode.Range(index, start, index, start + word.length);
							}
							if (r) { output.push(new vscode.Location(doc.uri, r)); }
						}
						else {

						}

				}
			}
		);
	}
	return output;
}
export function codeformatting(doc: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
	let formator: vscode.TextEdit[] = [];
	scanDocumnt(doc);
	//console.log(asmline)
	// if (docsymbol.length === 0) {
	// 	formator = formateline(0, asmline.length, doc, formator)
	// }
	// else 
	docsymbol.forEach(
		(item) => {
			formator = formateline(item.range.start.line, item.range.end.line, doc, formator);
		}
	);
	return formator;
}
function formateline(beg: number, end: number, document: vscode.TextDocument, formator: vscode.TextEdit[]): vscode.TextEdit[] {
	let namesize: number = 0, optsize: number = 0, oprsize: number = 0,
		str: string | undefined = undefined, r: vscode.Range, i: number;
	//scan the asmlines for information
	for (i = beg; i < end; i++) {
		let item = asmline[i];
		if (item.name) { namesize = item.name.length > namesize ? item.name.length : namesize; }//find the maxlength of label name or variabel name
		if (item.operator) { optsize = item.operator.length > optsize ? item.operator.length : optsize; }//find the maxlength of operator 
		if (item.operand) { oprsize = item.operand.length > oprsize ? item.operand.length : oprsize; }//find the maxlength of operand
	}
	for (i = beg; i < end; i++) {
		str = undefined;
		let item = asmline[i];
		if (item.type === linetype.label || item.type === linetype.variable) {
			str = "\t";
			let length: number = 0;
			if (item.name?.length) { length = item.name.length; }
			if (item.type === linetype.label && item.name) { str += item.name + ":"; }
			else if (item.type === linetype.variable && item.name) { str += item.name + " "; }
			else { str += " "; }
			for (let i = 0; i < namesize - length; i++) { str += " "; }//标签变量名前补充空格
			str += item.operator;
			if (item.operator?.length) { length = item.operator.length; }
			else { length = 0; }
			if (item.operand || item.comment) {
				for (let i = 0; i < optsize - length; i++) { str += " "; }//操作码后补充空格
				str += " " + item.operand;
			}
			if (item.comment) {
				if (item.operand?.length) { length = item.operand.length; }
				else { length = 0; }
				for (let i = 0; i < oprsize - length; i++) { str += " "; }//操作数后补充空格
				str += "\t" + item.comment;
			}
		}
		else if (item.type === linetype.onlycomment) {
			str = "\t" + item.comment;
		}
		else if (item.main) {
			str = item.main.replace(/\s+/, " ");
			let length: number = namesize + 1 + optsize + 1 + oprsize - str.length;
			if (item.comment) {
				for (let i = 0; i < length; i++) { str += " "; }//后补充空格
				str += "\t\t" + item.comment;
			}
		}
		if (str && str !== item.str) {
			r = new vscode.Range(item.line, 0, item.line, item.str.length);
			formator.push(vscode.TextEdit.replace(document.validateRange(r), str));
		}
	}
	return formator;
}


//part I scan the document for information
enum symboltype {
	other,
	macro,
	procedure,
	struct,
	label,
	variable,
	segment
}
function SymbolVSCfy(a: symboltype) {
	let output = vscode.SymbolKind.Null;
	switch (a) {
		case symboltype.macro: output = vscode.SymbolKind.Module; break;
		case symboltype.segment: output = vscode.SymbolKind.Class; break;
		case symboltype.procedure: output = vscode.SymbolKind.Function; break;
		case symboltype.struct: output = vscode.SymbolKind.Struct; break;
		case symboltype.label: output = vscode.SymbolKind.Key; break;
		case symboltype.variable: output = vscode.SymbolKind.Variable; break;
	}
	return output;
}
class TasmSymbol {
	type: symboltype;
	name: string;
	location: vscode.Location | undefined;
	ref: vscode.Location[] | undefined;
	constructor(type: number, name: string, RangeorPosition: vscode.Range | vscode.Position) {
		this.type = type;
		this.name = name;
		if (_docUri) { this.location = new vscode.Location(_docUri, RangeorPosition); }
	}
	public markdown(): vscode.MarkdownString {
		let md = new vscode.MarkdownString();
		let typestr: string = " ";
		switch (this.type) {
			case symboltype.label: typestr = localize("keykind.Label", "label"); break;
			case symboltype.variable: typestr = localize("keykind.Variable", "variable"); break;
			case symboltype.procedure: typestr = localize("keykind.Procedure", "procedure"); break;
			case symboltype.struct: typestr = localize("keykind.Structure", "Structure"); break;
			case symboltype.macro: typestr = localize("keykind.Macro", "macro"); break;
			case symboltype.segment: typestr = localize("keykind.Segment", "segment"); break;
		}
		md.appendMarkdown('**' + typestr + "** " + this.name);
		return md;
	}
}
export function findSymbol(word: string): TasmSymbol | undefined {
	for (let sym of symbols) {
		if (sym.name === word) {
			return sym;
		}
	}
	return;
}
enum linetype {
	other, macro, endm, segment, ends, struct, proc, endp, label, variable,
	end, onlycomment, labelB, variableB
}
//TODO: add support for structure
class Asmline {
	type: linetype = linetype.other;
	line: number;
	str: string;
	name: string | undefined;
	index: number = 1;
	comment: string | undefined;
	main: string | undefined;
	commentIndex: number | undefined;
	operator: string | undefined;
	operand: string | undefined;
	treeUsed: boolean = false;
	constructor(str: string, line: number) {
		this.line = line;
		this.str = str;
		let main = this.getcomment(str);//split mainbody and comment
		if (main) {
			if (this.getsymbol1(main) === false)//get symbols of macros,segments,procedures
			{ this.getvarlabel(main); }//get symbols of labels,variables
		}
		else {
			if (this.comment) { this.type = linetype.onlycomment; }
		}
	}
	private getcomment(str: string): string | undefined {
		let i: number, quoted: string | undefined = undefined, index: number | undefined = undefined;
		let main: string | null = null, comment: string | undefined = undefined;
		let arr = str.split("");
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
		let flag: boolean = false;
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
	private getvarlabel(item: string) {
		let r = item.match(/^\s*(\w+\s+|)([dD][bBwWdDfFqQtT]|=|EQU|equ)(\s+.*)$/);
		let name: string | undefined;
		if (r) {
			name = r[1].trim();
			this.type = linetype.variable;
			if (name.length !== 0) {
				this.name = name;
				let start = item.indexOf(r[1]);
				let one: TasmSymbol = new TasmSymbol(symboltype.variable, name, new vscode.Position(this.line, start));
				symbols.push(one);
			}
			this.operator = r[2];
			this.operand = r[3].trim();
		}
		else if (r = item.match(/^\s*(\w+\s*:|)\s*(\w+|)(\s+.*|)$/)) {
			name = r[1];
			this.type = linetype.label;
			if (name.length !== 0) {
				this.name = name.slice(0, name.length - 1).trim();
				let start = item.indexOf(r[1]);
				let one: TasmSymbol = new TasmSymbol(symboltype.label, this.name, new vscode.Position(this.line, start));
				symbols.push(one);
			}
			this.operator = r[2];
			this.operand = r[3].trim();
		}


	}
	public varlabelsymbol(): vscode.DocumentSymbol | undefined {
		let vscsymbol: vscode.DocumentSymbol | undefined;
		let name = this.name;
		if (name && (this.type === linetype.variable || this.type === linetype.label)) {
			let kind: vscode.SymbolKind, range: vscode.Range, srange: vscode.Range;
			range = new vscode.Range(this.line, 0, this.line, this.str.length);
			let start = this.str.indexOf(name);
			srange = new vscode.Range(this.line, start, this.line, start + name.length);
			if (this.type === linetype.label) {
				kind = SymbolVSCfy(symboltype.label);
				vscsymbol = new vscode.DocumentSymbol(name, " ", kind, range, srange);
			}
			else if (this.type === linetype.variable) {
				kind = SymbolVSCfy(symboltype.variable);
				vscsymbol = new vscode.DocumentSymbol(name, " ", kind, range, srange);
			}
		}

		return vscsymbol;
	}
	public selectrange() {
		if (this.name && this.index) { return new vscode.Range(this.line, this.index, this.line, this.index + this.name?.length); }
	}
	public description() {

	}
}

function sacnDoc(document: vscode.TextDocument) {
	_documentText = document.getText(); _docUri = document.uri;
	symbols = []; asmline = [];
	let splitor: string = '\r\n';
	if (document.eol === vscode.EndOfLine.LF) { splitor = '\n'; }
	let doc = _documentText.split(splitor);
	// scan the document for necessary information
	let docsymbol: vscode.DocumentSymbol[] = [];
	doc.forEach(
		(item, index) => {
			asmline.push(new Asmline(item, index));
		}
	);
}
function symboltree() {
	docsymbol = [];
	let i: number;
	//find the information of macro,segemnts and procedure
	asmline.forEach(
		(line, index, array) => {
			//find macro
			if (line.type === linetype.macro) {
				let line_endm: Asmline | undefined;
				//find the end of macro
				for (i = index; i < asmline.length; i++) {
					if (array[i].type === linetype.endm) {
						line_endm = array[i];
						break;
					}
				}
				//finded the end of macro
				if (line.name && line_endm?.line) {
					let macrorange = new vscode.Range(line.line, line.index, line_endm?.line, line_endm?.index);
					symbols.push(new TasmSymbol(symboltype.macro, line.name, macrorange));
					let symbol1 = new vscode.DocumentSymbol(line.name, getType(KeywordType.Macro), SymbolVSCfy(symboltype.macro), macrorange, new vscode.Range(line.line, line.index, line.line, line.index + line.name.length));
					docsymbol.push(symbol1);
				}
			}
			else if (line.type === linetype.segment) {
				let line_ends: Asmline | undefined;//the line information of the endline of the segment
				let proc: Asmline | undefined;//the procedure finding
				let procschild: vscode.DocumentSymbol[] = [];
				//finding the end of segment line.name and collecting information of procedure 
				for (i = index; i < asmline.length; i++) {
					//find proc
					if (array[i].type === linetype.proc) {
						proc = array[i];
					}
					//finding the end of proc
					if (array[i].type === linetype.endp && proc?.name === array[i].name) {
						let _name = array[i].name;
						if (proc?.name && _name) {
							let range: vscode.Range = new vscode.Range(proc?.line, proc?.index, array[i].line, array[i].index + _name.length);
							let srange: vscode.Range = new vscode.Range(proc.line, proc.index, proc?.line, proc?.index + proc?.name?.length);
							procschild.push(new vscode.DocumentSymbol(proc?.name, getType(KeywordType.Procedure), SymbolVSCfy(symboltype.procedure), range, srange));
							symbols.push(new TasmSymbol(symboltype.procedure, _name, range));
						}
					}
					//finding the end of segment
					if (array[i].type === linetype.ends && array[i].name === line.name) {
						line_ends = array[i];
						break;
					}
					//if finding another start of segment, also view as end of the finding segment
					if (array[i + 1].type === linetype.segment || array[i + 1].type === linetype.end) {
						line_ends = array[i];
						break;
					}
				}
				//finded the end of segment
				if (line.name && line_ends?.line) {
					let range = new vscode.Range(line.line, line.index, line_ends?.line, line_ends?.index);
					symbols.push(new TasmSymbol(symboltype.segment, line.name, range));
					let symbol1 = new vscode.DocumentSymbol(line.name, getType(KeywordType.Segment), SymbolVSCfy(symboltype.segment), range, new vscode.Range(line.line, line.line, line.line, line.line + line.name.length));
					symbol1.children = procschild;
					docsymbol.push(symbol1);
				}
			}
		}
	);
	//add information of variables and labels to the symbol tree
	docsymbol.forEach(
		(item) => {
			//add labels and variables to macro
			if (item.kind === SymbolVSCfy(symboltype.macro)) {
				let symbol3: vscode.DocumentSymbol | undefined;
				for (i = item.range.start.line; i <= item.range.end.line; i++) {
					symbol3 = asmline[i].varlabelsymbol();
					if (symbol3) { item.children.push(symbol3); }
				}
			}
			//add labels and variables to segemnt and procedure
			else if (item.kind === SymbolVSCfy(symboltype.segment)) {
				let symbol2: vscode.DocumentSymbol | undefined;
				item.children.forEach(
					(item2, index, array) => {
						for (i = item2.range.start.line; i <= item2.range.end.line; i++) {
							let symbol3 = asmline[i].varlabelsymbol();
							asmline[i].treeUsed = true;
							if (symbol3) { item2.children.push(symbol3); }
						}
					},
				);
				for (i = item.range.start.line + 1; i < item.range.end.line; i++) {
					if (asmline[i].treeUsed === false) { symbol2 = asmline[i].varlabelsymbol(); }
					if (symbol2) { item.children.push(symbol2); }
				}
			}
		}
	);

}
export function scanDocumnt(doc?: vscode.TextDocument): vscode.DocumentSymbol[] {
	if (doc && (doc.getText() !== _documentText || doc.uri !== _docUri)) {
		sacnDoc(doc);
		symboltree();
	}
	return docsymbol;
}

//---------------------------------------------------------------
// part two offer imformation for keyword and number(char)

export function isNumberStr(str: string): boolean {
	let a = str.match(/([01]+[Bb]|[0-7]+[Qq]|[0-9][0-9A-Fa-f]*[Hh]|[0-9]+[Dd]?)/);
	if (a && a[0] === str) { return true; }
	return false;
}
const asciiname: string[] = [
	"NUL" + localize("ascii.NUL", "(NULL)"),
	"SOH" + localize("ascii.SOH", "(Start Of Headling)"),
	"STX" + localize("ascii.STX", "(Start Of Text)"),
	"ETX" + localize("ascii.ETX", "(End Of Text)"),
	"EOT" + localize("ascii.EOT", "(End Of Transmission)"),
	"ENQ" + localize("ascii.ENQ", "(Enquiry)"),
	"ACK" + localize("ascii.ACK", "(Acknowledge)"),
	"BEL" + localize("ascii.BEL", "(Bell)"),
	"BS " + localize("ascii.BS", "(Backspace)"),
	"HT " + localize("ascii.HT", "(Horizontal Tab)"),
	"LF/NL" + localize("ascii.LFNL", "(Line Feed/New Line)"),
	"VT " + localize("ascii.VT", "(Vertical Tab)"),
	"FF/NP " + localize("ascii.FFNP", "(Form Feed/New Page)"),
	"CR" + localize("ascii.CR", "(Carriage Return)	"),
	"SO" + localize("ascii.SO", "(Shift Out)"),
	"SI" + localize("ascii.SI", "(Shift In)"),
	"DLE" + localize("ascii.DLE", "(Data Link Escape)"),
	"DC1/XON" + localize("ascii.DC1", "(Device Control 1/Transmission On)"),
	"DC2" + localize("ascii.DC2", "(Device Control 2)"),
	"DC3/XOFF" + localize("ascii.DC3", "(Device Control 3/Transmission Off)"),
	"DC4" + localize("ascii.DC4", "(Device Control 4)"),
	"NAK" + localize("ascii.NAK", "(Negative Acknowledge)"),
	"SYN" + localize("ascii.SYN", "(Synchronous Idle)"),
	"ETB" + localize("ascii.ETB", "(End of Transmission Block)	"),
	"CAN" + localize("ascii.CAN", "(Cancel)"),
	"EM" + localize("ascii.EM", "(End of Medium)"),
	"SUB" + localize("ascii.SUB", "(Substitute)"),
	"ESC" + localize("ascii.ESC", "(Escape)"),
	"FS" + localize("ascii.FS", "(File Separator)"),
	"GS" + localize("ascii.GS", "(Group Separator)"),
	"RS" + localize("ascii.RS", "(Record Separator)"),
	"US" + localize("ascii.US", "(Unit Separator)"),
	localize("ascii.space", "(Space)	"),
	"!", "\" ", "#",
	"$", "%", "&", "'", "(",
	")", "*", "+", ",", "-",
	".", "/", "0", "1", "2",
	"3", "4", "5", "6", "7",
	"8", "9", ":", ";", "<",
	"=", ">", "?", "@", "A",
	"B", "C", "D", "E", "F",
	"G", "H", "I", "J", "K",
	"L", "M", "N", "O", "P",
	"Q", "R", "S", "T", "U",
	"V", "W", "X", "Y", "Z",
	"[", "\\", "]", "^", "_",
	"`", "a", "b", "c", "d",
	"e", "f", "g", "h", "i",
	"j", "k", "l", "m", "n",
	"o", "p", "q", "r", "s",
	"t", "u", "v", "w", "x",
	"y", "z", "{", "|", "}",
	"~",
	"DEL" + localize("ascii.DEL", "(Delete)"),
];
export function getNumMsg(word: string) {
	let base: number = word.endsWith('h') ? 16 : word.endsWith('q') ? 8 : word.endsWith('b') ? 2 : 10;
	let value: number = Number.parseInt(word, base);
	let hex = localize("num.hex", "Hexadecimal  Number");
	let oct = localize("num.oct", "Octal  Number");
	let dec = localize("num.dec", "Decimal  Number");
	let bin = localize("num.bin", "Binary  Number");
	let s = "(" + (base === 16 ? hex : base === 8 ? oct : base === 10 ? dec : bin) + ") " + word + ":\n\n";
	s += " `DEC`: " + value.toString(10) + "D\n\n";
	s += " `HEX`: " + value.toString(16) + "H\n\n";
	s += " `OCT`: " + value.toString(8) + "Q\n\n";
	s += " `BIN`: " + value.toString(2) + "B\n\n";
	let a = asciiname[value];
	if (a) { s += " `ASCII`: " + a; }
	return s;
}
export function getcharMsg(char: string) {
	let value = char.charCodeAt(0);
	let s = "(ASCII) '" + char + "'\n\n";
	s += " `DEC`: " + value.toString(10) + "D\n\n";
	s += " `HEX`: " + value.toString(16) + "H\n\n";
	s += " `OCT`: " + value.toString(8) + "Q\n\n";
	s += " `BIN`: " + value.toString(2) + "B\n\n";
	return s;
}
enum KeywordType {
	MacroLabel, File, Instruction, Register, PreCompileCommand, MemoryAllocation, SavedWord, Size, Variable, Procedure, Structure, Macro, Label, Segment
}
export function getType(type: KeywordType): string {
	switch (type) {
		case KeywordType.Instruction:
			return localize("keykind.Command", "(Opcode mnemonics)");
		case KeywordType.MemoryAllocation:
			return localize("keykind.Memory", "(Data definitions)");
		case KeywordType.PreCompileCommand:
			return localize("keykind.Instruction", "(Assembly directives)");
		case KeywordType.Register:
			return localize("keykind.Register", "(Register)");
		case KeywordType.SavedWord:
			return localize("keykind.Saved", "(Saved)");
		case KeywordType.Size:
			return localize("keykind.Size", "(Size)");
		case KeywordType.Label:
			return localize("keykind.Label", "(Label)");
		case KeywordType.Macro:
			return localize("keykind.Macro", "(Macro)");
		case KeywordType.Procedure:
			return localize("keykind.Procedure", "(Procedure)");
		case KeywordType.Structure:
			return localize("keykind.Structure", "(Structure)");
		case KeywordType.Variable:
			return localize("keykind.Variable", "(Variable)");
		case KeywordType.Segment:
			return localize("keykind.Segment", "(Segment)");
	}
	return "(Unknown)";
}