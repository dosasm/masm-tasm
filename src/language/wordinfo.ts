import { localize } from '../utils/i18n';

export function isNumberStr(str: string): boolean {
	const a = str.match(/([01]+[Bb]|[0-7]+[Qq]|[0-9][0-9A-Fa-f]*[Hh]|[0-9]+[Dd]?)/);
	if (a && a[0] === str) { return true; }
	return false;
}
const asciiname: string[] = [
	"NUL" + localize("ascii.NUL",),
	"SOH" + localize("ascii.SOH",),
	"STX" + localize("ascii.STX",),
	"ETX" + localize("ascii.ETX",),
	"EOT" + localize("ascii.EOT",),
	"ENQ" + localize("ascii.ENQ",),
	"ACK" + localize("ascii.ACK",),
	"BEL" + localize("ascii.BEL",),
	"BS " + localize("ascii.BS",),
	"HT " + localize("ascii.HT",),
	"LF/NL" + localize("ascii.LFNL",),
	"VT " + localize("ascii.VT",),
	"FF/NP " + localize("ascii.FFNP",),
	"CR" + localize("ascii.CR",),
	"SO" + localize("ascii.SO",),
	"SI" + localize("ascii.SI",),
	"DLE" + localize("ascii.DLE",),
	"DC1/XON" + localize("ascii.DC1",),
	"DC2" + localize("ascii.DC2",),
	"DC3/XOFF" + localize("ascii.DC3",),
	"DC4" + localize("ascii.DC4",),
	"NAK" + localize("ascii.NAK",),
	"SYN" + localize("ascii.SYN",),
	"ETB" + localize("ascii.ETB",),
	"CAN" + localize("ascii.CAN",),
	"EM" + localize("ascii.EM",),
	"SUB" + localize("ascii.SUB",),
	"ESC" + localize("ascii.ESC",),
	"FS" + localize("ascii.FS",),
	"GS" + localize("ascii.GS",),
	"RS" + localize("ascii.RS",),
	"US" + localize("ascii.US",),
	localize("ascii.space",),
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
	"DEL" + localize("ascii.DEL"),
];
export function getNumMsg(word: string): string {
	const base: number = word.endsWith('h') ? 16 : word.endsWith('q') ? 8 : word.endsWith('b') ? 2 : 10;
	const value: number = Number.parseInt(word, base);
	const hex = localize("num.hex",);
	const oct = localize("num.oct",);
	const dec = localize("num.dec",);
	const bin = localize("num.bin",);
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
			return localize("keykind.Command");
		case KeywordType.MemoryAllocation:
			return localize("keykind.Memory",);
		case KeywordType.PreCompileCommand:
			return localize("keykind.Instruction",);
		case KeywordType.Register:
			return localize("keykind.Register",);
		case KeywordType.SavedWord:
			return localize("keykind.Saved",);
		case KeywordType.Size:
			return localize("keykind.Size",);
		case KeywordType.Label:
			return localize("keykind.Label",);
		case KeywordType.Macro:
			return localize("keykind.Macro",);
		case KeywordType.Procedure:
			return localize("keykind.Procedure",);
		case KeywordType.Structure:
			return localize("keykind.Structure",);
		case KeywordType.Variable:
			return localize("keykind.Variable",);
		case KeywordType.Segment:
			return localize("keykind.Segment",);
	}
	return type.toString();
}