import { TokenType } from "../lexer/token";
import { ExprNode } from "../ast/expr";
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

function parsePrimary(parser: Parser): ExprNode {
  if (parser.current.type === TokenType.Number) {
    return {
      type: "Number",
      value: parseInt(parser.eat(TokenType.Number).value!, 16),
    };
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
