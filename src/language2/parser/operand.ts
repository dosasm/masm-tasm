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
    const start=parser.current.pos;
    const output=parseExpression(parser)
    const end=parser.current.pos;
    const expr=parser.substring(start,end).trim();
    //@ts-ignore
    if (parser.current.type===TokenType.Identifier) {
      if(parser.current.value&& parser.current.value.toUpperCase() === "DUP")
        parser.eat(parser.current.type);
        parser.eat(TokenType.LParen);
        const value = parseOperand(parser);
        parser.eat(TokenType.RParen);
        return { kind: "Dup", value, prefix:output};
      }
    return {
      kind: "Immediate",
      value: output
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
      // segment:... - could be segment:register OR segment: <size> PTR [expr] OR segment:[expr]
      parser.eat(TokenType.Colon);
      // CASE: segment:[expr]
      if (parser.current.type === TokenType.LBracket) {
        parser.eat(TokenType.LBracket);
        const expr = parseExpression(parser);
        parser.eat(TokenType.RBracket);
        return { kind: "Memory", expr, segment: name };
      }
      // CASE: segment:size PTR ...  (e.g., ES: WORD PTR [DI])
      if (parser.current.type === TokenType.Identifier) {
        const ident = parser.eat(TokenType.Identifier).value!;
        // if next is Ptr or LBracket, treat as size + ptr memory
        if (parser.current.type === TokenType.Ptr) {
          parser.eat(TokenType.Ptr);
          // bracketed memory
          if (parser.current.type === TokenType.LBracket) {
            parser.eat(TokenType.LBracket);
            const expr = parseExpression(parser);
            parser.eat(TokenType.RBracket);
            return { kind: "Memory", expr, segment: name };
          }
          // otherwise parse following operand
          const inner = parseOperand(parser);
          // if inner is Memory, attach segment
          if (inner.kind === 'Memory') {
            return { kind: 'Memory', expr: inner.expr, segment: name };
          }
          // fallback: treat as SegmentRegister (segment:ident)
          return { kind: "SegmentRegister", segment: name, register: ident };
        }

        // if next is LParen etc, fallback to segment:register
        return { kind: "SegmentRegister", segment: name, register: ident };
      }
      // otherwise error
      throw new Error("Expected identifier or '[' after colon in segment:...");
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
      if (name.toUpperCase() === "SEG") {
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
  e.message+=parser.debug_current();
  throw e;
}
