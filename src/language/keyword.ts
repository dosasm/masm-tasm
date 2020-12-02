import { MarkdownString, env, Uri, workspace } from "vscode";
import { getType } from "./wordinfo";
interface KEYINFO {
	name: string;
	syntax?: string;
	info?: string;
	chs?: string;
	alias?: string[];
}
function markdown(key: KEYINFO, type: string): MarkdownString {
	let md = new MarkdownString(getType(type) + " **" + key.name + "**\n\n");
	let description = key.info;
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
	md.appendCodeblock("Syntax: " + key.syntax, "assembly");
	return md;
}

export class HoverDICT {
	KEYWORD_DICONTARY: { [id: string]: KEYINFO[] } | undefined
	constructor(fileuri: Uri) {
		workspace.fs.readFile(fileuri).then(
			(value) => {
				let hoverJSON = JSON.parse(value.toString())
				this.KEYWORD_DICONTARY = hoverJSON
			}
		)
	}
	public GetKeyword(word: string): MarkdownString | undefined {
		let res: any;
		if (this.KEYWORD_DICONTARY) {
			//TODO:type
			for (let n in this.KEYWORD_DICONTARY) {
				if (Array.isArray(this.KEYWORD_DICONTARY[n])) {
					//console.log(n)
					for (let i = 0; i < this.KEYWORD_DICONTARY[n].length; i++) {
						const keyword = this.KEYWORD_DICONTARY[n][i];
						if (keyword.name === word) { res = keyword; return markdown(res, n); }
						if (keyword.alias) {
							for (let i = 0; i < keyword.alias.length; i++) {
								const alia = keyword.alias[i];
								if (alia === word) { res = keyword; return markdown(res, n); }
							}
						}
					}
				}
			}
		}
		return;
	}
}

