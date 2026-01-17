import { ProgramNode, ASTNode, InstructionNode, LabelNode, MacroNode, ConditionalNode, OperandNode, StructNode, ProcedureNode, SegmentNode } from "../ast";
import { MasmtasmFormatConfig, CasingMode } from "./config";

function applyCasing(mode: CasingMode, text: string): string {
  switch (mode) {
    case 'lower': return text.toLowerCase();
    case 'upper': return text.toUpperCase();
    case 'title': return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'off': return text;
  }
}

function formatOperand(operand: OperandNode, config: MasmtasmFormatConfig): string {
  switch (operand.kind) {
    case 'Immediate':
      if (operand.expr)
        return operand.expr;
      return operand.value.toString();
    case 'Identifier':
      // Apply casing based on type, but for simplicity, use directive casing
      return applyCasing(config.casing.directive, operand.name);
    case 'String':
      return `'${operand.value}'`;
    case 'Memory':
      return `[${formatExpression(operand.expr)}]`;
    case 'Offset':
      return `OFFSET ${formatExpression(operand.expr)}`;
    case 'Dup':
      return `DUP(${formatOperand(operand.value, config)})`;
    case 'QuestionExpr':
      return "?"
    case 'SegmentRegister':
      return `${applyCasing(config.casing.register, operand.segment)}:${applyCasing(config.casing.register, operand.register)}`;
  }
}

function formatExpression(expr: any): string {
  // Simplified, assume it's Identifier or Number
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'Number') return expr.value.toString();
  if (expr.type === 'BinaryExpr') return `${formatExpression(expr.left)} ${expr.operator} ${formatExpression(expr.right)}`;
  return '';
}

function formatInstruction(node: InstructionNode, config: MasmtasmFormatConfig, indent: string): string {
  const mnemonic = applyCasing(config.casing.instruction, node.mnemonic);
  const operands_ = node.operands.map(op => formatOperand(op, config));

  let operands = "";
  if (operands_.length >= 1) {
    operands = operands_[0]
  }
  if (operands_.length >= 2) {
    for (let i = 1; i < operands_.length; i++) {
      if (i == 1 && ["segment", "db", "dw", "dd","dq","dt"].some(a => operands_[i-1].toLocaleLowerCase() === a)) {
        operands += " " + operands_[i];
      } else {
        operands += ", " + operands_[i];
      }
    }
  }


  if (mnemonic.startsWith(".") || mnemonic.toLowerCase() === "data" || mnemonic.toLowerCase() === "code") {
    return `${mnemonic} ${operands}`;
  }
  return `${indent}${mnemonic} ${operands}`;
}

function formatLabel(node: LabelNode): string {
  return `${node.name}:`;
}

function formatMacro(node: MacroNode, config: MasmtasmFormatConfig, indent = ""): string {
  const params = node.params.join(', ');
  const body = node.body.map(n => formatNode(n, config, indent + "\t")).join('\n');
  return `${indent}${node.name} MACRO ${params}\n${body}\n${indent}ENDM`;
}

function formatConditional(node: ConditionalNode, config: MasmtasmFormatConfig, indent = ""): string {
  const thenBody = node.thenBody.map(n => formatNode(n, config, indent + "\t")).join('\n');
  const elseBody = node.elseBody ? `\n${indent}ELSE\n${node.elseBody.map(n => formatNode(n, config, indent + "\t")).join('\n')}` : '';
  return `${indent}${node.kind} ${node.symbol}\n${thenBody}${elseBody}\n${indent}ENDIF`;
}

function formatProcedure(node: ProcedureNode, config: MasmtasmFormatConfig, indent = ""): string {
  const params = node.params ? node.params.join(', ') : '';
  const attributes = node.attributes ? ' ' + node.attributes.join(' ') : '';
  const body = node.body.map(n => formatNode(n, config, indent + "\t")).join('\n');
  return `${indent}${node.name} PROC${attributes}${params ? ' ' + params : ''}\n${body}\n${indent}${node.name} ENDP`;
}

function formatSegment(node: SegmentNode, config: MasmtasmFormatConfig, indent = ""): string {
  const body = node.body.map(n => formatNode(n, config, indent + "\t")).join('\n');
  return `${indent}${node.name} SEGMENT\n${body}\n${indent}${node.name} ENDS`;
}

function formatStruct(node: StructNode, config: MasmtasmFormatConfig, indent = ""): string {
  const body = node.body.map(n => formatNode(n, config, indent + "\t")).join('\n');
  return `${indent}${node.name} STRUCT\n${body}\n${indent}${node.name} ENDS`;
}

function formatNode(node: ASTNode, config: MasmtasmFormatConfig, indent = "\t"): string {
  let result = '';
  if (node.trace?.leading) {
    result += node.trace.leading.join('\n') + '\n';
  }
  switch (node.type) {
    case 'Instruction':
      result += formatInstruction(node, config, indent);
      break;
    case 'Label':
      result += formatLabel(node);
      break;
    case 'Macro':
      result += formatMacro(node, config, indent);
      break;
    case 'Conditional':
      result += formatConditional(node, config, indent);
      break;
    case 'Procedure':
      result += formatProcedure(node, config, indent);
      break;
    case 'Segment':
      result += formatSegment(node, config, indent);
      break;
    case 'Struct':
      result += formatStruct(node, config, indent);
      break;
    default:
      result += '';
  }
  if (node.trace?.trailing) {
    result += '\n' + node.trace.trailing.join('\n');
  }
  return result;
}

export function format(config: MasmtasmFormatConfig, ast: ProgramNode, indent: string): string {
  return ast.body.map(node => formatNode(node, config, indent)).join('\n');
}