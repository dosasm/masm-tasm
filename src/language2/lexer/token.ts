export enum TokenType {
  Identifier,
  Number,
  String,
  Comma,
  Colon,
  LBracket,
  RBracket,
  LParen,
  RParen,
  Plus,
  Minus,
  Star,
  Slash,
  NewLine,
  EOF,
}

export interface Token {
  type: TokenType;
  value?: string;
  pos:number
}
