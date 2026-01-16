import { ExprNode } from "./expr";

export interface Trace {
  filePath: string;
  index: number;
  end:number;
}

export type ASTNode =
  | ProgramNode
  | InstructionNode
  | LabelNode
  | MacroNode
  | ConditionalNode;

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

export interface ConditionalNode {
  type: "Conditional";
  kind: "IFDEF" | "IFNDEF";
  symbol: string;
  thenBody: ASTNode[];
  elseBody?: ASTNode[];
  trace: Trace;
}

export type OperandNode =
  | { kind: "Immediate"; value: number, type:"hex"|"oct"|"dec"|"bin",expr:string,parseError?:string }
  | { kind: "Identifier"; name: string }
  | { kind: "String"; value: string }
  | { kind: "Memory"; expr: ExprNode }
  | { kind: "Offset"; expr: ExprNode }
  | { kind: "Dup"; value: OperandNode }
  | { kind: "SegmentRegister"; segment: string; register: string };
