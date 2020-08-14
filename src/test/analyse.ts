// const labels : Label[] = [];
// const procs: Procedure[] = [];
// const structs: string[] = [];
// const macros : Macro[] = [];
// function findProc(name:string) : Procedure | undefined{
// 	for (const proc of procs) {
// 		if(proc.symbol === name){
// 			return proc;
// 		}
// 	}
// 	return;
// }
// function findmacro(name:string) : Macro | undefined{
// 	for (const macro of macros) {
// 		if(macro.symbol === name){
// 			return macro;
// 		}
// 	}
// 	return;
// }
// function findLabel(name:string) : Label | undefined{
// 	for (const label of labels) {
// 		if(label.symbol === name){
// 			return label;
// 		}
// 	}
// 	return;
// }

// class Procedure {
// 	symbol : string;
// 	body : string;
// 	description:string|undefined;
// 	range: vscode.Range;
// 	constructor(name : string,body:string,range:vscode.Range,description?:string){
// 		this.symbol = name;
// 		this.body=body;
// 		this.range=range
// 		this.description = description;
// 	}
// 	//display markdown information for this procedure
// 	markdownmsg():vscode.MarkdownString{
// 		let md=new vscode.MarkdownString
// 		let name=localize("")
// 		md.appendMarkdown("**"+this.symbol+"**")
// 		if(this.description) md.appendText(this.description)
// 		return md

// 	}
// }

// class Macro {
// 	symbol:string
// 	param:string[]|undefined
// 	description:string|undefined
// 	body:string
// 	range:vscode.Range
// 	constructor(name:string,body:string,range:vscode.Range,des:string,param?:string[])
// 	{
// 		this.param=param
// 		this.symbol = name;
// 		this.body=body;
// 		this.range=range
// 		this.description = des
// 	}
// 	//display markdown information for this macro
// 	markdownmsg():vscode.MarkdownString{
// 		let md=new vscode.MarkdownString
// 		let paramstr:string
// 		if (this.param) {
// 			this.param.forEach(
// 				(item,index)=>{
// 					paramstr+=item+" "
// 				}
// 			)
// 		}
// 		md.appendMarkdown("**"+this.symbol+"**: ")
// 		if(this.description) md.appendText(this.description)
// 		return md
	
// }}

// class Label {
// 	symbol:string
// 	range: vscode.Range
// 	constructor(name:string,range:vscode.Range) {
// 		this.symbol=name
// 		this.range=range
// 	}
// }