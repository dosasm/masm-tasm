// Define token types
export type TokenType =
  | 'COMMENT'
  | 'INSTRUCTION'
  | 'REGISTER'
  | 'NUMBER'
  | 'COMMA'
  | 'SEGMENT'
  | 'ENDS'
  | 'LABEL'
  | 'INCLUDE'
  | 'PROCESSOR_DIRECTIVE'
  | 'MACRO_START'
  | 'MACRO_END'
  | 'PROC'
  | 'ENDP'
  | 'STRING'
  | 'EQU'
  | 'DB'
  | 'DW';

// Define token interface
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// Define AST node types
export type ASTNode =
  | InstructionNode
  | SegmentNode
  | LabelNode
  | IncludeNode
  | ProcessorDirectiveNode
  | MacroDefinitionNode
  | ProcedureNode
  | StringNode
  | EquNode
  | DataNode;

// Define instruction node interface
export interface InstructionNode {
  type: 'INSTRUCTION';
  name: string;
  operands: (RegisterNode | NumberNode | LabelReferenceNode | StringNode)[];
}

// Define register node interface
export interface RegisterNode {
  type: 'REGISTER';
  name: string;
}

// Define number node interface
export interface NumberNode {
  type: 'NUMBER';
  value: number;
}

// Define label reference node interface
export interface LabelReferenceNode {
  type: 'LABEL_REFERENCE';
  name: string;
}

// Define segment node interface
export interface SegmentNode {
  type: 'SEGMENT';
  name: string;
  instructions: ASTNode[];
}

// Define label node interface
export interface LabelNode {
  type: 'LABEL';
  name: string;
  position: number;
}

// Define include node interface
export interface IncludeNode {
  type: 'INCLUDE';
  filename: string;
  ast: ASTNode[];
}

// Define processor directive node interface
export interface ProcessorDirectiveNode {
  type: 'PROCESSOR_DIRECTIVE';
  directive: string;
}

// Define macro definition node interface
export interface MacroDefinitionNode {
  type: 'MACRO_DEFINITION';
  name: string;
  body: ASTNode[];
}

// Define procedure node interface
export interface ProcedureNode {
  type: 'PROCEDURE';
  name: string;
  instructions: ASTNode[];
}

// Define string node interface
export interface StringNode {
  type: 'STRING';
  value: string;
}

// Define EQU node interface
export interface EquNode {
  type: 'EQU';
  label: string;
  value: number | LabelReferenceNode;
}

// Define data node interface
export interface DataNode {
  type: 'DATA';
  directive: 'DB' | 'DW';
  values: (NumberNode | StringNode)[];
}

// Define error information interface
export interface ErrorInfo {
  type: string;
  position: number;
  message: string;
}
    