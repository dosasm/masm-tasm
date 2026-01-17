import { Lexer } from "../lexer/lexer";
import { positionOffset, Token, TokenType } from "../lexer/token";
import { ASTNode, ProgramNode } from "../ast/nodes";
import { parseStatement } from "./statement";

export class Parser {
  current: Token;

  debug_current() {
    return this.lexer.debug_current()
  }

  substring(start: number, end: number) {
    return this.lexer.input.substring(start, end)
  }

  public currentPos() {
    return this.lexer.currentPos
  }

  constructor(private lexer: Lexer, public filePath: string) {
    this.current = lexer.nextToken();
  }

  eat(type: TokenType): Token {
    if (this.current.type !== type) {
      const e = new Error("Unexpected token");
      e.message = "Unexpected token expect " + TokenType[type] + " but get " + TokenType[this.current.type];
      e.message += this.lexer.debug_current()
      throw e;
    }
    const t = this.current;
    this.current = this.lexer.nextToken();
    return t;
  }

  parseStatement(): ASTNode {
    while (this.current.type === TokenType.NewLine || this.current.type === TokenType.Comment) {
      const t = this.eat(this.current.type);
      if (t.type === TokenType.Comment) {
        const trace = {
          filePath: this.filePath,
          index: t.pos,
          end: positionOffset(t.pos, t.value ? t.value.length : 0),
        }
        return {
          type: "Comment",
          value: t.value!,
          trace,
        }
      }
    }
    const result = parseStatement(this);
    return result;
  }

  parseProgram(): ProgramNode {
    const body = [];
    while (this.current.type !== TokenType.EOF) {
      const stmt = this.parseStatement();

      if (stmt.type === "Program") {
        body.push(...stmt.body);
      } else {
        body.push(stmt);
      }
    }
    return {
      type: "Program",
      body,
      trace: {
        filePath: this.filePath,
        index: { line: 0, col: 0, offset: 0 },
        end: this.lexer.currentPos2
      }
    };
  }
}
