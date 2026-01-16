import { Lexer } from "../lexer/lexer";
import { Token, TokenType } from "../lexer/token";
import { ProgramNode } from "../ast/nodes";
import { parseStatement } from "./statement";

export class Parser {
  current: Token;

  public get currentPos(){
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

  parseStatement() {
    while (this.current.type === TokenType.NewLine) {
      this.eat(TokenType.NewLine);
    }
    const result = parseStatement(this);
    // @ts-ignore
    while (this.current.type === TokenType.NewLine) {
      this.eat(TokenType.NewLine);
    }
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
    return { type: "Program", body, trace: { filePath: this.filePath, index: 0 } };
  }
}
