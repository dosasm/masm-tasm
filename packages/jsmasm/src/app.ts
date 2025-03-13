// This file is intentionally left blank.
import { Lexer, Token, TokenType } from "./lexer";
import { Parser } from "./parser";

const input = `
; a simple hello  word sample
 .386
DATA SEGMENT USE16
	MESG DB 'hello tasm',0AH,'$'
DATA ENDS
CODE SEGMENT USE16
	     ASSUME CS:CODE,DS:DATA
	BEG: MOV    AX,DATA
	     MOV    DS, AX
	     MOV    CX,8
	LAST:MOV    AH,9
	     MOV    DX, OFFSET MESG
	     INT    21H
	     LOOP   LAST
	     MOV    AH,4CH
	     INT    21H            	;BACK TO DOS
CODE ENDS
END  BEG
`; // Replace with your file path
let lexer = new Lexer(input);

let token: Token;
while ((token = lexer.nextToken()).type !== TokenType.EOF) {
  console.log(token);
}
lexer = new Lexer(input);

const parser = new Parser(lexer);
const ast = parser.parse();
const errors = parser.getErrors();

console.log(JSON.stringify(ast, null, 2));
if (errors.length > 0) {
  console.error("Errors:");
  console.error(JSON.stringify(errors, null, 2));
}