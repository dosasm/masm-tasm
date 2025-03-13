// ast.ts

// 位置信息
export interface Location {
    line: number;
    column: number;
  }
  
  // 基础 AST 节点
  export interface ASTNode {
    type: string;
    location: Location;
  }
  
  // 程序根节点
  export interface Program extends ASTNode {
    type: "Program";
    body: Statement[];
  }
  
  // 语句类型
  export type Statement =
    | SegmentDeclaration
    | SegmentEnd
    | Directive
    | Instruction
    | Label
    | MacroDeclaration
    | MacroEnd
    | ProcedureDeclaration
    | ProcedureEnd
    | DataDeclaration
    | IncludeDirective;
  
  // 段声明
  export interface SegmentDeclaration extends ASTNode {
    type: "SegmentDeclaration";
    name: string;
    useType?: string; // USE16, USE32 等
  }
  
  // 段结束
  export interface SegmentEnd extends ASTNode {
    type: "SegmentEnd";
    name: string;
  }
  
  // 指令
  export interface Instruction extends ASTNode {
    type: "Instruction";
    mnemonic: string;
    operands: Operand[];
  }
  
  // 操作数类型
  export type Operand =
    | RegisterOperand
    | MemoryOperand
    | ImmediateOperand
    | LabelOperand
    | StringLiteralOperand
    | ExpressionOperand;
  
  // 寄存器操作数
  export interface RegisterOperand extends ASTNode {
    type: "RegisterOperand";
    register: string;
  }
  
  // 内存操作数
  export interface MemoryOperand extends ASTNode {
    type: "MemoryOperand";
    segment?: string;
    base?: string;
    index?: string;
    scale?: number;
    displacement?: Expression;
  }
  
  // 立即数操作数
  export interface ImmediateOperand extends ASTNode {
    type: "ImmediateOperand";
    value: Expression;
  }
  
  // 标签操作数
  export interface LabelOperand extends ASTNode {
    type: "LabelOperand";
    label: string;
  }
  
  // 字符串字面量操作数
  export interface StringLiteralOperand extends ASTNode {
    type: "StringLiteralOperand";
    value: string;
  }
  
  // 表达式操作数
  export interface ExpressionOperand extends ASTNode {
    type: "ExpressionOperand";
    expression: Expression;
  }
  
  // 表达式类型
  export type Expression =
    | StringLiteralExpression
    | IdentifierExpression
    | NumericLiteralExpression
    | BinaryExpression
    | UnaryExpression
    | ParenthesizedExpression;

  export interface StringLiteralExpression extends ASTNode {
    type: "StringLiteralExpression";
    name: string;
    value:string
  }
  
  // 标识符表达式
  export interface IdentifierExpression extends ASTNode {
    type: "IdentifierExpression";
    name: string;
  }
  
  // 数字字面量表达式
  export interface NumericLiteralExpression extends ASTNode {
    type: "NumericLiteralExpression";
    value: number;
  }
  
  // 二元表达式
  export interface BinaryExpression extends ASTNode {
    type: "BinaryExpression";
    operator: string;
    left: Expression;
    right: Expression;
  }
  
  // 一元表达式
  export interface UnaryExpression extends ASTNode {
    type: "UnaryExpression";
    operator: string;
    argument: Expression;
  }
  
  // 括号表达式
  export interface ParenthesizedExpression extends ASTNode {
    type: "ParenthesizedExpression";
    expression: Expression;
  }
  
  // 标签
  export interface Label extends ASTNode {
    type: "Label";
    name: string;
  }
  
  // 宏声明
  export interface MacroDeclaration extends ASTNode {
    type: "MacroDeclaration";
    name: string;
    parameters: string[];
    body: Statement[];
  }
  
  // 宏结束
  export interface MacroEnd extends ASTNode {
    type: "MacroEnd";
    name: string;
  }
  
  // 子程序声明
  export interface ProcedureDeclaration extends ASTNode {
    type: "ProcedureDeclaration";
    name: string;
    body: Statement[];
  }
  
  // 子程序结束
  export interface ProcedureEnd extends ASTNode {
    type: "ProcedureEnd";
    name: string;
  }
  
  // 数据声明
  export interface DataDeclaration extends ASTNode {
    type: "DataDeclaration";
    name: string;
    dataType: string; // DB, DW, DD, ...
    initialValue: Expression | string; // 可以是表达式或字符串
  }
  
  // 指令
  export interface Directive extends ASTNode {
    type: "Directive";
    name: string;
    arguments: Expression[];
  }
  
  // Include 指令
  export interface IncludeDirective extends ASTNode {
    type: "IncludeDirective";
    filename: string;
  }