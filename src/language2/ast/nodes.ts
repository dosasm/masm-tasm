import { ExprNode } from "./expr";

export interface Trace {
  filePath: string;
  index: number;
  end:number;
  leading?: string[];
  trailing?: string[];
}

export type ASTNode =
  | ProgramNode
  | InstructionNode
  | LabelNode
  | MacroNode
  | ConditionalNode
  | ProcedureNode
  | SegmentNode
  | StructNode;

export interface ProgramNode {
  type: "Program";
  body: ASTNode[];
  trace: Trace;
}

export interface InstructionNode {
  type: "Instruction";
  mnemonic: string;
  operands: OperandNode[];
  trace: Trace;
}

export interface LabelNode {
  type: "Label";
  name: string;
  trace: Trace;
}

export interface MacroNode {
  type: "Macro";
  name: string;
  params: string[];
  body: ASTNode[];
  trace: Trace;
}

export interface ProcedureNode {
  type: "Procedure";
  name: string;
  body: ASTNode[];
  attributes?: string[];
  params?: string[];
  trace: Trace;
}

export interface SegmentNode {
  type: "Segment";
  name: string;
  body: ASTNode[];
  trace: Trace;
  params:string[];
}

export interface StructNode {
  type: "Struct";
  name: string;
  body: ASTNode[];
  trace: Trace;
}

export interface ConditionalNode {
  type: "Conditional";
  kind: "IFDEF" | "IFNDEF";
  symbol: string;
  thenBody: ASTNode[];
  elseBody?: ASTNode[];
  trace: Trace;
}


export type OperandNode =
  | { kind: "Immediate"; value: ExprNode }
  | { kind: "Identifier"; name: string }
  | { kind: "String"; value: string }
  | { kind: "Memory"; expr: ExprNode; segment?: string }
  | { kind: "Offset"; expr: ExprNode }
  | { kind: "Seg"; expr: ExprNode }
  | { kind: "Dup"; value: OperandNode, prefix?:ExprNode }
  | { kind: "QuestionExpr"; value: "?" }
  | { kind: "SegmentRegister"; segment: string; register: string };
