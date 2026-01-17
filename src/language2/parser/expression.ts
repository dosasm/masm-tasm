import { TokenType } from "../lexer/token";
import { ExprNode, NumberExpr } from "../ast/expr";
import { Parser } from "./parser";

const PRECEDENCE: Record<number, number> = {
  [TokenType.Plus]: 10,
  [TokenType.Minus]: 10,
  [TokenType.Star]: 20,
  [TokenType.Slash]: 20,
};

export function parseExpression(parser: Parser, prec = 0): ExprNode {
  let left = parsePrimary(parser);

  while (true) {
    const p = PRECEDENCE[parser.current.type];
    if (p === undefined || p <= prec) break;

    const op = parser.current.type;
    parser.eat(op);
    const right = parseExpression(parser, p);

    left = {
      type: "BinaryExpr",
      operator: tokenToOp(op),
      left,
      right,
    };
  }

  return left;
}

function parserNumber(value:string){
  let radix = 10; let type: "hex" | "oct" | "dec" | "bin" = "dec";
    if (value?.endsWith("h") || value?.endsWith("H")) {
      radix = 16;
      type = "hex";
    }
    if (value?.endsWith("b") || value?.endsWith("B")) {
      radix = 2;
    }
    if (["o", "O", "q", "Q"].some(a => value?.endsWith(a))) {
      radix = 8;
      type = "oct";
    }
    let output: NumberExpr = {
      value: 0,
      expr: value,
      type: "Number"
    };
    
    if (type !== "dec") {
      value = value.substring(0, value.length - 1)
    }
    output.value = parseInt(value, radix)
    return output;
}

function parsePrimary(parser: Parser): ExprNode {
  if (parser.current.type === TokenType.Number) {
    return parserNumber(parser.eat(TokenType.Number).value!)
  }

  if (parser.current.type === TokenType.Identifier) {
    return {
      type: "Identifier",
      name: parser.eat(TokenType.Identifier).value!,
    };
  }

  if (parser.current.type === TokenType.LParen) {
    parser.eat(TokenType.LParen);
    const expr = parseExpression(parser);
    parser.eat(TokenType.RParen);
    return expr;
  }

  if (parser.current.type === TokenType.Minus) {
    parser.eat(TokenType.Minus);
    return {
      type: "UnaryExpr",
      operator: "-",
      operand: parsePrimary(parser),
    };
  }

  throw new Error("Invalid expression");
}

function tokenToOp(t: TokenType): "+" | "-" | "*" | "/" {
  return t === TokenType.Plus
    ? "+"
    : t === TokenType.Minus
    ? "-"
    : t === TokenType.Star
    ? "*"
    : "/";
}
