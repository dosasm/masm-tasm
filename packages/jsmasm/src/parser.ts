// parser.ts
import { Lexer, Token, TokenType } from "./lexer";
import * as AST from "./ast";

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;
  private nextToken: Token;
  private errors: { message: string; location: AST.Location }[] = [];

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.currentToken = this.lexer.nextToken();
    this.nextToken=this.lexer.nextToken();
  }

  public next(){
    this.currentToken=this.nextToken;
    this.nextToken=this.lexer.nextToken();
    return this.currentToken
  }

  private eat(type: TokenType): Token {
    if (this.currentToken.type === type) {
      const token = this.currentToken;
      this.next()
      return token;
    } else {
      this.error(`Expected ${type}, got ${this.currentToken.type}`);
      return {
        type: TokenType.ERROR,
        value: "ERROR",
        location: this.currentToken.location,
      };
    }
  }

  private error(message: string): void {
    this.errors.push({ message, location: this.currentToken.location });
  }

  private parseSegmentDeclaration(): AST.SegmentDeclaration {
    const name = this.eat(TokenType.IDENTIFIER).value;
    this.eat(TokenType.SEGMENT);
    let useType: string | undefined;
    if (this.currentToken.type === TokenType.IDENTIFIER) {
      useType = this.eat(TokenType.IDENTIFIER).value;
    }
    return {
      type: "SegmentDeclaration",
      name,
      useType,
      location: this.currentToken.location,
    };
  }

  private parseSegmentEnd(): AST.SegmentEnd {
    const name = this.eat(TokenType.IDENTIFIER).value;
    this.eat(TokenType.ENDS);
    return { type: "SegmentEnd", name, location: this.currentToken.location };
  }

  private parseInstruction(): AST.Instruction {
    const mnemonic = this.eat(TokenType.IDENTIFIER).value;
    const operands: AST.Operand[] = [];
    while (
      this.currentToken.type !== TokenType.NEWLINE &&
      this.currentToken.type !== TokenType.EOF
    ) {
      if (this.currentToken.type === TokenType.COMMA) {
        this.eat(TokenType.COMMA);
      } else {
        operands.push(this.parseOperand());
      }
    }
    return { type: "Instruction", mnemonic, operands, location: this.currentToken.location };
  }

  private parseOperand(): AST.Operand {
    if (this.currentToken.type === TokenType.IDENTIFIER) {
      if (this.nextToken.value === ":") {
        return {
          type: "LabelOperand",
          label: this.eat(TokenType.IDENTIFIER).value,
          location: this.currentToken.location,
        };
      } else {
        return {
          type: "RegisterOperand",
          register: this.eat(TokenType.IDENTIFIER).value,
          location: this.currentToken.location,
        };
      }
    } else if (this.currentToken.type === TokenType.NUMBER) {
      return {
        type: "ImmediateOperand",
        value: {
          type: "NumericLiteralExpression",
          value: parseInt(this.eat(TokenType.NUMBER).value),
          location: this.currentToken.location,
        },
        location: this.currentToken.location,
      };
    } else if (this.currentToken.type === TokenType.STRING) {
      return {
        type: "StringLiteralOperand",
        value: this.eat(TokenType.STRING).value,
        location: this.currentToken.location,
      };
    } else {
      this.error(`Unexpected token: ${this.currentToken.type}`);
      return {
        type: "ImmediateOperand",
        value: {
          type: "NumericLiteralExpression",
          value: 0,
          location: this.currentToken.location,
        },
        location: this.currentToken.location,
      };
    }
  }

  private parseLabel(): AST.Label {
    const name = this.eat(TokenType.IDENTIFIER).value;
    this.eat(TokenType.COLON);
    return { type: "Label", name, location: this.currentToken.location };
  }

  private parseDirective(): AST.Directive {
    const name = this.eat(TokenType.DIRECTIVE).value;
    const args: AST.Expression[] = [];
    if (this.currentToken.type === TokenType.STRING) {
        args.push({type: "StringLiteralExpression", name:"debug!!!!",value: this.eat(TokenType.STRING).value, location: this.currentToken.location});
    }

    return { type: "Directive", name, arguments: args, location: this.currentToken.location };
  }

  private parseIncludeDirective(): AST.IncludeDirective {
    this.eat(TokenType.DIRECTIVE); // Consume "INCLUDE"
    const filename = this.eat(TokenType.STRING).value;
    return {
      type: "IncludeDirective",
      filename,
      location: this.currentToken.location,
    };
  }

  private parseStatement(): AST.Statement | null {
    if (this.currentToken.type === TokenType.IDENTIFIER) {
      if (this.nextToken.value === "SEGMENT") {
        return this.parseSegmentDeclaration();
      } else if (this.nextToken.value === "ENDS") {
        return this.parseSegmentEnd();
      } else if (this.nextToken.value === ":") {
        return this.parseLabel();
      } else {
        return this.parseInstruction();
      }
    } else if (this.currentToken.type === TokenType.DIRECTIVE) {
      if (this.currentToken.value.toUpperCase() === ".INCLUDE") {
        return this.parseIncludeDirective();
      } else {
        return this.parseDirective();
      }
    }
    return null;
  }

  public parse(): AST.Program {
    const body: AST.Statement[] = [];
    while (this.currentToken.type !== TokenType.EOF) {
      if (this.currentToken.type === TokenType.NEWLINE) {
        this.eat(TokenType.NEWLINE);
        continue;
      }
      const statement = this.parseStatement();
      if (statement) {
        body.push(statement);
      } else {
        this.eat(this.currentToken.type);
      }
    }
    return { type: "Program", body, location: { line: 1, column: 1 } };
  }

  public getErrors(): { message: string; location: AST.Location }[] {
    return this.errors;
  }
}