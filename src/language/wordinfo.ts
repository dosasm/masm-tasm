import * as nls from 'vscode-nls';
nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export function isNumberStr(str: string): boolean {
	const a = str.match(/([01]+[Bb]|[0-7]+[Qq]|[0-9][0-9A-Fa-f]*[Hh]|[0-9]+[Dd]?)/);
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
export function getNumMsg(word: string): string {
	const base: number = word.endsWith('h') ? 16 : word.endsWith('q') ? 8 : word.endsWith('b') ? 2 : 10;
	const value: number = Number.parseInt(word, base);
	const hex = localize("num.hex", "Hexadecimal  Number");
	const oct = localize("num.oct", "Octal  Number");
	const dec = localize("num.dec", "Decimal  Number");
	const bin = localize("num.bin", "Binary  Number");
	let s = "(" + (base === 16 ? hex : base === 8 ? oct : base === 10 ? dec : bin) + ") " + word + ":\n\n";
	s += " `DEC`: " + value.toString(10) + "D\n\n";
	s += " `HEX`: " + value.toString(16) + "H\n\n";
	s += " `OCT`: " + value.toString(8) + "Q\n\n";
	s += " `BIN`: " + value.toString(2) + "B\n\n";
	const a = asciiname[value];
	if (a) { s += " `ASCII`: " + a; }
	return s;
}
export function getcharMsg(char: string): string {
	const value = char.charCodeAt(0);
	let s = "(ASCII) '" + char + "'\n\n";
	s += " `DEC`: " + value.toString(10) + "D\n\n";
	s += " `HEX`: " + value.toString(16) + "H\n\n";
	s += " `OCT`: " + value.toString(8) + "Q\n\n";
	s += " `BIN`: " + value.toString(2) + "B\n\n";
	return s;
}
export enum KeywordType {
	MacroLabel, File, Instruction, Register, PreCompileCommand, MemoryAllocation, SavedWord, Size, Variable, Procedure, Structure, Macro, Label, Segment
}
export function getType(type: KeywordType | string): string {
	let itsType;
	if (typeof (type) === 'string') {
		for (const key in KeywordType) {
			if (key === type) {
				itsType = KeywordType[key];
			}
		}
	}
	else {
		itsType = type;
	}
	switch (itsType) {
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
	return type.toString();
}