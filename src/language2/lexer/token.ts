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
  LAngleBracket,
  RAngleBracket,
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

export function positionOffset(base:Position,offset:number){
  return {
    line:base.line,
    col:base.col+offset,
    offset:base.offset+offset,
  }
}

export interface Token {
  type: TokenType;
  value?: string;
  pos:Position;
}
