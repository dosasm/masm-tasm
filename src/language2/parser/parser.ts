import { Lexer } from "../lexer/lexer";
import { Token, TokenType } from "../lexer/token";
import { ProgramNode } from "../ast/nodes";
import { parseStatement } from "./statement";

export class Parser {
  current: Token;

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

  parseStatement() {
    let leadingComments: string[] = [];
    while (this.current.type === TokenType.NewLine || this.current.type === TokenType.Comment) {
      if (this.current.type === TokenType.Comment) {
        leadingComments.push(this.current.value!);
      }
      this.eat(this.current.type);
    }
    const result = parseStatement(this);
    (result as any).comments = { leading: leadingComments, trailing: [] };
    let trailingComments: string[] = [];
    //@ts-ignore
    while (this.current.type === TokenType.NewLine || this.current.type === TokenType.Comment) {
      if (this.current.type === TokenType.Comment) {
        trailingComments.push(this.current.value!);
      }
      this.eat(this.current.type);
    }
    (result as any).comments.trailing = trailingComments;
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
        index: 0,
        end: this.lexer.currentPos
      }
    };
  }
}
