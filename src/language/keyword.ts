import { MarkdownString, env } from "vscode";
import { getType } from "./wordinfo";
enum AllowKinds {
	Memory, Variables, Constants, All, Size, None, Inst, Macro, Label, Interrupt
}
enum KeywordType {
	MacroLabel, File, Instruction, Register, PreCompileCommand, MemoryAllocation, SavedWord, Size, Variable, Procedure, Structure, Macro, Label, Segment
}
class ASMKEYWORD {
	opCount: number;
	name: string;
	description: string;
	chs: string | undefined;
	synopsis: string;
	type: KeywordType;
	allowType: AllowKinds;
	alias: string[] | undefined;
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
		this.name = name;
		this.alias = alias;
		if (data !== undefined) {
			this.synopsis = data;
		} else {
			this.synopsis = name + " [operand], [operand]";
		}

		if (allow === undefined) {
			this.allowType = AllowKinds.Inst;
		} else {
			this.allowType = allow;
		}
		this.opCount = count;
		this.type = type;
		this.description = def;
	}
}
function markdown(key: ASMKEYWORD): MarkdownString {
	let md = new MarkdownString(getType(key.type) + " **" + key.name + "**\n\n");
	let description = key.description;
	if (env.language === "zh-cn" && key.chs) { description = key.chs; }
	md.appendMarkdown(description + "\n\n");
	if (key.alias) {
		let msg = "alias: ";
		let i: number;
		for (i = 0; i < key.alias.length - 1; i++) {
			msg += "`" + key.alias[i] + "`,";
		}
		msg += "`" + key.alias[i] + "`";
		md.appendMarkdown(msg);
	}
	md.appendCodeblock("Synopsis: " + key.synopsis, "assembly");
	return md;
}
let KEYWORD_DICONTARY: ASMKEYWORD[] = [];
export function Dictionary(str: string) {
	let KeywordObj = JSON.parse(str);
	if (KeywordObj) { KEYWORD_DICONTARY = KeywordObj.keywords; }

}
export function GetKeyword(word: string): MarkdownString | undefined {
	let res: ASMKEYWORD | undefined;
	for (let i = 0; i < KEYWORD_DICONTARY.length; i++) {
		const keyword = KEYWORD_DICONTARY[i];
		if (keyword.name === word) { res = keyword; }
		if (keyword.alias) {
			for (let i = 0; i < keyword.alias.length; i++) {
				const alia = keyword.alias[i];
				if (alia === word) { res = keyword; }
			}
		}
	}
	if (res) { return markdown(res); }
	return;
}

