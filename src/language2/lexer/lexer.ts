import { Token, TokenType } from "./token";

export class Lexer {
  private pos = 0;

  constructor(private input: string) {}

  get currentPos(): number {
    return this.pos;
  }

  private peek(): string {
    return this.input[this.pos] ?? "";
  }

  private advance(): string {
    return this.input[this.pos++] ?? "";
  }

  debug_current(a=0,b=10):string{
    return this.input.substring(this.pos-a,this.pos+b)
  }

  nextToken(): Token {
    while (/\s/.test(this.peek())) {
      if (this.peek() === "\n") {
        this.advance();
        return { type: TokenType.NewLine };
      }
      this.advance();
    }

    const ch = this.peek();
    if (!ch) return { type: TokenType.EOF };

    if (ch === "'") {
      this.advance(); // eat '
      let value = "";
      while (this.peek() !== "'" && this.peek() !== "\n" && this.peek() !== "") {
        value += this.advance();
      }
      if (this.peek() === "'") {
        this.advance(); // eat '
      }
      return { type: TokenType.String, value };
    }

    if (/[A-Za-z_.]/.test(ch)) {
      let value = "";
      while (/[A-Za-z0-9_.]/.test(this.peek())) {
        value += this.advance();
      }
      return { type: TokenType.Identifier, value };
    }

    if (/[0-9]/.test(ch)) {
      let value = "";
      while (/[0-9A-Fa-f]/.test(this.peek())) {
        value += this.advance();
      }
      return { type: TokenType.Number, value };
    }

    const char=this.advance();
    switch (char) {
      case ",":
        return { type: TokenType.Comma };
      case ":":
        return { type: TokenType.Colon };
      case "[":
        return { type: TokenType.LBracket };
      case "]":
        return { type: TokenType.RBracket };
      case "(":
        return { type: TokenType.LParen };
      case ")":
        return { type: TokenType.RParen };
      case "+":
        return { type: TokenType.Plus };
      case "-":
        return { type: TokenType.Minus };
      case "*":
        return { type: TokenType.Star };
      case "/":
        return { type: TokenType.Slash };
      case ";":
        // Skip comment until end of line
        while (this.peek() !== "\n" && this.peek() !== "") {
          this.advance();
        }
        return this.nextToken(); // Recurse to get next token
    }

    const e=new Error(`Unexpected character`);
    e.message=`Unexpected character ${char}`
    e.message+=this.debug_current();
    throw e
  }
}
