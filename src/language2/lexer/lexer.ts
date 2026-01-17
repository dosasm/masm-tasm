import { Position, Token, TokenType } from "./token";

export class Lexer {
  private pos = 0;
  private position={
    col:0,
    line:0
  }

  constructor(public input: string) {}

  get currentPos(): number {
    return this.pos;
  }

  get currentPos2():Position{
    return {...this.position,offset:this.pos}
  }

  private peek(): string {
    return this.input[this.pos] ?? "";
  }

  private advance(): string {
    if(this.peek()==="\n"){
      this.position.line++;
      this.position.col=0;
    }else{
      this.position.col++;
    }
    return this.input[this.pos++] ?? "";
  }

  debug_current(a=0,b=10):string{
    return this.input.substring(this.pos-a,this.pos+b)
  }

  nextToken(): Token {
    while (/\s/.test(this.peek())) {
      if (this.peek() === "\n") {
        const pos=this.currentPos2;
        this.advance();
        return { type: TokenType.NewLine,pos };
      }
      this.advance();
    }

    const ch = this.peek();
    if (!ch) return { type: TokenType.EOF ,pos:this.currentPos2};

    if (ch === "'") {
      const pos=this.currentPos2;
      this.advance(); // eat '
      let value = "";
      while (this.peek() !== "'" && this.peek() !== "\n" && this.peek() !== "") {
        value += this.advance();
      }
      if (this.peek() === "'") {
        this.advance(); // eat '
      }
      return { type: TokenType.String, value,pos };
    }

    if (ch === '"') {
      const pos=this.currentPos2;
      this.advance(); // eat '
      let value = "";
      while (this.peek() !== '"' && this.peek() !== "\n" && this.peek() !== "") {
        value += this.advance();
      }
      if (this.peek() === '"') {
        this.advance(); // eat '
      }
      return { type: TokenType.String, value,pos };
    }

    if (ch === "@") {
      const pos = this.currentPos2;
      this.advance(); // eat '@'
      let value = "";
      while (/[A-Za-z0-9_.]/.test(this.peek())) {
        value += this.advance();
      }
      return { type: TokenType.AtIdentifier, value, pos };
    }

    if (/[A-Za-z_.]/.test(ch)) {
      let value = "";
      const pos = this.currentPos2;
      while (/[A-Za-z0-9_.\/\\]/.test(this.peek())) {
        value += this.advance();
      }
      if (value.toLowerCase() === "ptr") {
        return { type: TokenType.Ptr, value, pos };
      }
      return { type: TokenType.Identifier, value, pos };
    }

    if (/[0-9]/.test(ch)) {
      let value = "";
      const pos=this.currentPos2;
      while (/[0-9A-Fa-fHhOoQqBbx]/.test(this.peek())) {
        value += this.advance();
      }
      return { type: TokenType.Number, value,pos };
    }

    const pos=this.currentPos2;
    const char=this.advance();
    switch (char) {
      case ",":
        return { type: TokenType.Comma,pos };
      case ":":
        return { type: TokenType.Colon,pos };
      case "[":
        return { type: TokenType.LBracket,pos };
      case "]":
        return { type: TokenType.RBracket,pos };
      case "<":
        return { type: TokenType.LAngleBracket,pos };
      case ">":
        return { type: TokenType.RAngleBracket,pos };
      case "(":
        return { type: TokenType.LParen,pos };
      case ")":
        return { type: TokenType.RParen,pos };
      case "+":
        return { type: TokenType.Plus,pos };
      case "-":
        return { type: TokenType.Minus,pos };
      case "*":
        return { type: TokenType.Star,pos };
      case "/":
        return { type: TokenType.Slash,pos };
      case "?":
        return { type: TokenType.Question,pos };
      case ";":
        // Collect comment until end of line
        const commentPos = {
          offset:this.pos-1,
          line:this.position.line,
          col:this.position.col-1
        }; // pos is already advanced
        let commentValue = ";";
        while (this.peek() !== "\n" && this.peek() !== "") {
          commentValue += this.advance();
        }
        return { type: TokenType.Comment, value: commentValue, pos: commentPos };
    }

    const e=new Error(`Unexpected character`);
    e.message=`Unexpected character ${char}`
    e.message+=this.debug_current();
    throw e
  }
}
