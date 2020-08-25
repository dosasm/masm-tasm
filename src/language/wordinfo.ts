import * as vscode from 'vscode';
import * as nls from 'vscode-nls'
const localize = nls.loadMessageBundle()
let symbols: TasmSymbol[] = []//record symbols in the doc in a simple way
let _documentText: string | undefined//record the processing document
let _docUri: vscode.Uri | undefined
let asmline: Asmline[] = []//split and analyse the document
let docsymbol: vscode.DocumentSymbol[] = []//record symbols in the doc in a VSCode way

export function getrefer(word: string, doc: vscode.TextDocument): vscode.Location[] {
	let output: vscode.Location[] = []
	let r: vscode.Range, skip: boolean = false
	let def = findSymbol(word)
	if (def?.location) {
		output.push(def.location)
		asmline.forEach(
			(item, index) => {
				switch (item.type) {
					case linetype.macro: skip = true; break
					case linetype.endm: skip = false; break
					case linetype.label:
						if (skip === false) {
							//TODO：优化匹配方式，对于变量应该考虑多种复杂的表达式如：查找var不能找到nvar，对注释信息进行对齐
							if (def?.type === symboltype.variable && item.operand?.includes(word)) {
								let start = item.str.indexOf(word)
								r = new vscode.Range(index, start, index, start + word.length)
							}
							else if (def?.type === symboltype.macro && item.operator === word) {
								let start = item.str.indexOf(word)
								r = new vscode.Range(index, start, index, start + word.length)
							}
							else if ((def?.type === symboltype.procedure || def?.type === symboltype.label) && item.operand === word) {
								let start = item.str.indexOf(word)
								r = new vscode.Range(index, start, index, start + word.length)
							}
							if (r) output.push(new vscode.Location(doc.uri, r))
						}
						else {

						}

				}
			}
		)
	}
	return output
}
export function codeformatting(doc: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
	let formator: vscode.TextEdit[] = []
	scanDocumnt(doc)
	console.log(asmline)
	if(docsymbol.length===0){
		formator=formateline(0,asmline.length,doc,formator)
	}
		else docsymbol.forEach(
		(item)=>{
			formator=formateline(item.range.start.line,item.range.end.line,doc,formator)
		}
	)
	return formator
}
function  formateline(beg:number,end:number,document: vscode.TextDocument,formator:vscode.TextEdit[]):vscode.TextEdit[]{
	let namesize: number = 0, optsize: number = 0, oprsize: number = 0,
	str: string | undefined = undefined,r: vscode.Range,i:number
//scan the asmlines for information
	for(i=beg;i<end;i++)
	{	let item=asmline[i]
		if (item.name) namesize = item.name.length > namesize ? item.name.length : namesize//find the maxlength of label name or variabel name
		if (item.operator) optsize = item.operator.length > optsize ? item.operator.length : optsize//find the maxlength of operator 
		if (item.operand) oprsize = item.operand.length > oprsize ? item.operand.length : oprsize//find the maxlength of operand
	}
	for(i=beg;i<end;i++)
	{
		let item=asmline[i]
		if (item.type === linetype.label || item.type === linetype.variable) {
			str = "\t"
			let length: number = 0
			if (item.name?.length) length = item.name.length
			if (item.type === linetype.label && item.name) str += item.name + ":"
			else if (item.type === linetype.variable && item.name) str += item.name + " "
			else str += " "
			for (let i = 0; i < namesize - length; i++) str += " "//标签变量名前补充空格
			str += item.operator
			if(item.operator?.length) length=item.operator.length
			else length=0
			for(let i=0;i<optsize-length;i++) str+=" "//操作码后补充空格
			str += " "+ item.operand
			if(item.operand?.length) length=item.operand.length
			else length=0
			for(let i=0;i<oprsize-length;i++) str+=" "//操作数后补充空格
			if (item.comment) str += "\t" + item.comment
		}
		else {
			str = item.str.replace(/\s+/, " ")
			if(item.type===linetype.proc || item.type===linetype.endp) str="\t"+str
		}
		if (str && str !== item.str) {
			r = new vscode.Range(item.line, 0, item.line, item.str.length)
			formator.push(vscode.TextEdit.replace(document.validateRange(r), str))
		}
	}
	return formator
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
	let output = vscode.SymbolKind.Null
	switch (a) {
		case symboltype.macro: output = vscode.SymbolKind.Module; break;
		case symboltype.segment: output = vscode.SymbolKind.Class; break;
		case symboltype.procedure: output = vscode.SymbolKind.Function; break;
		case symboltype.struct: output = vscode.SymbolKind.Struct; break;
		case symboltype.label: output = vscode.SymbolKind.Key; break;
		case symboltype.variable: output = vscode.SymbolKind.Variable; break;
	}
	return output
}
class TasmSymbol {
	type: symboltype
	name: string
	location: vscode.Location | undefined
	ref: vscode.Location[] | undefined
	constructor(type: number, name: string, RangeorPosition: vscode.Range | vscode.Position) {
		this.type = type
		this.name = name
		if (_docUri) this.location = new vscode.Location(_docUri, RangeorPosition)
	}
	public markdown(): vscode.MarkdownString {
		let md = new vscode.MarkdownString()
		let typestr: string = " "
		switch (this.type) {
			case symboltype.label: typestr = localize("keykind.Label", "label"); break;
			case symboltype.variable: typestr = localize("keykind.Variable", "variable"); break;
			case symboltype.procedure: typestr = localize("keykind.Procedure", "procedure"); break;
			case symboltype.struct: typestr = localize("keykind.Structure", "Structure"); break;
			case symboltype.macro: typestr = localize("keykind.Macro", "macro"); break;
			case symboltype.segment: typestr = localize("keykind.Segment", "segment"); break;
		}
		md.appendMarkdown('**' + typestr + "** " + this.name)
		return md
	}
}
export function findSymbol(word: string): TasmSymbol | undefined {
	for (let sym of symbols) {
		if (sym.name === word) {
			return sym
		}
	}
	return
}
enum linetype {
	other, macro, endm, segment, ends, struct, proc, endp, label, variable,
	end, onlycomment, labelB, variableB
}
//暂时先不支持struct因为可能会与ends（segment）冲突
class Asmline {
	type: linetype = linetype.other
	line: number
	str: string
	name: string | undefined
	index: number = 1
	comment: string | undefined
	commentIndex: number | undefined
	operator: string | undefined
	operand: string | undefined
	constructor(str: string, line: number) {
		this.line = line
		this.str = str
		let main = this.getcomment(str.split(""))//split mainbody and comment
		if (main === null) {
			if (this.comment) this.type = linetype.onlycomment
		}
		else {
			if (this.getsymbol1(main) === false)//get symbols of macros,segments,procedures
			{ this.getvarlabel(main) }//get symbols of labels,variables
		}
	}
	private getcomment(arr: string[]): string | null {
		let i: number, quoted: boolean = false, index: number | undefined
		let main: string | null = null
		for (i = 0; i < arr.length; i++) {
			if (arr[i] === "'") {
				if (quoted) quoted = false
				else quoted = true
			}
			if (arr[i] == ";" && quoted === false) {
				index = i
				break
			}
		}
		if (index) {
			this.comment = arr.slice(index).join("")
			this.commentIndex = index
		}
		main = arr.slice(0, index).join("").trim()
		if (main.length === 0) main = null
		return main
	}
	private getsymbol1(str: string): boolean {
		let r: RegExpMatchArray | null = null, name: string | undefined
		let flag: boolean = false
		r = str.match(/^\s*(\w+)\s+(\w+)\s*/)
		let type1: linetype | undefined
		if (r) {
			switch (r[2].toUpperCase()) {
				case 'MACRO': type1 = linetype.macro; break;
				case 'SEGMENT': type1 = linetype.segment; break;
				case 'PROC': type1 = linetype.proc; break;
				case 'ENDS': type1 = linetype.ends; break;
				case 'ENDP': type1 = linetype.endp; break
			}
			if (type1) name = r[1]
			if (r[1].toLowerCase() === 'end') {
				type1 = linetype.end
				name = r[2]
			}
		}
		//match the end of macro
		else if (r = str.match(/(endm|ENDM)/)) {
			type1 = linetype.endm
			name = r[1]
		}
		//match the simplified segment definition
		else if (r = str.match(/^\s*\.([a-zA-Z_@?$]\w+)\s*$/)) {
			type1 = linetype.segment
			name = r[1]
		}
		if (type1 && name) {
			this.type = type1
			this.index = str.indexOf(name)
			this.name = name
			flag = true
		}
		return flag
	}
	private getvarlabel(item: string) {
		let r = item.match(/^\s*(\w+\s+|)([dD][bBwWdDfFqQtT]|=|EQU|equ)(\s+.*)$/)
		let name: string | undefined
		if (r) {
			name = r[1].trim()
			this.type = linetype.variable
			if (name.length !== 0) {
				this.name = name
				let start = item.indexOf(r[1])
				let one: TasmSymbol = new TasmSymbol(symboltype.variable, name, new vscode.Position(this.line, start))
				symbols.push(one)
			}
			this.operator = r[2]
			this.operand = r[3].trim()
		}
		else if (r= item.match(/^\s*(\w+\s*:|)\s*(\w+|)(\s+.*|)$/)) {
			name = r[1]
			this.type = linetype.label
			if (name.length !== 0) {
				this.name = name.slice(0, name.length - 1).trim()
				let start = item.indexOf(r[1])
				let one: TasmSymbol = new TasmSymbol(symboltype.label, this.name, new vscode.Position(this.line, start))
				symbols.push(one)
			}
			this.operator = r[2]
			this.operand = r[3].trim()
		}

		
	}
	public varlabelsymbol(): vscode.DocumentSymbol | undefined {
		let vscsymbol: vscode.DocumentSymbol | undefined
		let name = this.name
		if (name && (this.type === linetype.variable || this.type === linetype.label)) {
			let kind: vscode.SymbolKind, range: vscode.Range, srange: vscode.Range
			range = new vscode.Range(this.line, 0, this.line, this.str.length)
			let start = this.str.indexOf(name)
			srange = new vscode.Range(this.line, start, this.line, start + name.length)
			if (this.type === linetype.label) {
				kind = SymbolVSCfy(symboltype.label)
				vscsymbol = new vscode.DocumentSymbol(name, " ", kind, range, srange)
			}
			else if (this.type === linetype.variable) {
				kind = SymbolVSCfy(symboltype.variable)
				vscsymbol = new vscode.DocumentSymbol(name, " ", kind, range, srange)
			}
		}

		return vscsymbol
	}
	public selectrange() {
		if (this.name && this.index) return new vscode.Range(this.line, this.index, this.line, this.index + this.name?.length)
	}
}

function sacnDoc(document: vscode.TextDocument) {
	_documentText = document.getText(); _docUri = document.uri
	symbols = []; asmline = []
	let splitor: string = '\r\n'
	if (document.eol === vscode.EndOfLine.LF) splitor = '\n'
	let doc = _documentText.split(splitor)
	// scan the document for necessary information
	let docsymbol: vscode.DocumentSymbol[] = []
	doc.forEach(
		(item, index) => {
			asmline.push(new Asmline(item, index))
		}
	)
}
function symboltree() {
	docsymbol=[]
	let i: number
	//寻找段，宏指令信息
	asmline.forEach(
		(line, index, array) => {
			//是否为宏指令
			if (line.type === linetype.macro) {
				let line_endm: Asmline | undefined
				//寻赵宏指令结束的位置
				for (i = index; i < asmline.length; i++) {
					if (array[i].type === linetype.endm) {
						line_endm = array[i]
						break
					}
				}
				//找到宏指令结束标志
				if (line.name && line_endm?.line) {
					let macrorange = new vscode.Range(line.line, line.index, line_endm?.line, line_endm?.index)
					symbols.push(new TasmSymbol(symboltype.macro, line.name, macrorange))
					let symbol1 = new vscode.DocumentSymbol(line.name + ": " + getType(KeywordType.Macro), " ", SymbolVSCfy(symboltype.macro), macrorange, new vscode.Range(line.line, line.index, line.line, line.index + line.name.length))
					docsymbol.push(symbol1)
				}
			}
			else if (line.type === linetype.segment) {
				let line_ends: Asmline | undefined//the line information of the endline of the segment
				let proc: Asmline | undefined//the procedure finding
				let procschild: vscode.DocumentSymbol[] = []
				//finding the end of segment line.name and collecting information of procedure 
				for (i = index; i < asmline.length; i++) {
					//find proc
					if (array[i].type === linetype.proc) {
						proc = array[i]
					}
					//finding the end of proc
					if (array[i].type === linetype.endp && proc?.name === array[i].name) {
						let _name = array[i].name
						if (proc?.name && _name) {
							let range: vscode.Range = new vscode.Range(proc?.line, proc?.index, array[i].line, array[i].index + _name.length)
							let srange: vscode.Range = new vscode.Range(proc.line, proc.index, proc?.line, proc?.index + proc?.name?.length)
							procschild.push(new vscode.DocumentSymbol(proc?.name, asmline[proc?.line].str, SymbolVSCfy(symboltype.procedure), range, srange))
							symbols.push(new TasmSymbol(symboltype.procedure, _name, range))
						}
					}
					//finding the end of segment
					if (array[i].type === linetype.ends && array[i].name === line.name) {
						line_ends = array[i]
						break
					}
					//if finding another start of segment, also view as end of the finding segment
					if (array[i + 1].type === linetype.segment || array[i + 1].type === linetype.end) {
						line_ends = array[i]
						break
					}
				}
				//finded the end of segment
				if (line.name && line_ends?.line) {
					let range = new vscode.Range(line.line, line.index, line_ends?.line, line_ends?.index)
					symbols.push(new TasmSymbol(symboltype.segment, line.name, range))
					let symbol1 = new vscode.DocumentSymbol(line.name + ": " + getType(KeywordType.Segment), " ", SymbolVSCfy(symboltype.segment), range, new vscode.Range(line.line, line.line, line.line, line.line + line.name.length))
					symbol1.children = procschild
					docsymbol.push(symbol1)
				}
			}
		}
	)
	//寻找变量，标号信息
	docsymbol.forEach(
		(item) => {
			//将宏指令范围内的变量和标号添加到宏
			if (item.kind == SymbolVSCfy(symboltype.macro)) {
				let symbol3: vscode.DocumentSymbol | undefined
				for (i = item.range.start.line; i <= item.range.end.line; i++) {
					symbol3 = asmline[i].varlabelsymbol()
					if (symbol3) item.children.push(symbol3)
				}
			}
			//将变量，标号添加到逻辑段和子程序
			else if (item.kind == SymbolVSCfy(symboltype.segment)) {
				let symbol2: vscode.DocumentSymbol | undefined
				item.children.forEach(
					(item2, index, array) => {
						for (i = item2.range.start.line; i <= item2.range.end.line; i++) {
							let symbol3 = asmline[i].varlabelsymbol()
							if (symbol3) item2.children.push(symbol3)
						}
					},
				)
				for (i = item.range.start.line + 1; i < item.range.end.line; i++) {
					symbol2 = asmline[i].varlabelsymbol()
					if (symbol2) item.children.push(symbol2)
				}
			}
		}
	)

}
export function scanDocumnt(doc?: vscode.TextDocument): vscode.DocumentSymbol[] {
	if (doc && (doc.getText() !== _documentText || doc.uri !== _docUri)) {
		sacnDoc(doc)
		symboltree()
	}
	return docsymbol
}


// part two offer imformation for keyword and number(char)
const possibleNumbers: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

export function isNumberStr(str: string): boolean {
	if (!str.startsWith('0') && !str.startsWith('1') && !str.startsWith('2') && !str.startsWith('3')
		&& !str.startsWith('4') && !str.startsWith('5') && !str.startsWith('6') && !str.startsWith('7')
		&& !str.startsWith('8') && !str.startsWith('9')) {
		return false;
	}
	let sub: number = (str.endsWith('h') || str.endsWith('b') || str.endsWith('q') || str.endsWith('d')) ? 1 : 0;
	for (let i = 1; i < str.length - sub; i++) {
		const char = str[i];
		if (possibleNumbers.indexOf(char, 0) <= -1) {
			return false;
		}
	}
	return true;
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
]
export function getNumMsg(word: string) {
	let base: number = word.endsWith('h') ? 16 : word.endsWith('q') ? 8 : word.endsWith('b') ? 2 : 10;
	var value: number = Number.parseInt(word, base);
	var s = "(" + (base === 16 ? "Hexadecimal" : base === 8 ? "Octal" : base === 10 ? "Decimal" : "Binary") + " Number) " + word + ":\n\n";
	s += " `DEC`: " + value.toString(10) + "D\n\n";
	s += " `HEX`: " + value.toString(16) + "H\n\n";
	s += " `OCT`: " + value.toString(8) + "Q\n\n";
	s += " `BIN`: " + value.toString(2) + "B\n\n";
	let a = asciiname[value]
	if (a) s += " `ASCII`: " + a;
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
enum AllowKinds {
	Memory, Variables, Constants, All, Size, None, Inst, Macro, Label, Interrupt
}
enum KeywordType {
	MacroLabel, File, Instruction, Register, PreCompileCommand, MemoryAllocation, SavedWord, Size, Variable, Method, Structure, Macro, Label, Segment
}
class KeywordDef {
	opCount: number;
	name: string;
	def: string;
	data: string;
	type: KeywordType;
	allowType: AllowKinds;
	alias: string[] | undefined
	/**
	 * 注册关键字相关的信息
	 * @param name string关键字名称
	 * @param def string定义 描述
	 * @param type keywordType类型
	 * @param data syntax等提示信息
	 * @param count 操作数个数
	 * @param allow 允许接的操作数类型
	 */
	constructor(name: string, def: string, type: KeywordType = KeywordType.Instruction, data?: string, count: number = 2, allow?: AllowKinds, alias?: string[]) {
		this.name = name
		this.alias = alias
		if (data !== undefined) {
			this.data = data;
		} else {
			this.data = name + " [operand], [operand]";
		}

		if (allow === undefined) {
			this.allowType = AllowKinds.Inst;
		} else {
			this.allowType = allow;
		}
		this.opCount = count
		this.type = type
		this.def = def
	}
	public markdown(): vscode.MarkdownString {
		let md = new vscode.MarkdownString(getType(this.type) + " **" + this.name + "**\n\n")
		md.appendMarkdown(this.def + "\n\n")
		if (this.alias) {
			let msg = localize("keyword.alias", "alias: ")
			let i: number
			for (i = 0; i < this.alias.length - 1; i++) {
				msg += "`" + this.alias[i] + "`,"
			}
			msg += "`" + this.alias[i] + "`"
			md.appendMarkdown(msg)
		}
		md.appendCodeblock("Syntax: " + this.data)
		return md
	}
}

const KEYWORD_DICONTARY: Array<KeywordDef> = [
	//Sizes
	new KeywordDef("small", localize("keyword.compact", "128KB"), KeywordType.Size, "small", 0),
	new KeywordDef("tiny", localize("keyword.compact", "64KB"), KeywordType.Size, "tiny", 0),
	new KeywordDef("compact", localize("keyword.compact", "640KB"), KeywordType.Size, "compact", 0),
	new KeywordDef("huge", localize("keyword.compact", "640KB"), KeywordType.Size, "huge", 0),
	new KeywordDef("medium", localize("keyword.medium", "640KB"), KeywordType.Size, "medium", 0),
	new KeywordDef("large", localize("keyword.large", "640KB"), KeywordType.Size, "large", 0),
	new KeywordDef("flat", localize("keyword.flat", "4GB (Not supported with TASM)"), KeywordType.Size, "flat", 0),
	new KeywordDef("stdcall", localize("keyword.stdcall", "Can be included in another file"), KeywordType.Size, "stdcall", 0),
	//Registers 8
	new KeywordDef("al", localize("keyword.al", "The lower byte of ax"), KeywordType.Register, "al", 0),
	new KeywordDef("ah", localize("keyword.ah", "The upper byte of ax"), KeywordType.Register, "ah", 0),
	new KeywordDef("bl", localize("keyword.bl", "The lower byte of bx"), KeywordType.Register, "bl", 0),
	new KeywordDef("bh", localize("keyword.bh", "The upper byte of bx"), KeywordType.Register, "bh", 0),
	new KeywordDef("cl", localize("keyword.cl", "The lower byte of cx"), KeywordType.Register, "cl", 0),
	new KeywordDef("ch", localize("keyword.ch", "The upper byte of cx"), KeywordType.Register, "ch", 0),
	new KeywordDef("dl", localize("keyword.dl", "The lower byte of dx"), KeywordType.Register, "dl", 0),
	new KeywordDef("dh", localize("keyword.dh", "The upper byte of dx"), KeywordType.Register, "dh", 0),
	//Registers 16
	new KeywordDef("ax", localize("keyword.ax", "16 bit register used with arithmatic operations"), KeywordType.Register, "ax", 0),
	new KeywordDef("bx", localize("keyword.bx", "16 bit register used to acess memory data"), KeywordType.Register, "bx", 0),
	new KeywordDef("cx", localize("keyword.cx", "16 bit register used with loops"), KeywordType.Register, "cx", 0),
	new KeywordDef("dx", localize("keyword.dx", "16 bit register used with data mangment"), KeywordType.Register, "dx", 0),
	new KeywordDef("sp", localize("keyword.sp", "16 bit register that points at the stack"), KeywordType.Register, "sp", 0),
	new KeywordDef("bp", localize("keyword.bp", "16 bit register that is used to pass arguments"), KeywordType.Register, "bp", 0),
	new KeywordDef("di", localize("keyword.di", "16 bit register used to acess memory data"), KeywordType.Register, "di", 0),
	new KeywordDef("si", localize("keyword.si", "16 bit register used to acess memory data"), KeywordType.Register, "si", 0),
	//Registers 32
	new KeywordDef("eax", localize("keyword.eax", "32 bit register used with arithmatic operations"), KeywordType.Register, "eax", 0),
	new KeywordDef("ebx", localize("keyword.ebx", "32 bit register used to acess memory data"), KeywordType.Register, "ebx", 0),
	new KeywordDef("ecx", localize("keyword.ecx", "32 bit register used with loops"), KeywordType.Register, "ecx", 0),
	new KeywordDef("edx", localize("keyword.edx", "32 bit register used with data mangment"), KeywordType.Register, "edx", 0),
	new KeywordDef("esp", localize("keyword.esp", "32 bit register that points at the stack"), KeywordType.Register, "esp", 0),
	new KeywordDef("ebp", localize("keyword.ebp", "32 bit register that is used to pass arguments"), KeywordType.Register, "ebp", 0),
	new KeywordDef("edi", localize("keyword.edi", "32 bit register used to acess memory data"), KeywordType.Register, "edi", 0),
	new KeywordDef("esi", localize("keyword.esi", "32 bit register used to acess memory data"), KeywordType.Register, "esi", 0),
	//Registers 64
	new KeywordDef("rax", localize("keyword.rax", "64 bit register used with arithmatic operations"), KeywordType.Register, "rax", 0),
	new KeywordDef("rbx", localize("keyword.rbx", "64 bit register used to acess memory data"), KeywordType.Register, "rbx", 0),
	new KeywordDef("rcx", localize("keyword.rcx", "64 bit register used with loops"), KeywordType.Register, "rcx", 0),
	new KeywordDef("rdx", localize("keyword.rdx", "64 bit register used with data mangment"), KeywordType.Register, "rdx", 0),
	new KeywordDef("rsp", localize("keyword.rsp", "64 bit register that points at the stack"), KeywordType.Register, "rsp", 0),
	new KeywordDef("rbp", localize("keyword.rbp", "64 bit register that is used to pass arguments"), KeywordType.Register, "rbp", 0),
	new KeywordDef("rdi", localize("keyword.rdi", "64 bit register used to acess memory data"), KeywordType.Register, "rdi", 0),
	new KeywordDef("rsi", localize("keyword.rsi", "64 bit register used to acess memory data"), KeywordType.Register, "rsi", 0),
	//Memory alloaction
	new KeywordDef("db", localize("keyword.db", "Allocates a byte of memory"), KeywordType.MemoryAllocation, "[name] db [value]"),
	new KeywordDef("dw", localize("keyword.dw", "Allocates 2 byte of memory (Word)"), KeywordType.MemoryAllocation, "[name] dw [value]"),
	new KeywordDef("dd", localize("keyword.dd", "Allocates 4 byte of memory (Double Word)"), KeywordType.MemoryAllocation, "[name] dd [value]"),
	new KeywordDef("dq", localize("keyword.dq", "Allocates 8 byte of memory (Quad Word)"), KeywordType.MemoryAllocation, "[name] dq [value]"),
	new KeywordDef("dt", localize("keyword.dt", "Allocates 10 byte of memory "), KeywordType.MemoryAllocation, "[name] dt [value]"),
	//Memory locating
	new KeywordDef("byte", localize("keyword.byte", "Locates 1 byte of memory"), KeywordType.MemoryAllocation, "byte", -1),
	new KeywordDef("word", localize("keyword.word", "Locates 2 byte of memory (Word)"), KeywordType.MemoryAllocation, "word", -1),
	new KeywordDef("dword", localize("keyword.dword", "Locates 4 byte of memory (Double Word)"), KeywordType.MemoryAllocation, "dword", -1),
	new KeywordDef("qword", localize("keyword.qword", "Locates 8 byte of memory (Quad Word)"), KeywordType.MemoryAllocation, "qword", -1),
	new KeywordDef("tbyte", localize("keyword.tbyte", "Locates 10 byte of memory "), KeywordType.MemoryAllocation, "tbyte", -1),
	//Segemts
	new KeywordDef("cs", localize("keyword.cs", "Code segement address"), KeywordType.Register, "cs", 0),
	new KeywordDef("ss", localize("keyword.ss", "Stack segement address"), KeywordType.Register, "ss", 0),
	new KeywordDef("ds", localize("keyword.ds", "Data segement address"), KeywordType.Register, "ds", 0),
	new KeywordDef("es", localize("keyword.es", "Extra segement address"), KeywordType.Register, "es", 0),
	//Saved
	new KeywordDef("DATASEG", localize("keyword.DATASEG", "Start of the data segment"), KeywordType.SavedWord, "DATASEG", 0),
	new KeywordDef("IDEAL", localize("keyword.IDEAL", " "), KeywordType.SavedWord, "IDEAL", 0),
	new KeywordDef("CODESEG", localize("keyword.CODESEG", "Start of the code segment"), KeywordType.SavedWord, "CODESEG", 0),
	new KeywordDef("MODEL", localize("keyword.MODEL", "Defines the scope of the file"), KeywordType.SavedWord, "MODEL [size]", 1, AllowKinds.Size),
	new KeywordDef("STACK", localize("keyword.STACK", "Sets the size of the stack"), KeywordType.SavedWord, "STACK [constant]", 1, AllowKinds.Constants),
	//Basics
	new KeywordDef("mov", localize("keyword.mov", "Moves value from adress/constant/register to a register or adress.")),
	new KeywordDef("int", localize("keyword.int", "Interrupt call see [list]( https://github.com/xsro/masm-tasm/wiki/interrupt_en)"), KeywordType.Instruction, "int [interruptIndex]", 1, AllowKinds.Constants),
	new KeywordDef("into", localize("keyword.into", "Trap into overflow flag"), KeywordType.Instruction, "into", 1, AllowKinds.Constants),
	new KeywordDef("nop", localize("keyword.nop", "Do nothing"), KeywordType.Instruction, "nop", 0),
	new KeywordDef("hlt", localize("keyword.hlt", "Enters halt mode"), KeywordType.Instruction, "hlt", 0),
	new KeywordDef("iret", localize("keyword.iret", " "), KeywordType.Instruction, "iret", 1, AllowKinds.Constants),
	new KeywordDef("cmp", localize("keyword.cmp", "Compares the 2 operands."), KeywordType.Instruction, "cmp [operand], [operand]"),
	new KeywordDef("include", localize("keyword.include", "Includes a file in this file"), KeywordType.PreCompileCommand, "include [fileName]", 1),
	new KeywordDef("in", localize("keyword.in", "Reads data from a port")),
	new KeywordDef("out", localize("keyword.out", "Writes data to a port")),
	//Logic
	new KeywordDef("or", localize("keyword.or", "Or operation on 2 registers.")),
	new KeywordDef("and", localize("keyword.and", "And operation on 2 registers.")),
	new KeywordDef("xor", localize("keyword.xor", "Xor operation on 2 register")),
	new KeywordDef("shl", localize("keyword.shl", "Moves all the bits to the left by the second operand.")),
	new KeywordDef("xchg", localize("keyword.xchg", "Exchages regeter or memeory address with register.")),
	new KeywordDef("xadd", localize("keyword.xadd", "Exchages regeter or memeory address with register and the summary is moved to SI.")),
	new KeywordDef("cmpxchg", localize("keyword.cmpxchg", "cmp + xchg.")),
	new KeywordDef("rcl", localize("keyword.rcl", "Rotates left (Carry).")),
	new KeywordDef("rcl", localize("keyword.rcl", "Rotates left (Carry).")),
	new KeywordDef("rcr", localize("keyword.rcr", "Rotates right (Carry).")),
	new KeywordDef("rol", localize("keyword.rol", "Rotates left.")),
	new KeywordDef("ror", localize("keyword.ror", "Rotates right.")),
	new KeywordDef("shld", localize("keyword.shld", "Double precesion shift left.")),
	new KeywordDef("sal", localize("keyword.sal", "Moves all the bits to the left by the second operand. (Signed)")),
	new KeywordDef("lea", localize("keyword.lea", "Moves the memory address of operand 2 to operand 1."), KeywordType.Instruction, undefined, 2, AllowKinds.Variables | AllowKinds.Memory),
	new KeywordDef("shr", localize("keyword.shr", "Moves all the bits to the right by the second operand.")),
	new KeywordDef("shrd", localize("keyword.shrd", "Double precesion shift right.")),
	new KeywordDef("sar", localize("keyword.sar", "Moves all the bits to the right by the second operand. (Unsigned)")),
	new KeywordDef("not", localize("keyword.not", "Flips all the bits of the operand"), KeywordType.Instruction, "not [operand]", 1),
	//Flags
	new KeywordDef("lahf", localize("keyword.lahf", "Move flags to ah (SF:ZF:xx:AF:xx:PF:xx:CF)"), KeywordType.Instruction, "lahf", 0),
	new KeywordDef("sahf", localize("keyword.sahf", "Move ah to flags (SF:ZF:xx:AF:xx:PF:xx:CF)"), KeywordType.Instruction, "sahf", 0),
	new KeywordDef("std", localize("keyword.std", "Set direction flag CF=1"), KeywordType.Instruction, "std", 0),
	new KeywordDef("cld", localize("keyword.cld", "Clear direction flag DF=0"), KeywordType.Instruction, "cld", 0),
	new KeywordDef("sti", localize("keyword.sti", "Set interrupt flag IF=1"), KeywordType.Instruction, "sti", 0),
	new KeywordDef("cli", localize("keyword.cli", "Clear interrupt flag IF=0"), KeywordType.Instruction, "cli", 0),
	new KeywordDef("stc", localize("keyword.stc", "Set carry flag CF=1"), KeywordType.Instruction, "stc", 0),
	new KeywordDef("clc", localize("keyword.clc", "Clear carry flag CF=0"), KeywordType.Instruction, "clc", 0),
	new KeywordDef("cmc", localize("keyword.cmc", "Complement carry flag CF=!CF"), KeywordType.Instruction, "cmc", 0),
	//Structures
	new KeywordDef("proc", localize("keyword.proc", "Creates a new procedure"), KeywordType.PreCompileCommand, "proc [name]", 1),
	new KeywordDef("endp", localize("keyword.endp", "Ends a procedure defenition"), KeywordType.PreCompileCommand, "endp [name]", 1),
	new KeywordDef("struc", localize("keyword.struc", "Creates a new structure"), KeywordType.PreCompileCommand, "struc [name]", 1),
	new KeywordDef("struct", localize("keyword.struct", "Creates a new structure (Not supported)"), KeywordType.PreCompileCommand, "struct [name]", 1),
	new KeywordDef("ends", localize("keyword.ends", "Ends a structure defenition"), KeywordType.PreCompileCommand, "ends [name]", 1),
	new KeywordDef("macro", localize("keyword.macro", "Creates a new macro"), KeywordType.PreCompileCommand, "macro [name]", 1),
	new KeywordDef("endm", localize("keyword.endm", "Ends a macro defenition"), KeywordType.PreCompileCommand, "endm [name]", 1),
	new KeywordDef("equ", localize("keyword.equ", "Replaces all instances of name with value"), KeywordType.PreCompileCommand, "[name] equ [value]", 2),
	new KeywordDef("dup", localize("keyword.dup", "Allocates values count times"), KeywordType.PreCompileCommand, "[count] dup([values])", 1),
	new KeywordDef("end", localize("keyword.end", "Ends the file"), KeywordType.PreCompileCommand, "end [label]", 1),
	//If and macros
	new KeywordDef("label", localize("keyword.label", "Simple macro"), KeywordType.PreCompileCommand, "label [name] [value]", 2, AllowKinds.None),
	new KeywordDef("         local", localize("keyword.local", "Create local data or labels"), KeywordType.PreCompileCommand, "local [args]...", -1, AllowKinds.None),
	new KeywordDef("if", localize("keyword.if", "Compares a value to zero"), KeywordType.PreCompileCommand, "if [operand]", 1, AllowKinds.Variables),
	new KeywordDef("ife", localize("keyword.ife", "If the value is not zero"), KeywordType.PreCompileCommand, "ife [operand]", 1, AllowKinds.Variables),
	new KeywordDef("ifb", localize("keyword.ifb", " "), KeywordType.PreCompileCommand, "ifb <[operand]>", 1, AllowKinds.Variables),
	new KeywordDef("ifnb", localize("keyword.ifnb", " "), KeywordType.PreCompileCommand, "ifnb <[operand]>", 1, AllowKinds.Variables),
	new KeywordDef("ifdef", localize("keyword.ifdef", "If the argument exsits"), KeywordType.PreCompileCommand, "ifdef [operand]", 1, AllowKinds.Variables),
	new KeywordDef("ifndef", localize("keyword.ifndef", "If the argument doesn't exsits"), KeywordType.PreCompileCommand, "ifndef [operand]", 1, AllowKinds.Variables),
	new KeywordDef("ifdif", localize("keyword.ifdif", "If the arguments are diffrent"), KeywordType.PreCompileCommand, "ifdif [operand], [operand]", 2, AllowKinds.Variables),
	new KeywordDef("ifndif", localize("keyword.ifndif", "If the arguments are identical"), KeywordType.PreCompileCommand, "ifndif [operand], [operand]", 2, AllowKinds.Variables),
	new KeywordDef("if1", localize("keyword.if1", " "), KeywordType.PreCompileCommand, "if1", 0, AllowKinds.Variables),
	new KeywordDef("if2", localize("keyword.if2", " "), KeywordType.PreCompileCommand, "if2", 0, AllowKinds.Variables),
	new KeywordDef("rept", localize("keyword.rept", "Repeats an action a ciretien of times"), KeywordType.PreCompileCommand, "rept [operand]", 1, AllowKinds.Variables),
	new KeywordDef("irp", localize("keyword.irp", " "), KeywordType.PreCompileCommand, "rept [operand] <[operands]>", 2, AllowKinds.Variables),
	new KeywordDef("endif", localize("keyword.endif", "Closes an if statement"), KeywordType.PreCompileCommand, "endif", 0, AllowKinds.None),
	new KeywordDef("else", localize("keyword.else", "Accurs if the if statement before didn't"), KeywordType.PreCompileCommand, "else", 0, AllowKinds.None),
	//Other pcc
	new KeywordDef("width", localize("keyword.width", " "), KeywordType.SavedWord, "width", 0),
	new KeywordDef("this", localize("keyword.this", " "), KeywordType.SavedWord, "this", 0),
	new KeywordDef("times", localize("keyword.times", " "), KeywordType.SavedWord, "times", 0),
	new KeywordDef("length", localize("keyword.length", " "), KeywordType.SavedWord, "length", 0),
	new KeywordDef("le", localize("keyword.le", " "), KeywordType.SavedWord, "le", 0),
	new KeywordDef("ge", localize("keyword.ge", " "), KeywordType.SavedWord, "ge", 0),
	//Math
	new KeywordDef("add", localize("keyword.add", "Adds the second operand to the first one.")),
	new KeywordDef("sub", localize("keyword.sub", "Subtracts the second operand from the first one.")),
	new KeywordDef("inc", localize("keyword.inc", "Adds 1 to the operand."), KeywordType.Instruction, "inc [operand]", 1),
	new KeywordDef("dec", localize("keyword.dec", "Subtracts 1 from the operand."), KeywordType.Instruction, "dec [operand]", 1),
	new KeywordDef("neg", localize("keyword.neg", "Negates the value of the operand."), KeywordType.Instruction, "neg [operand]", 1),
	new KeywordDef("abs", localize("keyword.abs", "Turns the value to a positive value. (Not supported)"), KeywordType.Instruction, "abs [operand]", 1),
	new KeywordDef("mul", localize("keyword.mul", "Multiplies ax by the operand (Unsigned)."), KeywordType.Instruction, "mul [operand]", 1),
	new KeywordDef("imul", localize("keyword.imul", "Multiplies ax by the operand (Signed)."), KeywordType.Instruction, "imul [operand]", 1),
	new KeywordDef("div", localize("keyword.div", "Divides ax by the operand (Unsigned) {Mod at dx (16 bit) or ah (8 bit)}."), KeywordType.Instruction, "div [operand]", 1),
	new KeywordDef("idiv", localize("keyword.idiv", "Divides ax by the operand (Signed) {Mod at dx (16 bit) or ah (8 bit)}."), KeywordType.Instruction, "idiv [operand]", 1),
	//Deciaml
	new KeywordDef("daa", localize("keyword.daa", "After addition ajusts al to be in range of a decimal number"), KeywordType.Instruction, "daa", 0),
	new KeywordDef("das", localize("keyword.das", "After subtraction ajusts al to be in range of a decimal number"), KeywordType.Instruction, "das", 0),
	//Ascii
	new KeywordDef("aaa", localize("keyword.aaa", "Ajust al to decimal number (add/sub)"), KeywordType.Instruction, "aaa", 0),
	new KeywordDef("aas", localize("keyword.aas", "Ajust al to decimal number (add/sub)"), KeywordType.Instruction, "aas", 0),
	new KeywordDef("aam", localize("keyword.aam", "Ajust al to decimal number (mul)"), KeywordType.Instruction, "aam", 0),
	new KeywordDef("aad", localize("keyword.aad", "Ajust al to decimal number (div)"), KeywordType.Instruction, "aad", 0),
	//Coprocessor
	new KeywordDef("wait", localize("keyword.wait", "Processor suspends instruction execution until the BUSY # pin is inactive"), KeywordType.Instruction, "wait", 0),
	new KeywordDef("fwait", localize("keyword.fwait", "Processor checks for pending unmasked numeric exceptions before proceeding."), KeywordType.Instruction, "fwait", 0),
	//Stack
	new KeywordDef("push", localize("keyword.push", "pushes a value to the stack"), KeywordType.Instruction, "push [operand]", 1),
	new KeywordDef("pushf", localize("keyword.pushf", "pushes flag data to the stack"), KeywordType.Instruction, "pushf", 0),
	new KeywordDef("pushfw", localize("keyword.pushfw", "pushes flag data to the stack"), KeywordType.Instruction, "pushfw", 0),
	new KeywordDef("pushfd", localize("keyword.pushfd", "pushes flag data to the stack"), KeywordType.Instruction, "pushfd", 0),
	new KeywordDef("pop", localize("keyword.pop", "pops a value from the stack"), KeywordType.Instruction, "pop [operand]", 1),
	new KeywordDef("popf", localize("keyword.popf", "pops flag data to the stack"), KeywordType.Instruction, "popf", 0),
	new KeywordDef("popfw", localize("keyword.popfw", "pops flag data to the stack"), KeywordType.Instruction, "popfw", 0),
	new KeywordDef("popfd", localize("keyword.popfd", "pops flag data to the stack"), KeywordType.Instruction, "popfd", 0),
	new KeywordDef("pusha", localize("keyword.pusha", "pushes all register to the stack"), KeywordType.Instruction, "pusha", 0),
	new KeywordDef("popa", localize("keyword.popa", "pops all register to from the stack stack"), KeywordType.Instruction, "popa", 0),
	//Code Navigation
	new KeywordDef("jmp", localize("keyword.jmp", "jump to a part in the code"), KeywordType.Instruction, "jmp [label]", 1, AllowKinds.Label),

	new KeywordDef("jz", localize("keyword.jz", "jump if zero flag on\n\njump if equal"), KeywordType.Instruction, "jz [label]", 1, AllowKinds.Label, ["je"]),
	new KeywordDef("jnz", localize("keyword.jnz", "jump if zero flag off\n\njump if not equal"), KeywordType.Instruction, "jnz [label]", 1, AllowKinds.Label, ['jne']),
	new KeywordDef("js", localize("keyword.js", "jump if sign flag on"), KeywordType.Instruction, "js [label]", 1, AllowKinds.Label),
	new KeywordDef("jns", localize("keyword.jns", "jump if sign flag off"), KeywordType.Instruction, "jns [label]", 1, AllowKinds.Label),
	new KeywordDef("jp", localize("keyword.jp", "jump if parity flag on"), KeywordType.Instruction, "jp [label]", 1, AllowKinds.Label, ['jpe']),
	new KeywordDef("jnp", localize("keyword.jnp", "jump if parity flag off"), KeywordType.Instruction, "jnp [label]", 1, AllowKinds.Label, ['jpo']),
	new KeywordDef("jo", localize("keyword.jo", "jump if Overflow flag on"), KeywordType.Instruction, "jo [label]", 1, AllowKinds.Label),
	new KeywordDef("jno", localize("keyword.jno", "jump if Overflow flag off"), KeywordType.Instruction, "jno [label]", 1, AllowKinds.Label),

	new KeywordDef("ja", localize("keyword.ja", "jump if greater (Unsinged)"), KeywordType.Instruction, "ja [label]", 1, AllowKinds.Label, ['jnbe']),
	new KeywordDef("jna", localize("keyword.jna", "jump if less or equal(Unsinged)"), KeywordType.Instruction, "ja [label]", 1, AllowKinds.Label, ['jbe']),
	new KeywordDef("jc", localize("keyword.jc", "jump if less (Unsinged)\n\njump if carry flag on"), KeywordType.Instruction, "jc [label]", 1, AllowKinds.Label, ['jb', 'jnae']),
	new KeywordDef("jnc", localize("keyword.jnc", "jump if greater or equals(Unsigned)\n\njump if carry flag off"), KeywordType.Instruction, "jnc [label]", 1, AllowKinds.Label, ['jnb', 'jae']),

	new KeywordDef("jg", localize("keyword.jg", "jump if greater (Singed)"), KeywordType.Instruction, "jg [label]", 1, AllowKinds.Label),
	new KeywordDef("jge", localize("keyword.jge", "jump if greater or equals (Signed)"), KeywordType.Instruction, "jge [label]", 1, AllowKinds.Label),
	new KeywordDef("jl", localize("keyword.jl", "jump if less (Singed)"), KeywordType.Instruction, "jl [label]", 1, AllowKinds.Label),
	new KeywordDef("jle", localize("keyword.jle", "jump if less or equals (Signed)"), KeywordType.Instruction, "jle [label]", 1, AllowKinds.Label),

	new KeywordDef("jcxz", localize("keyword.jcxz", "jump if cx is 0"), KeywordType.Instruction, "jcxz [label]", 1, AllowKinds.Label),
	new KeywordDef("jecxz", localize("keyword.jecxz", "jump if ecx is 0"), KeywordType.Instruction, "jcxz [label]", 1, AllowKinds.Label),

	//Procs
	new KeywordDef("call", localize("keyword.call", "Calls a procedure"), KeywordType.Instruction, "call [procName]", 1),
	new KeywordDef("far", localize("keyword.far", "Turns the procedure into a far procedure"), KeywordType.SavedWord, "[procName] far", 0),
	new KeywordDef("near", localize("keyword.near", "Turns the procedure into a near procedure"), KeywordType.SavedWord, "[procName] near", 0),
	new KeywordDef("ret", localize("keyword.ret", "Returns from a procedure"), KeywordType.Instruction, "ret [op:RemoveStack]", 0),
	new KeywordDef("enter", localize("keyword.enter", "Create dynamic and nested stack"), KeywordType.Instruction, "enter [dynamic], [nesting]", 1),
	new KeywordDef("leave", localize("keyword.leave", "High level ret"), KeywordType.Instruction, "leave", 0),
	//Segement Regiser Instructions
	new KeywordDef("les", localize("keyword.les", "Load memory from ES:Pointer 1 to operand 2 from es"), KeywordType.Instruction, "les [poiner], [register]", 2, AllowKinds.Memory),
	new KeywordDef("lds", localize("keyword.lds", "Load memory from DS:Pointer 1 to operand 2 from ds"), KeywordType.Instruction, "lds [poiner], [register]", 2, AllowKinds.Memory),
	new KeywordDef("lfs", localize("keyword.lfs", "Load memory from FS:Pointer 1 to operand 2 from fs"), KeywordType.Instruction, "lfs [poiner], [register]", 2, AllowKinds.Memory),
	new KeywordDef("lgs", localize("keyword.lgs", "Load memory from GS:Pointer 1 to operand 2 from gs"), KeywordType.Instruction, "lgs [poiner], [register]", 2, AllowKinds.Memory),
	new KeywordDef("lss", localize("keyword.lss", "Load memory from SS:Pointer to operand 2 from ss"), KeywordType.Instruction, "lss [poiner], [register]", 2, AllowKinds.Memory),
	//Floating point registers
	new KeywordDef("st0", localize("keyword.st0", "Floting point register 0"), KeywordType.Register, "st0", 0),
	new KeywordDef("st1", localize("keyword.st1", "Floting point register 1"), KeywordType.Register, "st1", 0),
	new KeywordDef("st2", localize("keyword.st2", "Floting point register 2"), KeywordType.Register, "st2", 0),
	new KeywordDef("st3", localize("keyword.st3", "Floting point register 3"), KeywordType.Register, "st3", 0),
	new KeywordDef("st4", localize("keyword.st4", "Floting point register 4"), KeywordType.Register, "st4", 0),
	new KeywordDef("st5", localize("keyword.st5", "Floting point register 5"), KeywordType.Register, "st5", 0),
	new KeywordDef("st6", localize("keyword.st6", "Floting point register 6"), KeywordType.Register, "st6", 0),
	new KeywordDef("st7", localize("keyword.st7", "Floting point register 7"), KeywordType.Register, "st7", 0),
	new KeywordDef("st", localize("keyword.st", "Floting point register"), KeywordType.Register, "st", 0),
	//Test and Debug registers
	new KeywordDef("db0", localize("keyword.db0", "Debug register 0"), KeywordType.Register, "db0", 0),
	new KeywordDef("db1", localize("keyword.db1", "Debug register 1"), KeywordType.Register, "db1", 0),
	new KeywordDef("db2", localize("keyword.db2", "Debug register 2"), KeywordType.Register, "db2", 0),
	new KeywordDef("db3", localize("keyword.db3", "Debug register 3"), KeywordType.Register, "db3", 0),
	new KeywordDef("tr6", localize("keyword.tr6", "Test register 4"), KeywordType.Register, "tr6", 0),
	new KeywordDef("tr7", localize("keyword.tr7", "Test register 5"), KeywordType.Register, "tr7", 0),
	new KeywordDef("db6", localize("keyword.db6", "Debug register 6"), KeywordType.Register, "db6", 0),
	new KeywordDef("db7", localize("keyword.db7", "Debug register 7"), KeywordType.Register, "db7", 0),
	//String operations
	new KeywordDef("rep", localize("keyword.rep", "Repeat while equals"), KeywordType.Instruction, "rep [operation]", 1),
	new KeywordDef("repz", localize("keyword.repz", "Repeat while zero"), KeywordType.Instruction, "repz [operation]", 1),
	new KeywordDef("repnz", localize("keyword.repnz", "Repeat while not zero"), KeywordType.Instruction, "repnz [operation]", 1),
	new KeywordDef("xlat", localize("keyword.xlat", "Table lookup to al"), KeywordType.Instruction, "xlat", 0),
	new KeywordDef("bound", "Check the 16-bit signed array index value in the operand 1 against the doubleword with the upper and lower bounds specified by operand 2"),
	new KeywordDef("scas", localize("keyword.scas", "Compare ES:DI with AX or AL"), KeywordType.Instruction, "scas", 0),
	new KeywordDef("scasb", localize("keyword.scasb", "Compare ES:DI with AL"), KeywordType.Instruction, "scasb", 0),
	new KeywordDef("scasw", localize("keyword.scasw", "Compare ES:DI with AX"), KeywordType.Instruction, "scasw", 0),
	new KeywordDef("scasd", localize("keyword.scasd", "Compare ES:DI with EAX (Not supported)"), KeywordType.Instruction, "scasd", 0),
	new KeywordDef("cmps", localize("keyword.cmps", "Compare ES:DI with ES:SI"), KeywordType.Instruction, "cmps", 0),
	new KeywordDef("cmpsb", localize("keyword.cmpsb", "Compare ES:DI with ES:SI (Byte)"), KeywordType.Instruction, "cmpsb", 0),
	new KeywordDef("cmpsw", localize("keyword.cmpsw", "Compare ES:DI with ES:SI"), KeywordType.Instruction, "cmpsw", 0),
	new KeywordDef("cmpsd", localize("keyword.cmpsd", "Compare ES:DI with ES:SI (32 bit)"), KeywordType.Instruction, "cmpsd", 0),
	new KeywordDef("stos", localize("keyword.stos", "Sets ES:DI to AX AL"), KeywordType.Instruction, "stos", 0),
	new KeywordDef("stosb", localize("keyword.stosb", "Sets ES:DI to AL"), KeywordType.Instruction, "stosb", 0),
	new KeywordDef("stosw", localize("keyword.stosw", "Sets ES:DI to AX"), KeywordType.Instruction, "stosw", 0),
	new KeywordDef("stosd", localize("keyword.stosd", "Sets ES:DI to EAX  (Not supported)"), KeywordType.Instruction, "stosd", 0),
	new KeywordDef("lods", localize("keyword.lods", "Sets Ax to ES:DI"), KeywordType.Instruction, "lods", 0),
	new KeywordDef("lodsb", localize("keyword.lodsb", "Sets AL to ES:DI"), KeywordType.Instruction, "lodsb", 0),
	new KeywordDef("lodsw", localize("keyword.lodsw", "Sets AX to ES:DI"), KeywordType.Instruction, "lodsw", 0),
	new KeywordDef("lodsd", localize("keyword.lodsd", "Sets EAX to ES:DI 32-bit (Not supported)"), KeywordType.Instruction, "lodsd", 0),
	new KeywordDef("outs", localize("keyword.outs", " "), KeywordType.Instruction, "outs", 0),
	new KeywordDef("outsb", localize("keyword.outsb", "ES:DI -> DL"), KeywordType.Instruction, "outsb", 0),
	new KeywordDef("outsw", localize("keyword.outsw", "ES:DI -> DX"), KeywordType.Instruction, "outsw", 0),
	new KeywordDef("outsd", localize("keyword.outsd", "ES:DI -> EDX (Not supported)"), KeywordType.Instruction, "outsd", 0),
	new KeywordDef("ins", localize("keyword.ins", " "), KeywordType.Instruction, "ins", 0),
	new KeywordDef("insb", localize("keyword.insb", "ES:DI <- DL"), KeywordType.Instruction, "insb", 0),
	new KeywordDef("insw", localize("keyword.insw", "ES:DI <- DX"), KeywordType.Instruction, "insw", 0),
	new KeywordDef("insd", localize("keyword.insd", "ES:DI <- EDX (Not supported)"), KeywordType.Instruction, "insd", 0),
	//TODO: Lookup movs commads
	new KeywordDef("movs", localize("keyword.movs", "Sets Ax to ES:DI"), KeywordType.Instruction, "movs", 0),
	new KeywordDef("movsb", localize("keyword.movsb", "Sets AL to ES:DI"), KeywordType.Instruction, "movsb", 0),
	new KeywordDef("movsw", localize("keyword.movsw", "Sets AX to ES:DI"), KeywordType.Instruction, "movsw", 0),
	new KeywordDef("movsd", localize("keyword.movsd", "Sets EAX to ES:DI 32-bit (Not supported)"), KeywordType.Instruction, "movsd", 0),
	//Legacy
	new KeywordDef("req", localize("keyword.req", "(Not supported)"), KeywordType.Instruction, "req", 0),
	new KeywordDef("c", localize("keyword.c", "(Not supported)"), KeywordType.Instruction, "c", 0),
	new KeywordDef("wrt", localize("keyword.wrt", "(Not supported)"), KeywordType.Instruction, "wrt", 0),
	//Repeating
	new KeywordDef("loop", localize("keyword.loop", "- decrease `CX`\n\n- Jumps to a label if cx is not 0"), KeywordType.Instruction, "loop [label]", 1, AllowKinds.Label),
	new KeywordDef("loopz", localize("keyword.loopz", "- decrease `CX`\n\n- Jumps to a label if cx is not 0 **and** Zero flag is 1"), KeywordType.Instruction, "loope [label]", 1, AllowKinds.Label, ['loope']),
	new KeywordDef("loopnz", localize("keyword.loopnz", "- decrease `CX`\n\n- Jumps to a label if cx is not 0 **and** zero flag is not 1"), KeywordType.Instruction, "loopz [label]", 1, AllowKinds.Label, ['loopne']),
];
export function GetKeyword(word: string): KeywordDef | undefined {
	for (let i = 0; i < KEYWORD_DICONTARY.length; i++) {
		const keyword = KEYWORD_DICONTARY[i];
		if (keyword.name === word) {
			return keyword;
		}
		if (keyword.alias) {
			for (let i = 0; i < keyword.alias.length; i++) {
				const alia = keyword.alias[i];
				if (alia === word) return keyword
			}
		}
	} return;
}

export function getType(type: KeywordType): string {
	switch (type) {
		case KeywordType.Instruction:
			return localize("keykind.Command", "(Command)");
		case KeywordType.MemoryAllocation:
			return localize("keykind.Memory", "(Memory)");
		case KeywordType.PreCompileCommand:
			return localize("keykind.Instruction", "(Instruction)");
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
		case KeywordType.Method:
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
