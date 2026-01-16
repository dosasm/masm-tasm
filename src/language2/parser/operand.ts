import { TokenType } from "../lexer/token";
import { OperandNode } from "../ast/nodes";
import { parseExpression } from "./expression";
import { Parser } from "./parser";

export function parseOperand(parser: Parser): OperandNode {
  if (parser.current.type===TokenType.Question){
    parser.eat(TokenType.Question)
    return {kind:"QuestionExpr",value:"?"}
  }
  
  // support @DATA style identifiers produced by lexer
  if (parser.current.type === TokenType.AtIdentifier) {
    const v = parser.eat(TokenType.AtIdentifier).value!;
    return { kind: "Identifier", name: "@" + v };
  }
  if (parser.current.type === TokenType.Number) {
    let radix = 10; let type: "hex" | "oct" | "dec" | "bin" = "dec";
    if (parser.current.value?.endsWith("h") || parser.current.value?.endsWith("H")) {
      radix = 16;
      type = "hex";
    }
    if (parser.current.value?.endsWith("b") || parser.current.value?.endsWith("B")) {
      radix = 2;
    }
    if (["o", "O", "q", "Q"].some(a => parser.current.value?.endsWith(a))) {
      radix = 8;
      type = "oct";
    }
    let str = parser.eat(TokenType.Number).value!
    let output: OperandNode = {
      kind: "Immediate",
      value: 0,
      type,
      expr:str,
    };
    
    if (type !== "dec") {
      str = str.substring(0, str.length - 1)
    }
    output.value = parseInt(str, radix)
    return output;
  }

  if (parser.current.type === TokenType.String) {
    return {
      kind: "String",
      value: parser.eat(TokenType.String).value!,
    };
  }

  if (parser.current.type === TokenType.Identifier) {
    const name = parser.current.value!;
    parser.eat(TokenType.Identifier);
    //@ts-ignore
    if (parser.current.type === TokenType.Colon) {
      parser.eat(TokenType.Colon);
      if (parser.current.type === TokenType.Identifier) {
        const register = parser.eat(TokenType.Identifier).value!;
        return { kind: "SegmentRegister", segment: name, register };
      } else {
        throw new Error("Expected identifier after colon in segment:register");
      }
    } else {
      // support size specifier + ptr, e.g. "BYTE PTR [BX]" or "WORD PTR var"
      if ((parser.current.type as number) === TokenType.Ptr) {
        parser.eat(TokenType.Ptr);
        // If it's a bracketed memory, parse and return Memory node (ignore size for now)
        // ts-ignore
        if ((parser.current.type as number) === TokenType.LBracket) {
          parser.eat(TokenType.LBracket);
          const expr = parseExpression(parser);
          parser.eat(TokenType.RBracket);
          return { kind: "Memory", expr };
        }
        // Otherwise parse the following operand and return it (size info ignored)
        return parseOperand(parser);
      }
      if (name.toUpperCase() === "OFFSET") {
        const expr = parseExpression(parser);
        return { kind: "Offset", expr };
      }
      if (name.toUpperCase() === "DUP") {
        parser.eat(TokenType.LParen);
        const value = parseOperand(parser);
        parser.eat(TokenType.RParen);
        return { kind: "Dup", value };
      }
      return { kind: "Identifier", name };
    }
  }

  if (parser.current.type === TokenType.LBracket) {
    parser.eat(TokenType.LBracket);
    const expr = parseExpression(parser);
    parser.eat(TokenType.RBracket);
    return { kind: "Memory", expr };
  }

  const e = new Error("Invalid operand");
  e.message = "Invalid operand " + TokenType[parser.current.type];
  throw e;
}
