import * as vscode from 'vscode';
import * as nls from 'vscode-nls'
const localize =  nls.loadMessageBundle()
let symbols:TasmSymbol[]=[]
let _document:vscode.TextDocument
let docsymbol:vscode.DocumentSymbol[]=[]
enum symboltype {
	other,
	macro,
	procedure,
	struct,
	label,
	variable,
	segment
}
function SymbolVSCfy(a:symboltype){
	let output=vscode.SymbolKind.Null
	switch(a){
		case symboltype.macro:output=vscode.SymbolKind.Module;break;
		case symboltype.segment:output=vscode.SymbolKind.Class;break;
		case symboltype.procedure:output=vscode.SymbolKind.Function;break;
		case symboltype.struct:output=vscode.SymbolKind.Struct;break;
		case symboltype.label:output=vscode.SymbolKind.Key;break;
		case symboltype.variable:output=vscode.SymbolKind.Variable;break;
	}
	return output
}
class TasmSymbol{
	type:number
	name:string
	location:vscode.Location|undefined
	belong:string|undefined
	constructor(type:number,name:string,RangeorPosition:vscode.Range|vscode.Position,belong?:string){
		this.type=type
		this.name=name
		if(_document) this.location=new vscode.Location(_document.uri,RangeorPosition)
	}
	public markdown():vscode.MarkdownString{
		let md=new vscode.MarkdownString()
		let typestr:string=" "
		switch(this.type){
			case symboltype.label:typestr=localize("keykind.Label","label"); break;
			case symboltype.variable:typestr=localize("keykind.Variable","variable"); break;
			case symboltype.procedure:typestr=localize("keykind.Procedure","procedure"); break;
			case symboltype.struct:typestr=localize("keykind.Structure","Structure"); break;
			case symboltype.macro:typestr=localize("keykind.Macro","macro"); break;
			case symboltype.segment:typestr=localize("keykind.Segment","segment"); break;
		}
		md.appendMarkdown('**'+typestr+"** "+this.name)
		return md
	}
}
enum linetype{other,macro,endm,segment,ends,struct,proc,endp}//暂时先不支持struct因为可能会与ends（segment）冲突

export function findSymbol (word:string):TasmSymbol|undefined{
	for(let sym of symbols){
		if(sym.name===word){
			return sym
		}
	}
	return
}
class Asmline{
	type:linetype
	name:string|undefined
	line:number
	index:number
	constructor(type:linetype,line:number,index:number,name?:string)
	{
		this.type=type
		this.line=line
		this.index=index
		this.name=name
	}
	public selectrange(){
		if(this.name) return new vscode.Range(this.line,this.index,this.line,this.index+this.name?.length)
	}
}
function scanline(item:string,line:number):Asmline|null{
	let r: RegExpMatchArray | null=null
	let asmline:Asmline|null=null
	r=item.match(/(\w+)\s+(\w+)\s/)
		if(r) {
			let type1:linetype|undefined
			switch (r[2].toUpperCase()){
				case 'MACRO':type1=linetype.macro;break;
				case 'SEGMENT':type1=linetype.segment;break;
				case 'PROC':type1=linetype.proc;break;
				case 'ENDS':type1=linetype.ends;break;
				case 'ENDP':type1=linetype.endp;break
			}
			if(type1) asmline= new Asmline(type1,line,item.indexOf(r[1]),r[1])
		}
	r=item.match(/(endm|ENDM)/)
		if(r) asmline= new Asmline(linetype.endm,line,item.indexOf(r[1]))
	return asmline
}
function getvarlabel(item:string,index:number,belong?:string):vscode.DocumentSymbol|undefined{
	let vscsymbol:vscode.DocumentSymbol|undefined
	let name:string
	let kind:vscode.SymbolKind
	let range:vscode.Range
	let srange:vscode.Range
	let r=item.match(/(\w+)\s*:([^;:]*)/)
	if(r){
		name=r[1]
		let start=item.indexOf(name)
		let one:TasmSymbol=new TasmSymbol(symboltype.label,r[1],new vscode.Position(index,start),belong)
		symbols.push(one)
		range=new vscode.Range(index,0,index,item.length)
		srange=new vscode.Range(index,start,index,start+name.length)
		kind=SymbolVSCfy(symboltype.label)
		vscsymbol= new vscode.DocumentSymbol(name,r[2],kind,range,srange)
	}
	r=item.match (/\s*(\w+)\s+[dD][bBwWdDfFqQtT]\s+/)
	if(r){
		name=r[1]
		let start=item.indexOf(r[1])
		let one:TasmSymbol=new TasmSymbol(symboltype.variable,r[1],new vscode.Position(index,start),belong)
		symbols.push(one)
		kind=SymbolVSCfy(symboltype.variable)
		range=new vscode.Range(index,0,index,item.length)
		srange=new vscode.Range(index,start,index,start+r[1].length)
		vscsymbol= new vscode.DocumentSymbol(name,item,kind,range,srange)
	}
	return vscsymbol
}
export function sacnDoc(document:vscode.TextDocument) : vscode.DocumentSymbol[] {
	_document=document;symbols=[];let doc=document.getText().split('\n')
	// scan the document for necessary information
	let docsymbol:vscode.DocumentSymbol[]=[]
	let asmline:Asmline[]=[]
	doc.forEach(
		(item,index)=>{
			let line=scanline(item,index)
			if(line!==null) asmline.push(line)
		}
	)
	let skip:boolean,i:number
	asmline.forEach(
		(line,index,array)=>{
			//是否为宏指令
			if(line.type===linetype.macro){
				let line_endm:Asmline|undefined
				//寻赵宏指令结束的位置
				for (i=index;i<asmline.length;i++){
					if(array[i].type===linetype.endm){
						line_endm=array[i]
						break
					}
				}
				//找到宏指令结束标志
				if(line.name && line_endm?.line){
					let macrorange=new vscode.Range(line.line,line.index,line_endm?.line,line_endm?.index)
					symbols.push(new TasmSymbol(symboltype.macro,line.name,macrorange))
					let symbol1=new vscode.DocumentSymbol(line.name+": "+getType(KeywordType.Macro)," ",SymbolVSCfy(symboltype.macro),macrorange,new vscode.Range(line.line,line.index,line.line,line.index+line.name.length))
					docsymbol.push(symbol1)
				}
			}
			else if(line.type===linetype.segment){
				let line_ends:Asmline|undefined
				let proc:Asmline|undefined//正在寻找的子程序信息
				let procschild:vscode.DocumentSymbol[]=[]
				//寻找段结束的位置,并收集子程序的信息
				for (i=index;i<asmline.length;i++){
					//寻找子程序
					if(array[i].type===linetype.proc){
						proc=array[i]
					}
					if(array[i].type===linetype.endp && proc?.name ===array[i].name){
						let _name=array[i].name
						if(proc?.name && _name){
							let range:vscode.Range=new vscode.Range(proc?.line,proc?.index,array[i].line,array[i].index+_name.length)
							let srange:vscode.Range=new vscode.Range(proc.line,proc.index,proc?.line,proc?.index+proc?.name?.length)
							procschild.push(new vscode.DocumentSymbol(proc?.name,doc[proc?.line],SymbolVSCfy(symboltype.procedure),range,srange))
						} 
					}
					//寻找段结束语句
					if(array[i].type===linetype.ends && array[i].name===line.name){
						line_ends=array[i]
						break
					}
				}
				//找到逻辑段结束标志
				if(line.name && line_ends?.line){
					let range=new vscode.Range(line.line,line.index,line_ends?.line,line_ends?.index)
					symbols.push(new TasmSymbol(symboltype.segment,line.name,range))
					let symbol1=new vscode.DocumentSymbol(line.name+": "+getType(KeywordType.Segment)," ",SymbolVSCfy(symboltype.segment),range,new vscode.Range(line.line,line.index,line.line,line.index+line.name.length))
					symbol1.children=procschild
					docsymbol.push(symbol1)
				}
			}
		}
	)
	docsymbol.forEach(
		(item)=>{
			//将宏指令范围内的变量和标号添加到宏
			if(item.kind==SymbolVSCfy(symboltype.macro)){
				let symbol3:vscode.DocumentSymbol|undefined
				for (i=item.range.start.line;i<=item.range.end.line;i++){
					symbol3=getvarlabel(doc[i],i)
					if(symbol3)item.children.push(symbol3)
				}
			}
			//将变量，标号添加到逻辑段和子程序
			else if(item.kind==SymbolVSCfy(symboltype.segment)){
				let symbol2:vscode.DocumentSymbol|undefined
				item.children.forEach(
					(item2,index,array)=>{
						for (i=item2.range.start.line;i<=item2.range.end.line;i++){
							let symbol3=getvarlabel(doc[i],i)
							doc[i]=" "
							if(symbol3)item2.children.push(symbol3)
						}
					},
				)
				for (i=item.range.start.line+1;i<item.range.end.line;i++){
					symbol2=getvarlabel(doc[i],i)
					if(symbol2)item.children.push(symbol2)
				}
			}
		}
	)
		return docsymbol
	}

const possibleNumbers : string[] = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];

export function isNumberStr(str:string) : boolean{
	if(!str.startsWith('0') && !str.startsWith('1') && !str.startsWith('2') && !str.startsWith('3')
		&& !str.startsWith('4') && !str.startsWith('5') && !str.startsWith('6') && !str.startsWith('7')
		&& !str.startsWith('8') && !str.startsWith('9')){
			return false;
	}
	let sub : number = (str.endsWith('h') || str.endsWith('b') || str.endsWith('q') || str.endsWith('d'))?1:0;
	for (let i = 1; i < str.length - sub; i++) {
		const char = str[i];
		if(possibleNumbers.indexOf(char,0) <= -1) {
			return false;
		}
	}
	return true;
}
const asciiname:string[]=[
	"NUL"+	  localize("ascii.NUL",  "(NULL)"),
	 "SOH"+	  localize("ascii.SOH",  "(Start Of Headling)"),
	 "STX"+	  localize("ascii.STX",  "(Start Of Text)"),
	 "ETX"+	  localize("ascii.ETX",  "(End Of Text)"),
	 "EOT"+	  localize("ascii.EOT",  "(End Of Transmission)"),
	 "ENQ"+	  localize("ascii.ENQ",  "(Enquiry)"),
	 "ACK"+	  localize("ascii.ACK",  "(Acknowledge)"),
	 "BEL"+	  localize("ascii.BEL",  "(Bell)"),
	 "BS "+	  localize("ascii.BS",   "(Backspace)"),
	 "HT "+	  localize("ascii.HT",   "(Horizontal Tab)"),
	 "LF/NL"+	  localize("ascii.LFNL","(Line Feed/New Line)"),
	 "VT "+	  localize("ascii.VT",   "(Vertical Tab)"),
	 "FF/NP "+  localize("ascii.FFNP", "(Form Feed/New Page)"),
	 "CR"+	  localize("ascii.CR",   "(Carriage Return)	"),
	 "SO"+	  localize("ascii.SO",   "(Shift Out)"),
	 "SI"+	  localize("ascii.SI",   "(Shift In)"),
	 "DLE"+	  localize("ascii.DLE",  "(Data Link Escape)"),
	 "DC1/XON"+ localize("ascii.DC1", "(Device Control 1/Transmission On)"),
	 "DC2"+	  localize("ascii.DC2", "(Device Control 2)"),
	 "DC3/XOFF"+localize("ascii.DC3","(Device Control 3/Transmission Off)"),
	 "DC4"+	  localize("ascii.DC4", "(Device Control 4)"),
	 "NAK"+	  localize("ascii.NAK", "(Negative Acknowledge)"),
	 "SYN"+	  localize("ascii.SYN", "(Synchronous Idle)"),
	 "ETB"+	  localize("ascii.ETB", "(End of Transmission Block)	"),
	 "CAN"+	  localize("ascii.CAN", "(Cancel)"),
	 "EM"+	  localize("ascii.EM",  "(End of Medium)"),
	 "SUB"+	  localize("ascii.SUB", "(Substitute)"),
	 "ESC"+	  localize("ascii.ESC", "(Escape)"),
	 "FS"+	  localize("ascii.FS", "(File Separator)"),
	 "GS"+	  localize("ascii.GS", "(Group Separator)"),
	 "RS"+	  localize("ascii.RS", "(Record Separator)"),
	 "US"+	  localize("ascii.US", "(Unit Separator)"),
	            localize("ascii.space","(Space)	"),
	 "!",      "\"",    "#",    
	 "$",      "%",     "&",      "'",     "(",    
	 ")",      "*",     "+",      ",",     "-",    
	 ".",      "/",     "0",      "1",     "2",    
	 "3",      "4",     "5",      "6",     "7",    
	 "8",      "9",     ":",      ";",     "<",    
	 "=",      ">",     "?",      "@",     "A",    
	 "B",      "C",     "D",      "E",     "F",    
	 "G",      "H",     "I",      "J",     "K",    
	 "L",      "M",     "N",      "O",     "P",    
	 "Q",      "R",     "S",      "T",     "U",    
	 "V",      "W",     "X",      "Y",     "Z",    
	 "[",      "\\",    "]",      "^",     "_",    
	 "`",      "a",     "b",      "c",     "d",    
	"e",     "f",    "g",     "h",    "i",    
	"j",     "k",    "l",     "m",    "n",    
	"o",     "p",    "q",     "r",    "s",    
	"t",     "u",    "v",     "w",    "x",    
	"y",     "z",    "{",     "|",    "}",    
	"~",     
	"DEL"+	  localize("ascii.DEL", "(Delete)"),
]
export function getNumMsg(word:string) {
	let base : number = word.endsWith('h')? 16 : word.endsWith('q')? 8 : word.endsWith('b')? 2 :  10;
	var value : number = Number.parseInt(word,base);
	var s = "(" + (base===16?"Hexadecimal":base===8?"Octal":base===10?"Decimal":"Binary") + " Number) " + word + ":\n\n";
		s += " `DEC`: " + value.toString(10) + "D\n\n";
		s += " `HEX`: " + value.toString(16) + "H\n\n";
		s += " `OCT`: " + value.toString(8) + "Q\n\n";
		s += " `BIN`: " + value.toString(2) + "B\n\n";
	let a=asciiname[value]
	if (a)	s += " `ASCII`: " + a;
	return s;
}
export function getcharMsg(char:string) {
	let value = char.charCodeAt(0);
	let s = "(ASCII) '"+char+"'\n\n";
		s += " `DEC`: " + value.toString(10) + "D\n\n";
		s += " `HEX`: " + value.toString(16) + "H\n\n";
		s += " `OCT`: " + value.toString(8) + "Q\n\n";
		s += " `BIN`: " + value.toString(2) + "B\n\n";
	return s;
}
enum AllowKinds {
	Memory, Variables, Constants, All, Size, None, Inst, Macro, Label, Interrupt
}
class KeywordDef {
	opCount: number;
    name : string;
	def : string;
	data: string;
	type : KeywordType;
	allowType : AllowKinds;

    constructor(name : string, def : string,type: KeywordType = KeywordType.Instruction,data? : string,count : number = 2,allow? : AllowKinds){
		this.def = def;
		if(data !== undefined){
			this.data = data;
		}else{
			this.data = name + " [operand], [operand]";
		}

		if(allow === undefined){
			this.allowType = AllowKinds.Inst;
		}else{
			this.allowType = allow;
		}

		this.opCount = count;
		this.type = type;
        this.name = name;
    }
}
enum KeywordType {
	MacroLabel,File,Instruction, Register, PreCompileCommand,MemoryAllocation,SavedWord,Size,Variable,Method,Structure,Macro,Label,Segment
}
const KEYWORD_DICONTARY : Array<KeywordDef>= [
	//Sizes
	new KeywordDef("small","128KB",KeywordType.Size,"small",0),
	new KeywordDef("tiny","64KB",KeywordType.Size,"tiny",0),
	new KeywordDef("compact","640KB",KeywordType.Size,"compact",0),
	new KeywordDef("huge","640KB",KeywordType.Size,"huge",0),
	new KeywordDef("medium","640KB",KeywordType.Size,"medium",0),
	new KeywordDef("large","640KB",KeywordType.Size,"large",0),
	new KeywordDef("flat","4GB (Not supported with TASM)",KeywordType.Size,"flat",0),
	new KeywordDef("stdcall","Can be included in another file",KeywordType.Size,"stdcall",0),
	//Registers 8
	new KeywordDef("al", "The lower byte of ax",KeywordType.Register,"al",0),
	new KeywordDef("ah", "The upper byte of ax",KeywordType.Register,"ah",0),
	new KeywordDef("bl", "The lower byte of bx",KeywordType.Register,"bl",0),
	new KeywordDef("bh", "The upper byte of bx",KeywordType.Register,"bh",0),
	new KeywordDef("cl", "The lower byte of cx",KeywordType.Register,"cl",0),
	new KeywordDef("ch", "The upper byte of cx",KeywordType.Register,"ch",0),
	new KeywordDef("dl", "The lower byte of dx",KeywordType.Register,"dl",0),
	new KeywordDef("dh", "The upper byte of dx",KeywordType.Register,"dh",0),
	//Registers 16
	new KeywordDef("ax", "16 bit register used with arithmatic operations",KeywordType.Register,"ax",0),
	new KeywordDef("bx", "16 bit register used to acess memory data",KeywordType.Register,"bx",0),
	new KeywordDef("cx", "16 bit register used with loops",KeywordType.Register,"cx",0),
	new KeywordDef("dx", "16 bit register used with data mangment",KeywordType.Register,"dx",0),
	new KeywordDef("sp", "16 bit register that points at the stack",KeywordType.Register,"sp",0),
	new KeywordDef("bp", "16 bit register that is used to pass arguments",KeywordType.Register,"bp",0),
	new KeywordDef("di", "16 bit register used to acess memory data",KeywordType.Register,"di",0),
	new KeywordDef("si", "16 bit register used to acess memory data",KeywordType.Register,"si",0),
	//Registers 32
	new KeywordDef("eax", "32 bit register used with arithmatic operations",KeywordType.Register,"eax",0),
	new KeywordDef("ebx", "32 bit register used to acess memory data",KeywordType.Register,"ebx",0),
	new KeywordDef("ecx", "32 bit register used with loops",KeywordType.Register,"ecx",0),
	new KeywordDef("edx", "32 bit register used with data mangment",KeywordType.Register,"edx",0),
	new KeywordDef("esp", "32 bit register that points at the stack",KeywordType.Register,"esp",0),
	new KeywordDef("ebp", "32 bit register that is used to pass arguments",KeywordType.Register,"ebp",0),
	new KeywordDef("edi", "32 bit register used to acess memory data",KeywordType.Register,"edi",0),
	new KeywordDef("esi", "32 bit register used to acess memory data",KeywordType.Register,"esi",0),
	//Registers 64
	new KeywordDef("rax", "64 bit register used with arithmatic operations",KeywordType.Register,"rax",0),
	new KeywordDef("rbx", "64 bit register used to acess memory data",KeywordType.Register,"rbx",0),
	new KeywordDef("rcx", "64 bit register used with loops",KeywordType.Register,"rcx",0),
	new KeywordDef("rdx", "64 bit register used with data mangment",KeywordType.Register,"rdx",0),
	new KeywordDef("rsp", "64 bit register that points at the stack",KeywordType.Register,"rsp",0),
	new KeywordDef("rbp", "64 bit register that is used to pass arguments",KeywordType.Register,"rbp",0),
	new KeywordDef("rdi", "64 bit register used to acess memory data",KeywordType.Register,"rdi",0),
	new KeywordDef("rsi", "64 bit register used to acess memory data",KeywordType.Register,"rsi",0),
	//Memory alloaction
	new KeywordDef("db","Allocates a byte of memory",KeywordType.MemoryAllocation,"[name] db [value]"),
	new KeywordDef("dw","Allocates 2 byte of memory (Word)",KeywordType.MemoryAllocation,"[name] dw [value]"),
	new KeywordDef("dd","Allocates 4 byte of memory (Double Word)",KeywordType.MemoryAllocation,"[name] dd [value]"),
	new KeywordDef("dq","Allocates 8 byte of memory (Quad Word)",KeywordType.MemoryAllocation,"[name] dq [value]"),
	new KeywordDef("dt","Allocates 10 byte of memory ",KeywordType.MemoryAllocation,"[name] dt [value]"),
	//Memory locating
	new KeywordDef("byte","Locates 1 byte of memory",KeywordType.MemoryAllocation,"byte",-1),
	new KeywordDef("word","Locates 2 byte of memory (Word)",KeywordType.MemoryAllocation,"word",-1),
	new KeywordDef("dword","Locates 4 byte of memory (Double Word)",KeywordType.MemoryAllocation,"dword",-1),
	new KeywordDef("qword","Locates 8 byte of memory (Quad Word)",KeywordType.MemoryAllocation,"qword", -1),
	new KeywordDef("tbyte","Locates 10 byte of memory ",KeywordType.MemoryAllocation,"tbyte",-1),
	//Segemts
	new KeywordDef("cs","Code segement address",KeywordType.Register,"cs",0),
	new KeywordDef("ss","Stack segement address",KeywordType.Register,"ss",0),
	new KeywordDef("ds","Data segement address",KeywordType.Register,"ds",0),
	new KeywordDef("es","Extra segement address",KeywordType.Register,"es",0),
	//Saved
	new KeywordDef("DATASEG","Start of the data segment",KeywordType.SavedWord,"DATASEG",0),
	new KeywordDef("IDEAL","",KeywordType.SavedWord,"IDEAL",0),
	new KeywordDef("CODESEG","Start of the code segment",KeywordType.SavedWord,"CODESEG",0),
	new KeywordDef("MODEL","Defines the scope of the file",KeywordType.SavedWord,"MODEL [size]",1,AllowKinds.Size),
	new KeywordDef("STACK","Sets the size of the stack",KeywordType.SavedWord,"STACK [constant]",1,AllowKinds.Constants),
	//Basics
	new KeywordDef("mov", "Moves value from adress/constant/register to a register or adress."),
	new KeywordDef("int", "Interrupt call see [list]( https://github.com/xsro/masm-tasm/wiki/interrupt_en)",KeywordType.Instruction,"int [interruptIndex]",1,AllowKinds.Constants),
	new KeywordDef("into", "Trap into overflow flag",KeywordType.Instruction,"into",1,AllowKinds.Constants),
	new KeywordDef("nop", "Do nothing",KeywordType.Instruction,"nop",0),
	new KeywordDef("hlt", "Enters halt mode",KeywordType.Instruction,"hlt",0),
	new KeywordDef("iret", "",KeywordType.Instruction,"iret",1,AllowKinds.Constants),
	new KeywordDef("cmp", "Compares the 2 operands.",KeywordType.Instruction,"cmp [operand], [operand]"),
	new KeywordDef("include", "Includes a file in this file",KeywordType.PreCompileCommand,"include [fileName]",1),
	new KeywordDef("in","Reads data from a port"),
	new KeywordDef("out","Writes data to a port"),
	//Logic
	new KeywordDef("or", "Or operation on 2 registers."),
	new KeywordDef("and", "And operation on 2 registers."),
	new KeywordDef("xor", "Xor operation on 2 register"),
	new KeywordDef("shl", "Moves all the bits to the left by the second operand."),
	new KeywordDef("xchg", "Exchages regeter or memeory address with register."),
	new KeywordDef("xadd", "Exchages regeter or memeory address with register and the summary is moved to SI."),
	new KeywordDef("cmpxchg", "cmp + xchg."),
	new KeywordDef("rcl", "Rotates left (Carry)."),
	new KeywordDef("rcl", "Rotates left (Carry)."),
	new KeywordDef("rcr", "Rotates right (Carry)."),
	new KeywordDef("rol", "Rotates left."),
	new KeywordDef("ror", "Rotates right."),
	new KeywordDef("shld", "Double precesion shift left."),
	new KeywordDef("sal", "Moves all the bits to the left by the second operand. (Signed)"),
	new KeywordDef("lea", "Moves the memory address of operand 2 to operand 1.",KeywordType.Instruction,undefined,2,AllowKinds.Variables | AllowKinds.Memory),
	new KeywordDef("shr", "Moves all the bits to the right by the second operand."),
	new KeywordDef("shrd", "Double precesion shift right."),
	new KeywordDef("sar", "Moves all the bits to the right by the second operand. (Unsigned)"),
	new KeywordDef("not", "Flips all the bits of the operand",KeywordType.Instruction,"not [operand]",1),
	//Flags
	new KeywordDef("lahf","Move flags to ah (SF:ZF:xx:AF:xx:PF:xx:CF)",KeywordType.Instruction,"lahf",0),
	new KeywordDef("sahf","Move ah to flags (SF:ZF:xx:AF:xx:PF:xx:CF)",KeywordType.Instruction,"sahf",0),
	new KeywordDef("std","Set direction flag CF=1",KeywordType.Instruction,"std",0),
	new KeywordDef("cld","Clear direction flag DF=0",KeywordType.Instruction,"cld",0),
	new KeywordDef("sti","Set interrupt flag IF=1",KeywordType.Instruction,"sti",0),
	new KeywordDef("cli","Clear interrupt flag IF=0",KeywordType.Instruction,"cli",0),
	new KeywordDef("stc","Set carry flag CF=1",KeywordType.Instruction,"stc",0),
	new KeywordDef("clc","Clear carry flag CF=0",KeywordType.Instruction,"clc",0),
	new KeywordDef("cmc","Complement carry flag CF=!CF",KeywordType.Instruction,"cmc",0),
	//Structures
	new KeywordDef("proc","Creates a new procedure",KeywordType.PreCompileCommand,"proc [name]",1),
	new KeywordDef("endp","Ends a procedure defenition",KeywordType.PreCompileCommand,"endp [name]",1),
	new KeywordDef("struc","Creates a new structure",KeywordType.PreCompileCommand,"struc [name]",1),
	new KeywordDef("struct","Creates a new structure (Not supported)",KeywordType.PreCompileCommand,"struct [name]",1),
	new KeywordDef("ends","Ends a structure defenition",KeywordType.PreCompileCommand,"ends [name]",1),
	new KeywordDef("macro","Creates a new macro",KeywordType.PreCompileCommand,"macro [name]",1),
	new KeywordDef("endm","Ends a macro defenition",KeywordType.PreCompileCommand,"endm [name]",1),
	new KeywordDef("equ","Replaces all instances of name with value",KeywordType.PreCompileCommand,"[name] equ [value]",2),
	new KeywordDef("dup","Allocates values count times",KeywordType.PreCompileCommand,"[count] dup([values])",1),
	new KeywordDef("end","Ends the file",KeywordType.PreCompileCommand,"end [label]",1),
	//If and macros
	new KeywordDef("label","Simple macro",KeywordType.PreCompileCommand,"label [name] [value]",2,AllowKinds.None),
	new KeywordDef("local","Create local data or labels",KeywordType.PreCompileCommand,"local [args]...",-1,AllowKinds.None),
	new KeywordDef("if","Compares a value to zero",KeywordType.PreCompileCommand,"if [operand]",1,AllowKinds.Variables),
	new KeywordDef("ife","If the value is not zero",KeywordType.PreCompileCommand,"ife [operand]",1,AllowKinds.Variables),
	new KeywordDef("ifb","",KeywordType.PreCompileCommand,"ifb <[operand]>",1,AllowKinds.Variables),
	new KeywordDef("ifnb","",KeywordType.PreCompileCommand,"ifnb <[operand]>",1,AllowKinds.Variables),
	new KeywordDef("ifdef","If the argument exsits",KeywordType.PreCompileCommand,"ifdef [operand]",1,AllowKinds.Variables),
	new KeywordDef("ifndef","If the argument doesn't exsits",KeywordType.PreCompileCommand,"ifndef [operand]",1,AllowKinds.Variables),
	new KeywordDef("ifdif","If the arguments are diffrent",KeywordType.PreCompileCommand,"ifdif [operand], [operand]",2,AllowKinds.Variables),
	new KeywordDef("ifndif","If the arguments are identical",KeywordType.PreCompileCommand,"ifndif [operand], [operand]",2,AllowKinds.Variables),
	new KeywordDef("if1","",KeywordType.PreCompileCommand,"if1",0,AllowKinds.Variables),
	new KeywordDef("if2","",KeywordType.PreCompileCommand,"if2",0,AllowKinds.Variables),
	new KeywordDef("rept","Repeats an action a ciretien of times",KeywordType.PreCompileCommand,"rept [operand]",1,AllowKinds.Variables),
	new KeywordDef("irp","",KeywordType.PreCompileCommand,"rept [operand] <[operands]>",2,AllowKinds.Variables),
	new KeywordDef("endif","Closes an if statement",KeywordType.PreCompileCommand,"endif",0,AllowKinds.None),
	new KeywordDef("else","Accurs if the if statement before didn't",KeywordType.PreCompileCommand,"else",0,AllowKinds.None),
	//Other pcc
	new KeywordDef("width","",KeywordType.SavedWord,"width",0),
	new KeywordDef("this","",KeywordType.SavedWord,"this",0),
	new KeywordDef("times","",KeywordType.SavedWord,"times",0),
	new KeywordDef("length","",KeywordType.SavedWord,"length",0),
	new KeywordDef("le","",KeywordType.SavedWord,"le",0),
	new KeywordDef("ge","",KeywordType.SavedWord,"ge",0),
	//Math
	new KeywordDef("add", "Adds the second operand to the first one."),
	new KeywordDef("sub", "Subtracts the second operand from the first one."),
	new KeywordDef("inc", "Adds 1 to the operand.",KeywordType.Instruction,"inc [operand]",1),
	new KeywordDef("dec", "Subtracts 1 from the operand.",KeywordType.Instruction,"dec [operand]",1),
	new KeywordDef("neg", "Negates the value of the operand.",KeywordType.Instruction,"neg [operand]",1),
	new KeywordDef("abs", "Turns the value to a positive value. (Not supported)",KeywordType.Instruction,"abs [operand]",1),
	new KeywordDef("mul", "Multiplies ax by the operand (Unsigned).",KeywordType.Instruction,"mul [operand]",1),
	new KeywordDef("imul", "Multiplies ax by the operand (Signed).",KeywordType.Instruction,"imul [operand]",1),
	new KeywordDef("div", "Divides ax by the operand (Unsigned) {Mod at dx (16 bit) or ah (8 bit)}.",KeywordType.Instruction,"div [operand]",1),
	new KeywordDef("idiv", "Divides ax by the operand (Signed) {Mod at dx (16 bit) or ah (8 bit)}.",KeywordType.Instruction,"idiv [operand]",1),	
	//Deciaml
	new KeywordDef("daa","After addition ajusts al to be in range of a decimal number",KeywordType.Instruction,"daa",0),
	new KeywordDef("das","After subtraction ajusts al to be in range of a decimal number",KeywordType.Instruction,"das",0),
	//Ascii
	new KeywordDef("aaa","Ajust al to decimal number (add/sub)",KeywordType.Instruction,"aaa",0),
	new KeywordDef("aas","Ajust al to decimal number (add/sub)",KeywordType.Instruction,"aas",0),
	new KeywordDef("aam","Ajust al to decimal number (mul)",KeywordType.Instruction,"aam",0),
	new KeywordDef("aad","Ajust al to decimal number (div)",KeywordType.Instruction,"aad",0),
	//Coprocessor
	new KeywordDef("wait","Processor suspends instruction execution until the BUSY # pin is inactive",KeywordType.Instruction,"wait",0),
	new KeywordDef("fwait","Processor checks for pending unmasked numeric exceptions before proceeding.",KeywordType.Instruction,"fwait",0),
	//Stack
	new KeywordDef("push","pushes a value to the stack",KeywordType.Instruction,"push [operand]",1),
	new KeywordDef("pushf","pushes flag data to the stack",KeywordType.Instruction,"pushf",0),
	new KeywordDef("pushfw","pushes flag data to the stack",KeywordType.Instruction,"pushfw",0),
	new KeywordDef("pushfd","pushes flag data to the stack",KeywordType.Instruction,"pushfd",0),
	new KeywordDef("pop","pops a value from the stack",KeywordType.Instruction,"pop [operand]",1),
	new KeywordDef("popf","pops flag data to the stack",KeywordType.Instruction,"popf",0),
	new KeywordDef("popfw","pops flag data to the stack",KeywordType.Instruction,"popfw",0),
	new KeywordDef("popfd","pops flag data to the stack",KeywordType.Instruction,"popfd",0),
	new KeywordDef("pusha","pushes all register to the stack",KeywordType.Instruction,"pusha",0),
	new KeywordDef("popa","pops all register to from the stack stack",KeywordType.Instruction,"popa",0),
	//Code Navigation
	new KeywordDef("jmp","jump to a part in the code",KeywordType.Instruction,"jmp [label]",1,AllowKinds.Label),
	new KeywordDef("jcxz","jump if cx is 0",KeywordType.Instruction,"jcxz [label]",1,AllowKinds.Label),
	new KeywordDef("je","jump if the numbers are equals",KeywordType.Instruction,"je [label]",1,AllowKinds.Label),
	new KeywordDef("jne","jump if the operands are not equals",KeywordType.Instruction,"jne [label]",1,AllowKinds.Label),
	new KeywordDef("jc","jump if carry flag on",KeywordType.Instruction,"jc [label]",1,AllowKinds.Label),
	new KeywordDef("jnc","jump if carry flag off",KeywordType.Instruction,"jnc [label]",1,AllowKinds.Label),
	new KeywordDef("jz","jump if zero flag on",KeywordType.Instruction,"jz [label]",1,AllowKinds.Label),
	new KeywordDef("jnz","jump if zero flag off",KeywordType.Instruction,"jnz [label]",1,AllowKinds.Label),
	new KeywordDef("ja","jump if greater (Unsinged)",KeywordType.Instruction,"ja [label]",1,AllowKinds.Label),
	new KeywordDef("jae","jump if greater or equals (Unsigned)",KeywordType.Instruction,"jae [label]",1,AllowKinds.Label),
	new KeywordDef("jb","jump if less (Unsinged)",KeywordType.Instruction,"jb [label]",1,AllowKinds.Label),
	new KeywordDef("jbe","jump if less or equals (Unsigned)",KeywordType.Instruction,"jbe [label]",1,AllowKinds.Label),
	new KeywordDef("jb","jump if greater (Singed)",KeywordType.Instruction,"jg [label]",1,AllowKinds.Label),
	new KeywordDef("jbe","jump if greater or equals (Signed)",KeywordType.Instruction,"jge [label]",1,AllowKinds.Label),
	new KeywordDef("jl","jump if less (Singed)",KeywordType.Instruction,"jl [label]",1,AllowKinds.Label),
	new KeywordDef("jle","jump if less or equals (Signed)",KeywordType.Instruction,"jle [label]",1,AllowKinds.Label),
	//Procs
	new KeywordDef("call","Calls a procedure",KeywordType.Instruction,"call [procName]",1),
	new KeywordDef("far","Turns the procedure into a far procedure",KeywordType.SavedWord,"[procName] far",0),
	new KeywordDef("near","Turns the procedure into a near procedure",KeywordType.SavedWord,"[procName] near",0),
	new KeywordDef("ret","Returns from a procedure",KeywordType.Instruction,"ret [op:RemoveStack]",0),
	new KeywordDef("enter","Create dynamic and nested stack",KeywordType.Instruction,"enter [dynamic], [nesting]",1),
	new KeywordDef("leave","High level ret",KeywordType.Instruction,"leave",0),
	//Segement Regiser Instructions
	new KeywordDef("les","Load memory from ES:Pointer 1 to operand 2 from es",KeywordType.Instruction,"les [poiner], [register]",2,AllowKinds.Memory),
	new KeywordDef("lds","Load memory from DS:Pointer 1 to operand 2 from ds",KeywordType.Instruction,"lds [poiner], [register]",2,AllowKinds.Memory),
	new KeywordDef("lfs","Load memory from FS:Pointer 1 to operand 2 from fs",KeywordType.Instruction,"lfs [poiner], [register]",2,AllowKinds.Memory),
	new KeywordDef("lgs","Load memory from GS:Pointer 1 to operand 2 from gs",KeywordType.Instruction,"lgs [poiner], [register]",2,AllowKinds.Memory),
	new KeywordDef("lss","Load memory from SS:Pointer to operand 2 from ss",KeywordType.Instruction,"lss [poiner], [register]",2,AllowKinds.Memory),
	//Floating point registers
	new KeywordDef("st0","Floting point register 0",KeywordType.Register,"st0",0),
	new KeywordDef("st1","Floting point register 1",KeywordType.Register,"st1",0),
	new KeywordDef("st2","Floting point register 2",KeywordType.Register,"st2",0),
	new KeywordDef("st3","Floting point register 3",KeywordType.Register,"st3",0),
	new KeywordDef("st4","Floting point register 4",KeywordType.Register,"st4",0),
	new KeywordDef("st5","Floting point register 5",KeywordType.Register,"st5",0),
	new KeywordDef("st6","Floting point register 6",KeywordType.Register,"st6",0),
	new KeywordDef("st7","Floting point register 7",KeywordType.Register,"st7",0),
	new KeywordDef("st","Floting point register",KeywordType.Register,"st",0),
	//Test and Debug registers
	new KeywordDef("db0","Debug register 0",KeywordType.Register,"db0",0),
	new KeywordDef("db1","Debug register 1",KeywordType.Register,"db1",0),
	new KeywordDef("db2","Debug register 2",KeywordType.Register,"db2",0),
	new KeywordDef("db3","Debug register 3",KeywordType.Register,"db3",0),
	new KeywordDef("tr6","Test register 4",KeywordType.Register,"tr6",0),
	new KeywordDef("tr7","Test register 5",KeywordType.Register,"tr7",0),
	new KeywordDef("db6","Debug register 6",KeywordType.Register,"db6",0),
	new KeywordDef("db7","Debug register 7",KeywordType.Register,"db7",0),
	//String operations
	new KeywordDef("rep","Repeat while equals",KeywordType.Instruction,"rep [operation]",1),
	new KeywordDef("repz","Repeat while zero",KeywordType.Instruction,"repz [operation]",1),
	new KeywordDef("repnz","Repeat while not zero",KeywordType.Instruction,"repnz [operation]",1),
	new KeywordDef("xlat","Table lookup to al",KeywordType.Instruction,"xlat",0),
	new KeywordDef("bound","Check the 16-bit signed array index value in the operand 1 against the doubleword with the upper and lower bounds specified by operand 2"),
	new KeywordDef("scas","Compare ES:DI with AX or AL",KeywordType.Instruction,"scas",0),
	new KeywordDef("scasb","Compare ES:DI with AL",KeywordType.Instruction,"scasb",0),
	new KeywordDef("scasw","Compare ES:DI with AX",KeywordType.Instruction,"scasw",0),
	new KeywordDef("scasd","Compare ES:DI with EAX (Not supported)",KeywordType.Instruction,"scasd",0),
	new KeywordDef("cmps","Compare ES:DI with ES:SI",KeywordType.Instruction,"cmps",0),
	new KeywordDef("cmpsb","Compare ES:DI with ES:SI (Byte)",KeywordType.Instruction,"cmpsb",0),
	new KeywordDef("cmpsw","Compare ES:DI with ES:SI",KeywordType.Instruction,"cmpsw",0),
	new KeywordDef("cmpsd","Compare ES:DI with ES:SI (32 bit)",KeywordType.Instruction,"cmpsd",0),
	new KeywordDef("stos","Sets ES:DI to AX AL",KeywordType.Instruction,"stos",0),
	new KeywordDef("stosb","Sets ES:DI to AL",KeywordType.Instruction,"stosb",0),
	new KeywordDef("stosw","Sets ES:DI to AX",KeywordType.Instruction,"stosw",0),
	new KeywordDef("stosd","Sets ES:DI to EAX  (Not supported)",KeywordType.Instruction,"stosd",0),
	new KeywordDef("lods","Sets Ax to ES:DI",KeywordType.Instruction,"lods",0),
	new KeywordDef("lodsb","Sets AL to ES:DI",KeywordType.Instruction,"lodsb",0),
	new KeywordDef("lodsw","Sets AX to ES:DI",KeywordType.Instruction,"lodsw",0),
	new KeywordDef("lodsd","Sets EAX to ES:DI 32-bit (Not supported)",KeywordType.Instruction,"lodsd",0),
	new KeywordDef("outs","",KeywordType.Instruction,"outs",0),
	new KeywordDef("outsb","ES:DI -> DL",KeywordType.Instruction,"outsb",0),
	new KeywordDef("outsw","ES:DI -> DX",KeywordType.Instruction,"outsw",0),
	new KeywordDef("outsd","ES:DI -> EDX (Not supported)",KeywordType.Instruction,"outsd",0),
	new KeywordDef("ins","",KeywordType.Instruction,"ins",0),
	new KeywordDef("insb","ES:DI <- DL",KeywordType.Instruction,"insb",0),
	new KeywordDef("insw","ES:DI <- DX",KeywordType.Instruction,"insw",0),
	new KeywordDef("insd","ES:DI <- EDX (Not supported)",KeywordType.Instruction,"insd",0),
	//TODO: Lookup movs commads
	new KeywordDef("movs","Sets Ax to ES:DI",KeywordType.Instruction,"movs",0),	
	new KeywordDef("movsb","Sets AL to ES:DI",KeywordType.Instruction,"movsb",0),
	new KeywordDef("movsw","Sets AX to ES:DI",KeywordType.Instruction,"movsw",0),
	new KeywordDef("movsd","Sets EAX to ES:DI 32-bit (Not supported)",KeywordType.Instruction,"movsd",0),
	//Legacy
	new KeywordDef("req","(Not supported)",KeywordType.Instruction,"req",0),
	new KeywordDef("c","(Not supported)",KeywordType.Instruction,"c",0),
	new KeywordDef("wrt","(Not supported)",KeywordType.Instruction,"wrt",0),
	//Repeating
	new KeywordDef("loop", "Jumps to a label if cx is not 0 and deceases it as well",KeywordType.Instruction,"loop [label]",1,AllowKinds.Label),
	new KeywordDef("loope", "",KeywordType.Instruction,"loope [label]",1,AllowKinds.Label),
	new KeywordDef("loopz", "",KeywordType.Instruction,"loopz [label]",1,AllowKinds.Label),
	new KeywordDef("loopne", "",KeywordType.Instruction,"loopne [label]",1,AllowKinds.Label),
	new KeywordDef("loopnz", "",KeywordType.Instruction,"loopnz [label]",1,AllowKinds.Label)
];
export function GetKeyword(word : string) : KeywordDef | undefined{
    for (let i = 0; i < KEYWORD_DICONTARY.length; i++) {
        const keyword = KEYWORD_DICONTARY[i];
        if(keyword.name === word){
            return keyword;
        }
    }
    return;
}

export function getType(type : KeywordType) : string {
	switch (type) {
			case KeywordType.Instruction:
			return localize("keykind.Command","(Command)");
			case KeywordType.MemoryAllocation:
			return localize("keykind.Memory","(Memory)");
			case KeywordType.PreCompileCommand:
			return localize("keykind.Instruction","(Instruction)");
			case KeywordType.Register:
			return localize("keykind.Register","(Register)");
			case KeywordType.SavedWord:
			return localize("keykind.Saved","(Saved)");
			case KeywordType.Size:
			return localize("keykind.Size","(Size)");
			case KeywordType.Label:
			return localize("keykind.Label","(Label)");
			case KeywordType.Macro:
			return localize("keykind.Macro","(Macro)");
			case KeywordType.Method:
			return localize("keykind.Procedure","(Procedure)");
			case KeywordType.Structure:
			return localize("keykind.Structure","(Structure)");
			case KeywordType.Variable:
			return localize("keykind.Variable","(Variable)");
			case KeywordType.Segment:
			return localize("keykind.Segment","(Segment)");
	}
	return "(Unknown)";
}
