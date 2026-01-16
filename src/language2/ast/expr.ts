// Expression AST nodes

export type ExprNode =
  | BinaryExpr
  | UnaryExpr
  | IdentifierExpr
  | NumberExpr;

export interface BinaryExpr {
  type: "BinaryExpr";
  operator: "+" | "-" | "*" | "/";
  left: ExprNode;
  right: ExprNode;
}

export interface UnaryExpr {
  type: "UnaryExpr";
  operator: "+" | "-";
  operand: ExprNode;
}

export interface IdentifierExpr {
  type: "Identifier";
  name: string;
}

export interface NumberExpr {
  type: "Number";
  value: number;
}
