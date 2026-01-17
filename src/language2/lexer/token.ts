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
  Question,
  Plus,
  Minus,
  Star,
  Slash,
  Ptr,
  AtIdentifier,
  Comment,
  NewLine,
  EOF,
}

export interface Position{
  offset:number,
  line:number,
  col:number,
}

export interface Token {
  type: TokenType;
  value?: string;
  pos:Position
}
