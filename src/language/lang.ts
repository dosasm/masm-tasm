// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fstream from 'fs';
import * as nls from 'vscode-nls'
const localize =  nls.loadMessageBundle()
class Info {
	des : string;
	name :string;
	params : string[];
	output : string[];

	constructor(name:string,des:string,param:string[] = [],output:string[] = []) {
		this.des = des;
		this.name = name;
		this.params = param;
		this.output = output;
	}
	
	public paramsString() {
		let out : string = "";

		for (const param of this.params) {
			out += "push ["+param+"]\n";
		}
		out += "call " + this.name;
		return out;
	}
	public paramsStringMac() {
		let out : string = this.name + " ";
		for (let i = 0; i < this.params.length; i++) {
			const param = this.params[i];
			out += "[" + param + "]";
			if(i !== this.params.length - 1){
				out += ", ";
			}
		}

		return out;
	}
	
	public outputs(){
		let h : string = "";
		for (let i = 0; i < this.output.length; i++) {
			const out = this.output[i];
			h += out + "\n";
		}
		return h;
	}
}

function getType(type : KeywordType) : string {
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
	}
	return "(Unknown)";
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
	MacroLabel,File,Instruction, Register, PreCompileCommand,MemoryAllocation,SavedWord,Size,Variable,Method,Structure,Macro,Label
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
	new KeywordDef("es","",KeywordType.Register,"es",0),
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

const labels : string[] = [], vars : {name:string,type:string}[] = [];

function GetKeyword(word : string) : KeywordDef | undefined{
    for (let i = 0; i < KEYWORD_DICONTARY.length; i++) {
        const keyword = KEYWORD_DICONTARY[i];
        if(keyword.name === word){
            return keyword;
        }
    }
    return;
}
const possibleNumbers : string[] = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
function isNumberStr(str:string) : boolean{
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
function getNumMsg(word:string) {
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
function findProc(name:string) : Procedure | undefined{
	for (const proc of procs) {
		if(proc.name === name){
			return proc;
		}
	}
	return;
}
function createInformation(text:string[]) : Info {
	let out = new Info("","");
	for (let i = 0; i < text.length; i++) {
		const line = text[i];
		if(line.startsWith("@out: ")){
			out.output.push(line.substring(line.indexOf(' ',line.indexOf('@out: '))));
		}else if(line.startsWith("@arg: ")){
			out.params.push(clearSpace(line.substring(line.indexOf(' ',line.indexOf('@arg: ')))));
		}else{
			out.des += line;
		}
	}
	return out;
}
function findMacro(name:string) : Macro | undefined{
	for (const mac of macros) {
		if(mac.name === name){
			return mac;
		}
	}
	return;
}
function findLabel(name:string): Label | undefined {
	for (const label of labelsEE) {
		if(label.name === name){
			return label;
		}
	}
	return;
}
//Hover provider
class TasmHoverProvider implements vscode.HoverProvider {
	async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let output:vscode.MarkdownString=new vscode.MarkdownString()
		let line = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
		let quotes = null;
		let comment = null;
		if (line) {
			quotes = line.match(/(\")/g) || line.match(/(\')/g);
			comment = line.match(/^[^\;]*#.*$/);
		}
		if(quotes === null && comment === null){
			let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
			if(range){
				let word = document.getText(range).toLowerCase();
				let proc = findProc(word),keyword = GetKeyword(word),macro = findMacro(word),label=findLabel(word);
				if(isNumberStr(word)){
					output.appendMarkdown(getNumMsg(word));
				}else if(proc !== undefined){
					output.appendCodeblock("assembly","(Procedure) " + proc.name)
						output.appendMarkdown( proc.description.des)
						output.appendCodeblock("assembly", proc.description.paramsString())
						output.appendCodeblock("assembly", proc.description.outputs())
				}else if(macro !== undefined) {
					if(macro.short){
						output.appendCodeblock("assembly","(Macro) " + macro.name + " => " + macro.des.des)
					}else{
						output.appendCodeblock("assembly","(Macro) " + macro.name)
						output.appendText(macro.des.des)
						output.appendCodeblock("assembly",macro.des.paramsStringMac())
						output.appendCodeblock("assembly",macro.des.outputs()	)					
					}
				}else if(keyword !== undefined){
					let md=getType(keyword.type)+" **"+keyword.name+"**\n\n"+keyword.def
					output.appendMarkdown(md)
					output.appendCodeblock("Syntax: " + keyword.data)
				}else if(label !== undefined){
					output.appendCodeblock('assembly','(Label) ' + label.name + " => " + label.value)
				}
			}
		}
		return new vscode.Hover(output);
	}
}
const lineCutters = [' ',','];
const spaceVar = ['\n',' ','\t'];
function isAllSpace(a : string) : boolean {
	for(let i = 0;i < a.length;i++){
		if(spaceVar.indexOf(a[i]) <= -1)
		{
			return false;
		}
	}
	return true;
}

function clearSpace(str:string) {
	var f : string = "";
	for (let i = 0; i < str.length; i++) {
		if(spaceVar.indexOf(str[i]) > -1){
			continue;
		}
		f += str[i];
	}
	return f;
}

function findVar(varName:string) : {name:string,type:string} | undefined {

	for (let i = 0; i < vars.length; i++) {
		const variable = vars[i];
		if(variable.name === varName){
			return variable;
		}
	}

	return;
}

class Procedure {
	description : Info;
	name : string;
	status : string;

	constructor(name : string,des: Info,status : string = "near"){
		this.name = name;
		this.description = des;
		this.status = status;
	}
}

class Macro {
	name : string;
	short : boolean;
	des : Info;
	constructor(name : string,short : boolean,des : Info | undefined){
		this.name = name;
		this.short = short;
		if(des === undefined){
			this.des = new Info(name,"");
		}else{		
			this.des = des;
		}
	}
}

const labelsEE : Label[] = [];
const procs: Procedure[] = [];
const structs: string[] = [];
const macros : Macro[] = [];

const findSpaceIndex = (text : string,start : number = 0): number => {
	let index : number = -1;

	for (let i = 0; i < spaceVar.length; i++) {
		const char = spaceVar[i];
		let vIndex = text.indexOf(char,start);
		if((vIndex < index && vIndex >= 0) || index < 0){
			index = vIndex;
		}
	}
	return index;
};
async function defStruc(line:string) {
	for (let i = 0; i < structs.length; i++) {
		const struct = structs[i];
		
		if(await line.includes(struct)){
			return true;
		}
	}
	return false;
}
function readStruc(start:number,end:number,document:string[],kind:string) : string[] {
	let out : string[]= [];

	for (let i = start; i <= end; i++) {
		const line = document[i];
		const cleanLine = clearSpace(line);
		var first = cleanLine.charAt(0);
		var fistInd = line.indexOf(first);
		out.push(
			clearSpace(line.substring(fistInd,findSpaceIndex(line,fistInd)))
		);
	}

	return out;
}
function filter(list : vscode.CompletionList){
	let items : vscode.CompletionList= new vscode.CompletionList();
	for (let i = 0; i < list.items.length; i++) {
		const item = list.items[i];
		let append = true;
		for (const item2 of items.items) {
			if(item2.label === item.label){
				append = false;
				break;
			}
		}
		if(append){
			items.items.push(item);
		}
	}
	return items;
}
let structureInfo : {name:string,values:string[];}[] = [
];
let logInfo : string[] = [];
const includedFiles : string[] = [];
async function sacnDoc(document:string[],alsoVars : boolean = true) : Promise<number> {
	//Clean all data lists
	logInfo = [];
	if(alsoVars){
		labels.splice(0,labels.length);
		labelsEE.splice(0,labelsEE.length);
		vars.splice(0,vars.length);
		macros.splice(0,macros.length);
		structs.splice(0,structs.length);
		procs.splice(0,procs.length);
		structureInfo.splice(0,structureInfo.length);
		includedFiles.splice(0,includedFiles.length);
		if(vscode.window.activeTextEditor !== undefined){
			includedFiles.push(vscode.window.activeTextEditor.document.uri.path);
		}
	}
	//Scan document
	for (let x = 0; x < document.length; x++) {
		const line = document[x];
		//is the name a varibles
		//console.log(line + " <= " + defStruc(line));
		
		let isVar : boolean = line.includes(" db") || line.includes(" dw") || line.includes(" dd") || line.includes(" dq") || line.includes(" dt") || (await defStruc(line));
		//Is a label
		if(line.endsWith(':')){	//is the line a label
			labels.push(clearSpace(line.substring(0,line.length - 1)));
		}
		let cleanLine = clearSpace(line);
		//Is a variable
		if(isVar && alsoVars){
			var first = cleanLine.charAt(0);
			var fistInd = line.indexOf(first);
			let space1 = findSpaceIndex(line,fistInd);
			let space2 = findSpaceIndex(line,space1+1);
			vars.push({
				name:clearSpace(line.substring(fistInd,space1)),
				type:clearSpace(line.substring(space1,space2))
			});
		}
		var firstSpace,spaceOne,length : number = 0;
		//Is a procedure
		if(cleanLine.startsWith("proc")){
			let des = new Info("","");
			let text = [];
			let ptr = x;
			while(ptr-1 >= 0){
				ptr--;
				if(clearSpace(document[ptr]).startsWith(';')){
					text.push(document[ptr].substring(document[ptr].indexOf(';') + 1));
				}else{
					break;
				}
			}
			des = createInformation(text);
			firstSpace = line.indexOf(' ',line.indexOf('c'));
			spaceOne = line.indexOf(' ',firstSpace+1);
			length = spaceOne - firstSpace;
			let name = spaceOne>-1?cleanLine.substr(cleanLine.indexOf('c')+1,length-1):cleanLine.substring(cleanLine.indexOf('c')+1);
			des.name = name;
			if(findProc(name) === undefined){
				procs.push(new Procedure(name,des));
			}
		}
		if(cleanLine.startsWith('label')){
			let name = "";
			firstSpace = line.indexOf(' ',line.indexOf('l'));
			spaceOne = line.indexOf(' ',firstSpace+1);
			length = spaceOne - firstSpace;
			name = cleanLine.substr(firstSpace,length-1);
			labelsEE.push(new Label(name,line.substring(line.indexOf(' ',line.indexOf(name)))));
		}
		//Structures
		if(cleanLine.startsWith("struc")){
			let start_read : number = x;
			while (!document[x+1].includes("ends")) {
				x++;
			}
			let name : string = cleanLine.substring(cleanLine.indexOf('c') + 1);
			structureInfo.push({
				name: name,
				values: readStruc(start_read+1,x,document,name)
			});
			structs.push(name);
			x++;
		}
		if(cleanLine.startsWith("macro")){
			let des = new Info("","");
			let text = [];
			let ptr = x;
			while(ptr-1 >= 0){
				ptr--;
				if(clearSpace(document[ptr]).startsWith(';')){
					text.push(document[ptr].substring(document[ptr].indexOf(';') + 1));
				}else{
					break;
				}
			}
			des = createInformation(text);
			firstSpace = line.indexOf(' ',line.indexOf('o'));
			spaceOne = line.indexOf(' ',firstSpace+1);
			length = spaceOne - firstSpace;
			let name = spaceOne>-1?cleanLine.substr(cleanLine.indexOf('o') + 1,length-1):clearSpace(cleanLine.substring(cleanLine.indexOf('o') + 1));
			des.name = name;
			if(findMacro(name) === undefined){
				logInfo.push('added macro ' + name);
				macros.push(new Macro(name,false,des));
			}
		}
		//Is a short macro
		if(line.includes(" equ")){
			let v = new Info("","");
			v.des = line.substring(line.indexOf(' ',line.indexOf('equ')));
			var first1 = cleanLine.charAt(0);
			let name = clearSpace(line.substring(line.indexOf(first1),line.indexOf(' ',line.indexOf(first1))));
			v.name = name;
			if(findMacro(name) === undefined){
				macros.push(new Macro(name,true,v));
			}
		}
		//is line include
		if(cleanLine.startsWith("include")){
			var fileName : string = line.substring(findSpaceIndex(line));
			fileName = fileName.substring(2,fileName.length - 1);
			if(vscode.workspace.rootPath === undefined){
				vscode.window.showErrorMessage("no root path");
				continue;
			}
			fileName = vscode.workspace.rootPath + '\\' + fileName;
			var ext = await fstream.existsSync(fileName);
			if(!ext || includedFiles.indexOf(fileName) > -1){
				continue;
			}
			let filedata : string = fstream.readFileSync(fileName,'utf8');
			filedata=filedata
			let doc = filedata.split('\n');
			let name = '/' + fileName;
			while(name.includes('\\')){
				name = name.replace('\\','/');
			}
			includedFiles.push(name);
			await sacnDoc(doc,false);
		}
	}
	console.log(structs);
	
	return new Promise(resolve => {
		setTimeout(() => {
			resolve(2);
		},10);
	});
}



function filesInWorkspace() : string[] {
	let files : string[] = [];

	let path = vscode.workspace.rootPath;
	if(path === undefined){
		return [];
	}
	if(vscode.window.activeTextEditor === undefined){
		return [];
	}
	var uri = vscode.window.activeTextEditor.document.uri;
	let allFiles = fstream.readdirSync(path);
	allFiles.forEach(file => {
		
		var dotEnd = file.lastIndexOf('.');
		if(dotEnd >= 0){
			if(uri.fsPath !== vscode.workspace.rootPath + "\\" + file){
				var ext = file.substring(dotEnd + 1);
				if(ext === 'asm'){
					files.push(file);
				}
			}
		}
	});

	return files;
}

class Label {
	name : string;
	value : string;

	constructor(name: string,value:string){
		this.name = name;
		this.value = value;
	}
}

function split_line(line : string) : string[] {
	let array : string[] = [];
	var word : string = "";
	for (let i = 0; i < line.length; i++) {
		if(lineCutters.indexOf(line[i]) >= 0){
			if(!isAllSpace(word)){
				array.push(word);
			}
			word = "";
			continue;
		}
		word += line[i];
	}
	return array;
}

function doucmentToStringArray(str:vscode.TextDocument) : string[] {
	let array : string[] = [];
	for (let i = 0; i < str.lineCount; i++) {
		const line = str.lineAt(i);
		array.push(line.text);
	}
	return array;
}

const modernInterrupts = [
	["21h","Dos interrupt.",""],
	["16h","Bios interrupt.",""],
	["10h","Graphic interrupt.",""],
	["33h","Mouse interrupt",""]
];
function matchStructure(name:string) : string[] {
	let out : string[] = [];

	for (let i = 0; i < vars.length; i++) {
		const variable = vars[i];
		if(variable.name === name){
			//if names match show possible outcomes
			for (let j = 0; j < structureInfo.length; j++) {
				const struct = structureInfo[j];
				if(variable.type === struct.name){
					for (let q = 0; q < struct.values.length; q++) {
						const value = struct.values[q];
						out.push(value);
					}
					break;
				}
			}
		}
	}

	return out;
}
class AsmCompiltor implements vscode.CompletionItemProvider {

	private completions: vscode.CompletionList | undefined;

	private getItemKindFromSymbolKind(kind : KeywordType) {
		switch (kind) {
			case KeywordType.Instruction:
				return vscode.CompletionItemKind.Keyword;
			case KeywordType.MemoryAllocation:
				return vscode.CompletionItemKind.Keyword;
			case KeywordType.PreCompileCommand:
				return vscode.CompletionItemKind.Interface;
			case KeywordType.Register:
				return vscode.CompletionItemKind.Constant;
			case KeywordType.SavedWord:
				return vscode.CompletionItemKind.Property;
			case KeywordType.Size:
				return vscode.CompletionItemKind.Constructor;
			case KeywordType.Variable:
				return vscode.CompletionItemKind.Variable;
			case KeywordType.Method:
				return vscode.CompletionItemKind.Method;
			case KeywordType.Structure:
				return vscode.CompletionItemKind.Struct;
			case KeywordType.Label:
				return vscode.CompletionItemKind.Unit;
			case KeywordType.Macro:
				return vscode.CompletionItemKind.Color;
			case KeywordType.File:
				return vscode.CompletionItemKind.File;
			case KeywordType.MacroLabel:
				return vscode.CompletionItemKind.TypeParameter;
			default:
				return 0;
		}
	}
	
	public static GetKeywordAsDef(name : string) : KeywordDef | undefined {
		for (let i = 0; i < KEYWORD_DICONTARY.length; i++) {
			const keyword = KEYWORD_DICONTARY[i];
			if(keyword.name === name){
				return keyword;
			}
		}

		return undefined;
	}
	private addInterupts(){
		if(this.completions === undefined) {
			return;
		}
		for (let i = 0; i < modernInterrupts.length; i++) {
			const int = modernInterrupts[i];
			let item : vscode.CompletionItem = new vscode.CompletionItem(int[0],vscode.CompletionItemKind.Reference);
			item.sortText = ("0000" + this.completions.items.length).slice(-4);
			item.documentation = int[2];
			
			item.detail = "(number) " + int[1];
			this.completions.items.push(item);
		}
	}
	private newItemDirect(name : string,type : KeywordType = KeywordType.Label,det : string = '',des : string = ""){
		if(this.completions === undefined) {
			return;
		}
		let item : vscode.CompletionItem = new vscode.CompletionItem(name,this.getItemKindFromSymbolKind(type));
		item.sortText = ("0000" + this.completions.items.length).slice(-4);
		item.documentation = des;
		item.detail = det;
		if(type === KeywordType.Variable){
			item.insertText = '['+name+']';
		}
		this.completions.items.push(item);
	}
	private newItemStructV(name : string){
		if(this.completions === undefined) {
			return;
		}
		let item : vscode.CompletionItem = new vscode.CompletionItem(name,this.getItemKindFromSymbolKind(KeywordType.Variable));
		item.sortText = ("0000" + this.completions.items.length).slice(-4);
		this.completions.items.push(item);
	}
	private newItem(keyword : string){
		const def : KeywordDef | undefined = AsmCompiltor.GetKeywordAsDef(keyword);
		if(def === undefined || this.completions === undefined) {
			return;
		}
		let item : vscode.CompletionItem = new vscode.CompletionItem(def.name,this.getItemKindFromSymbolKind(def.type));
		item.detail = getType(def.type) + " " + def.name;
		item.documentation = def.def;
		item.sortText = ("0000" + this.completions.items.length).slice(-4);
		this.completions.items.push(item);
	}
	private newItemFile(name : string){
		if(this.completions === undefined) {
			return;
		}
		let item : vscode.CompletionItem = new vscode.CompletionItem(name,this.getItemKindFromSymbolKind(KeywordType.File));
		item.insertText = "\"" + name + "\"";
		item.sortText = ("0000" + this.completions.items.length).slice(-4);
		this.completions.items.push(item);
	}

	async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
		this.completions = new vscode.CompletionList();
		await sacnDoc(doucmentToStringArray(document));
		let line = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
		if (!line) {
			return this.completions;
		}
		let comment = line.match(/^[^\"]*#[^\{].*$/);
		let quotes = line.match(/(\")/g) || line.match(/(\'')/g);
		if (quotes || comment) { // Check if line isn't a comment or string
			return this.completions;
		}
		let words : string[] = split_line(line);
		let column = (position.character > 2) ? (position.character - 2) : 0;
		let posDot = new vscode.Position(position.line, column + 1);
		let posColons = new vscode.Position(position.line, column);
		let wordRange = document.getWordRangeAtPosition(posDot) || document.getWordRangeAtPosition(posColons);
		if(words.length <= 0){
			//Show command list
			for (let i = 0; i < KEYWORD_DICONTARY.length; i++) {
				const word = KEYWORD_DICONTARY[i];
				if(word.type === KeywordType.Instruction ||
					word.type === KeywordType.SavedWord || word.type === KeywordType.PreCompileCommand){
					this.newItem(word.name);
				}
			}
			for (let i = 0; i < macros.length; i++) {
				const macro = macros[i];
				if(!macro.short){
					this.newItemDirect(macro.name,KeywordType.Macro,"(Macro) " + macro.name);
				}
			}
		}else if(words.length > 0 && context.triggerCharacter === '.'){
			const word = document.getText(wordRange);
			let x = findVar(word);
			if(x !== undefined){
				let possibleOutcomes = matchStructure(x.name);
				for (let i = 0; i < possibleOutcomes.length; i++) {
					const outcome = possibleOutcomes[i];
					this.newItemStructV(outcome);
				}
			}
			return filter(this.completions);
		}
		else if(words.length > 0){
			//Show registers and variables
			const word = AsmCompiltor.GetKeywordAsDef(words[0]);
			if(word === undefined) {
				this.newItem("dd");
				this.newItem("dt");
				this.newItem("dw");
				this.newItem("dq");
				this.newItem("db");
				this.newItem("equ");
				for (let i = 0; i < structs.length; i++) {
					const ss = structs[i];					
					this.newItemDirect(ss,KeywordType.Structure);			
				}
				return filter(this.completions);
			}else{
				if(words[0] === "proc" || words[0] === "macro" || words[0] === "struct"){
					return;
				}
				if(words[0] === "include"){
					var files = filesInWorkspace();
					files.forEach(file => {
						this.newItemFile(file);
					});
					return filter(this.completions);
				}
				if(words[0] === "ifdef" || words[0] === "ifndef"){
					labelsEE.forEach(label => {
						this.newItemDirect(label.name,KeywordType.MacroLabel);
					});
					return filter(this.completions);
				}
				if(words[0] === "int"){
					this.addInterupts();
					return filter(this.completions);
				}
				if(words[0] === "in" || words[0] === "out"){
					this.newItem("al");
					this.newItem("ax");
					return filter(this.completions);
				}
				if(words[0] === "call" || words[0] === "endp"){
					for (let i = 0; i < procs.length; i++) {
						const proc = procs[i];
						this.newItemDirect(proc.name,KeywordType.Method,"(Procedure) " + proc.name,proc.description.des);
					}
					return filter(this.completions);
				}
				if(words[0] === "endm"){
					//Add macros
					for (let i = 0; i < macros.length; i++) {
						const macro = macros[i];
						if(!macro.short){
							this.newItemDirect(macro.name,KeywordType.Macro,"(Macro) " + macro.name);
						}
					}
					return filter(this.completions);
				}
				if(words[0] === "ends"){
					//Add macros
					for (let i = 0; i < structs.length; i++) {
						const macro = structs[i];
						
						this.newItemDirect(macro,KeywordType.Structure);
					}
					return filter(this.completions);
				}
				//Show only variables
				if(words[2] === "offset" || words[0] === "if" || words[0] === "ife"){
					//Add variables
					for (let i = 0; i < vars.length; i++) {
						const ss = vars[i];
						if(AllowKey(word.allowType,KeywordType.Variable)){
							this.newItemDirect(ss.name,KeywordType.Variable);
						}
					}
					for (let i = 0; i < structs.length; i++) {
						const ss = structs[i];
						if(AllowKey(word.allowType,KeywordType.Variable)){
							this.newItemDirect(ss,KeywordType.Structure);
						}
					}
					return filter(this.completions);
				}
				//exit if too much
				if(word.opCount < words.length){
					return;
				}
				//Add labels
				for (let i = 0; i < labels.length; i++) {
					const ss = labels[i];
					if(AllowKey(word.allowType,KeywordType.Label)){
						this.newItemDirect(ss);
					}
				}
				//Add variables
				for (let i = 0; i < vars.length; i++) {
					const ss = vars[i];
					if(AllowKey(word.allowType,KeywordType.Variable)){
						this.newItemDirect(ss.name,KeywordType.Variable);
					}
				}
				
				//Add short macros
				for (let i = 0; i < macros.length; i++) {
					const ss = macros[i];
					if(AllowKey(word.allowType,KeywordType.Variable) && ss.short){
						this.newItemDirect(ss.name,KeywordType.Macro,"(Macro) " + ss.name);
					}
				}
				//Add macros
				for (let i = 0; i < macros.length; i++) {
					const macro = macros[i];
					if(!macro.short){
						this.newItemDirect(macro.name,KeywordType.Macro,"(Macro) " + macro.name);
					}
				}
				//Add keywords
				for (let i = 0; i < KEYWORD_DICONTARY.length; i++) {
					const fs = KEYWORD_DICONTARY[i];
					if(AllowKey(word.allowType,fs.type)){
						this.newItem(fs.name);
					}
				}
			}
		}

		return filter(this.completions);
	}

}

function AllowKey(allowType:AllowKinds,kind: KeywordType) : boolean {
	if(allowType === AllowKinds.All) {
		return true;
	}else if(allowType === AllowKinds.Inst && (kind === KeywordType.Register ||
		kind === KeywordType.Variable || kind === KeywordType.Structure)){
		return true;
	}
	else if(allowType === AllowKinds.Memory && kind === KeywordType.Register){
		return true;
	}else if(allowType === AllowKinds.Size && kind === KeywordType.Size){
		return true;
	}else if(allowType === AllowKinds.Variables && (kind === KeywordType.Variable || kind === KeywordType.Structure)){
		return true;
	}else if(allowType === AllowKinds.Label && kind === KeywordType.Label){
		return true;
	}
	return false;
}

const autoScanDoc = async (change : vscode.TextDocumentChangeEvent) => {
	if(vscode.window.activeTextEditor === undefined){
		return;
	}
	let doc : string = await fstream.readFileSync(vscode.window.activeTextEditor.document.uri.fsPath,'utf8');
	let fin : string[] = doc.split('\n');
	sacnDoc(fin);
};
const autoScanDoc2 = async (change : vscode.TextDocument) => {
	let fin = doucmentToStringArray(change);
	sacnDoc(fin);
};
const autoScanDoc3 = async (change : vscode.TextEditor | undefined) => {
	if(change === undefined){
		return;
	}
	let fin = doucmentToStringArray(change.document);
	sacnDoc(fin);
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function hoveractivate(context: vscode.ExtensionContext) {
	vscode.workspace.onDidChangeTextDocument(e => autoScanDoc(e));
	vscode.workspace.onDidOpenTextDocument(e => autoScanDoc2(e));
	vscode.workspace.onDidSaveTextDocument(e => autoScanDoc2(e));
	vscode.window.onDidChangeActiveTextEditor(e => autoScanDoc3(e));
	context.subscriptions.push(vscode.languages.registerHoverProvider('assembly',new TasmHoverProvider()));
	//context.subscriptions.push(vscode.languages.registerCompletionItemProvider('assembly',new AsmCompiltor(),',','+','\n','-','.'));
}


// this method is called when your extension is deactivated
export function deactivate() {}
