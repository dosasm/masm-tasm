import { TokenType } from "../lexer/token";
import { OperandNode } from "../ast/nodes";
import { parseExpression } from "./expression";
import { Parser } from "./parser";

export function parseOperand(parser: Parser): OperandNode {
  if (parser.current.type === TokenType.Number) {
    return {
      kind: "Immediate",
      value: parseInt(parser.eat(TokenType.Number).value!, 16),
    };
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
      if (name === "OFFSET") {
        const expr = parseExpression(parser);
        return { kind: "Offset", expr };
      }
      if (name === "DUP") {
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
