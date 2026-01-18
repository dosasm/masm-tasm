import { ProgramNode, ASTNode, InstructionNode, LabelNode, MacroNode, ConditionalNode, OperandNode, StructNode, ProcedureNode, SegmentNode, ExprNode, CommentNode } from "../ast";
import { MasmtasmFormatConfig, CasingMode } from "./config";

function applyCasing(s: string, mode: CasingMode): string {
  if (!s) return s;
  switch (mode) {
    case 'lower': return s.toLowerCase();
    case 'upper': return s.toUpperCase();
    case 'title': return s[0].toUpperCase() + s.slice(1).toLowerCase();
    default: return s;
  }
}

function formatExpr(e: ExprNode): string {
  switch (e.type) {
    case 'Identifier': return e.name;
    case 'Number': return e.expr ?? String(e.value);
    case 'UnaryExpr': return e.operator + formatExpr(e.operand);
    case 'BinaryExpr': return `${formatExpr(e.left)} ${e.operator} ${formatExpr(e.right)}`;
  }
}

function formatOperand(o: OperandNode, config: MasmtasmFormatConfig): string {
  switch (o.kind) {
    case 'Immediate': return formatExpr(o.value);
    case 'Identifier': return o.name;
    case 'String':
      if (o.doubleQuote) {
        return '"' + o.value + '"';
      } else {
        return "'" + o.value + "'";
      }
    case 'Memory': {
      const seg = o.segment ? o.segment + ':' : '';
      const inner = formatExpr(o.expr);
      if (o.base) return `${seg}${o.base}[${inner}]`;
      return `${seg}[${inner}]`;
    }
    case 'StructAssign': return '<' + o.exprs.map(e => formatExpr(e)).join(', ') + '>';
    case 'Offset': return 'OFFSET ' + formatExpr(o.expr);
    case 'Seg': return 'SEG ' + formatExpr(o.expr);
    case 'Dup': return (o.prefix ? formatExpr(o.prefix) + ' ' : '') + 'DUP(' + formatOperand(o.value, config) + ')';
    case 'QuestionExpr': return '?';
    case 'SegmentRegister': return `${o.segment}:${applyCasing(o.register, config.casing.register)}`;
  }
}

function joinOperands(mnemonic: string, ops: OperandNode[], config: MasmtasmFormatConfig) {
  const sep = config.spaceAfterComma === 'never' ? ',' : ', ';
  if (ops.length > 0) {
    let output = "";
    const isDefMemory = ["DW", "DD", "DQ", "DT", "DF", "DB"].some(a => ops[0].kind === "Identifier" && ops[0].name.toUpperCase() === a)
    if (isDefMemory) {
      output += formatOperand(ops[0], config)
      if (ops.length > 1) {
        output += " " + formatOperand(ops[1], config)
      }

      if (ops.length > 2) {
        for (let i = 2; i < ops.length; i++) {
          output += sep + formatOperand(ops[i], config)
        }
      }
      return output;
    }
  }
  return ops.map(o => formatOperand(o, config)).join(sep);
}

type LineItem = { kind: 'code' | 'comment' | 'blank', text?: string, trailingComment?: string };

function collectLines(config: MasmtasmFormatConfig, nodes: ASTNode[]): LineItem[] {
  const out: LineItem[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i] as any;
    if (n.type === 'Comment') {
      out.push({ kind: 'comment', text: n.value });
      continue;
    }
    if (n.type === 'Instruction' || n.type === 'Label' || n.type === 'Macro' || n.type === 'Procedure' || n.type === 'Segment' || n.type === 'Struct' || n.type === 'Conditional') {
      // detect trailing comment: next node is Comment and on same line
      let trailing: String | undefined = undefined;
      const next = nodes[i + 1] as any;
      if (next && next.type === 'Comment') {
        try {
          if (next.trace && n.trace && next.trace.index && n.trace.end && next.trace.index.line === n.trace.end.line) {
            trailing = next.value;
            i++; // consume comment
          }
        } catch (e) {/* ignore */ }
      }
      // produce code text via formatNode
      const text = formatNode(n, config, "\t");
      out.push({ kind: 'code', text, trailingComment: trailing as any });
      continue;
    }
    out.push({ kind: 'blank' });
  }
  return out;
}


export function format(config: MasmtasmFormatConfig, ast: ProgramNode, indent: string): string {
  const a = formatNode(ast, config, indent);
  return a;
}

export function formatLines(config: MasmtasmFormatConfig, body: ASTNode[], indent: string) {
  // First, collect flat lines and detect trailing comments
  const lines = collectLines(config, body);

  // compute max code length for trailing comment alignment
  let maxCodeLen = 0;
  for (const l of lines) {
    if (l.kind === 'code' && l.text) maxCodeLen = Math.max(maxCodeLen, l.text.length);
  }

  const out: string[] = [];
  for (const l of lines) {
    if (l.kind === 'blank') { out.push(''); continue; }
    if (l.kind === 'comment') {
      if (config.alignSingleLineComment) {
        out.push(l.text || '');
      } else {
        out.push(l.text || '');
      }
      continue;
    }
    // code line
    if (l.text) {
      if (l.trailingComment && config.alignTrailingComment === true) {
        const padding = Math.max(1, maxCodeLen - l.text.length + 1);
        out.push(l.text + ' '.repeat(padding) + l.trailingComment);
      } else if (l.trailingComment && typeof config.alignTrailingComment === "string") {
        out.push(l.text + config.alignTrailingComment + l.trailingComment);
      } else if (l.trailingComment) {
        out.push(l.text + ' ' + l.trailingComment);
      } else {
        out.push(l.text);
      }
    }
  }

  return out.join('\n');
}

function formatNode(node: ASTNode | any, config: MasmtasmFormatConfig, indent: string): string {
  switch (node.type) {
    case 'Program':
      return node.body.map((n: ASTNode) => formatNode(n, config, indent)).join('\n');
    case 'Comment':
      if (node.value) {
        return node.value.trim();
      }
      return ""
    case 'Label':
      return `${node.name}:`;
    case 'Instruction': {
      const m = applyCasing(node.mnemonic, config.casing.instruction);
      const ops = node.operands && node.operands.length ? joinOperands(node.mnemonic, node.operands, config) : '';
      const text = ops ? `${indent}${m} ${ops}` : `${indent}${m}`;
      return text;
    }
    case 'Macro': {
      const hdr = `${node.name} MACRO${node.params && node.params.length ? ' ' + node.params.join(', ') : ''}`;
      const body = formatLines(config, node.body, indent);
      const end = `${node.name} ENDM`;
      return [hdr, body, end].join('\n');
    }
    case 'Procedure': {
      const attrs = node.attributes && node.attributes.length ? ' ' + node.attributes.join(' ') : '';
      const params = node.params && node.params.length ? ' ' + node.params.join(', ') : '';
      const hdr = `${node.name} PROC${attrs}${params}`;
      const body = formatLines(config, node.body, indent);  // formatLines(config,node.body,indent); 
      const end = `${node.name} ENDP`;
      return [hdr, body, end].join('\n');
    }
    case 'Segment': {
      if (node.simplified) {
        const hdr = `.${node.name}`;
        const body = formatLines(config, node.body, indent);
        return [hdr, body, ''].join('\n');
      }
      const hdr = `${node.name} SEGMENT${node.params && node.params.length ? ' ' + node.params.join(' ') : ''}`;
      const body = formatLines(config, node.body, indent);
      const end = `${node.name} ENDS`;
      return [hdr, body, end].join('\n');
    }
    case 'Struct': {
      const hdr = `${node.name} STRUCT`;
      const body = formatLines(config, node.body, indent);
      const end = `${node.name} ENDS`;
      return [hdr, body, end].join('\n');
    }
    case 'Conditional': {
      const hdr = `${node.kind} ${node.symbol}`;
      const thenBody = node.thenBody.map((b: ASTNode) => indent + formatNode(b, config, indent + indent)).join('\n');
      const elseBody = node.elseBody ? node.elseBody.map((b: ASTNode) => formatNode(b, config, indent + indent)).join('\n') : undefined;
      const end = `ENDIF`;
      return [hdr, thenBody, ...(elseBody ? ['ELSE', elseBody] : []), end].join('\n');
    }
  }
  return '';
}