import { Parser } from "./parser";
import { ASTNode } from "../ast/nodes";
import { TokenType } from "../lexer/token";
import { parseOperand } from "./operand";

export function parseStatement(parser: Parser): ASTNode {
  const startIndex = parser.current.pos;
  const id = parser.eat(TokenType.Identifier).value!;

  if (parser.current.type === TokenType.Colon) {
    parser.eat(TokenType.Colon);
    return { 
      type: "Label", 
      name: id, 
      trace: { 
        filePath: parser.filePath, 
        index: startIndex,
        end:parser.current.pos
      } };
  }

  if (parser.current.value === "MACRO") {
    return parseMacro(parser, id, startIndex);
  }

  if (id === "IFDEF" || id === "IFNDEF") {
    return parseConditional(parser, id, startIndex);
  }

  const operands = [];
  while (
    parser.current.type !== TokenType.NewLine &&
    parser.current.type !== TokenType.EOF
  ) {
    if (parser.current.type === TokenType.Comma) {
      parser.eat(TokenType.Comma);
      continue;
    }
    operands.push(parseOperand(parser));
  }

  return { type: "Instruction", 
    mnemonic: id, operands, 
    trace: { 
      filePath: parser.filePath, 
      index: startIndex,
      end:parser.current.pos
    } 
  };
}

function parseMacro(parser: Parser, name: string, startIndex: number): ASTNode {
  parser.eat(TokenType.Identifier); // MACRO
  const params: string[] = [];

  while (parser.current.type === TokenType.Identifier) {
    params.push(parser.eat(TokenType.Identifier).value!);
    //@ts-ignore
    if (parser.current.type === TokenType.Comma) { 
      parser.eat(TokenType.Comma);
    }
  }

  const body: ASTNode[] = [];
  while (!(parser.current.value === "ENDM")) {
    body.push(parser.parseStatement());
  }

  parser.eat(TokenType.Identifier);
  return { type: "Macro", name, params, body, trace: { 
    filePath: parser.filePath, 
    index: startIndex,
    end:parser.current.pos } };
}

function parseConditional(parser: Parser, kind: string, startIndex: number): ASTNode {
  const symbol = parser.eat(TokenType.Identifier).value!;
  const thenBody: ASTNode[] = [];
  const elseBody: ASTNode[] = [];

  while (
    parser.current.value !== "ELSE" &&
    parser.current.value !== "ENDIF"
  ) {
    thenBody.push(parser.parseStatement());
  }

  if (parser.current.value === "ELSE") {
    parser.eat(TokenType.Identifier);
    // @ts-ignore
    while (parser.current.value !== "ENDIF") {
      elseBody.push(parser.parseStatement());
    }
  }

  parser.eat(TokenType.Identifier);
  return {
    type: "Conditional",
    kind: kind as any,
    symbol,
    thenBody,
    elseBody: elseBody.length ? elseBody : undefined,
    trace: { 
      filePath: parser.filePath, 
      index: startIndex ,
      end:parser.current.pos}
  };
}
