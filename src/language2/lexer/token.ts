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
  NewLine,
  EOF,
}

export interface Token {
  type: TokenType;
  value?: string;
  pos:number
}
