// lexer.ts
export enum TokenType {
    // 关键字
    SEGMENT = "SEGMENT",
    ENDS = "ENDS",
    PROC = "PROC",
    ENDP = "ENDP",
    MACRO = "MACRO",
    ENDM = "ENDM",
    ASSUME = "ASSUME",
    OFFSET = "OFFSET",
    DB = "DB",
    DW = "DW",
    DD = "DD",
    INCLUDE = "INCLUDE",
  
    // 标识符
    IDENTIFIER = "IDENTIFIER",
  
    // 数字
    NUMBER = "NUMBER",
  
    // 字符串
    STRING = "STRING",
  
    // 符号
    COLON = "COLON",
    COMMA = "COMMA",
    PLUS = "PLUS",
    MINUS = "MINUS",
    STAR = "STAR",
    SLASH = "SLASH",
    LEFT_PAREN = "LEFT_PAREN",
    RIGHT_PAREN = "RIGHT_PAREN",
  
    // 指令
    DIRECTIVE = "DIRECTIVE",
  
    // 注释
    COMMENT = "COMMENT",
  
    // 换行
    NEWLINE = "NEWLINE",
  
    // 文件结束
    EOF = "EOF",
  
    // 错误
    ERROR = "ERROR",
  }
  
  export interface Token {
    type: TokenType;
    value: string;
    location: { line: number; column: number };
  }

  // lexer.ts
export class Lexer {
    private input: string;
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;
  
    constructor(input: string) {
      this.input = input;
    }
  
    private peek(): string {
      return this.input[this.position];
    }

    public nextchar():string{
      return this.input[this.position+1];
    }
  
    private advance(): string {
      const char = this.peek();
      this.position++;
      if (char === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      return char;
    }
  
    private isAlpha(char: string): boolean {
      return /[a-zA-Z_]/.test(char);
    }
  
    private isDigit(char: string): boolean {
      return /[0-9A-Fa-fHBhb]/.test(char);
    }
  
    private isAlphanumeric(char: string): boolean {
      return this.isAlpha(char) || this.isDigit(char);
    }
  
    private isWhitespace(char: string): boolean {
      return /[\s]/.test(char);
    }
  
    private skipWhitespace(): void {
      while (this.isWhitespace(this.peek())) {
        this.advance();
      }
    }
  
    public nextToken(): Token {
      if (this.peek() === "\n") {
        this.advance();
        return {type: TokenType.NEWLINE, value: "\n", location: {line:this.line, column:this.column}}
      }
      this.skipWhitespace();
  
      if (this.position >= this.input.length) {
        return {
          type: TokenType.EOF,
          value: "",
          location: { line: this.line, column: this.column },
        };
      }
  
      const char = this.peek();
      const line = this.line;
      const column = this.column;
  
      if (char === ";") {
        let value = "";
        while (this.peek() !== "\n" && this.position < this.input.length) {
          value += this.advance();
        }
        return { type: TokenType.COMMENT, value, location: { line, column } };
      }
  
      if (char === ".") {
        let value = ".";
        this.advance();
        while (this.isAlphanumeric(this.peek())) {
          value += this.advance();
        }
  
        const upperValue = value.toUpperCase();
        switch (upperValue) {
          case ".386":
          case ".MODEL":
          case ".STACK":
          case ".DATA":
          case ".CODE":
          case ".INCLUDE":
            return { type: TokenType.DIRECTIVE, value, location: { line, column } };
          default:
            return { type: TokenType.DIRECTIVE, value, location: { line, column } };
        }
      }
  
      if (this.isAlpha(char)) {
        let value = "";
        while (this.isAlphanumeric(this.peek())) {
          value += this.advance();
        }
  
        const upperValue = value.toUpperCase();
        switch (upperValue) {
          case "SEGMENT":
            return { type: TokenType.SEGMENT, value, location: { line, column } };
          case "ENDS":
            return { type: TokenType.ENDS, value, location: { line, column } };
          case "PROC":
            return { type: TokenType.PROC, value, location: { line, column } };
          case "ENDP":
            return { type: TokenType.ENDP, value, location: { line, column } };
          case "MACRO":
            return { type: TokenType.MACRO, value, location: { line, column } };
          case "ENDM":
            return { type: TokenType.ENDM, value, location: { line, column } };
          case "ASSUME":
            return { type: TokenType.ASSUME, value, location: { line, column } };
          case "OFFSET":
            return { type: TokenType.OFFSET, value, location: { line, column } };
          case "DB":
            return { type: TokenType.DB, value, location: { line, column } };
          case "DW":
            return { type: TokenType.DW, value, location: { line, column } };
          case "DD":
            return { type: TokenType.DD, value, location: { line, column } };
          case "INCLUDE":
            return { type: TokenType.INCLUDE, value, location: { line, column } };
  
          default:
            return { type: TokenType.IDENTIFIER, value, location: { line, column } };
        }
      }
  
      if (this.isDigit(char)) {
        let value = "";
        while (this.isDigit(this.peek())) {
          value += this.advance();
        }
        return { type: TokenType.NUMBER, value, location: { line, column } };
      }
  
      if (char === ":") {
        this.advance();
        return { type: TokenType.COLON, value: ":", location: { line, column } };
      }
  
      if (char === ",") {
        this.advance();
        return { type: TokenType.COMMA, value: ",", location: { line, column } };
      }
  
      if (char === '"' || char === "'") {
        const quote = char;
        this.advance();
        let value = "";
        while (this.peek() !== quote && this.position < this.input.length) {
          value += this.advance();
        }
        if (this.peek() === quote) {
          this.advance();
          return { type: TokenType.STRING, value, location: { line, column } };
        } else {
          return {
            type: TokenType.ERROR,
            value: "Unterminated string",
            location: { line, column },
          };
        }
      }
  
      return { type: TokenType.ERROR, value: this.advance(), location: { line, column } };
    }
  }