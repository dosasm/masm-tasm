import { Parser } from "./parser";
import { ASTNode } from "../ast/nodes";
import { Position, TokenType } from "../lexer/token";
import { parseOperand } from "./operand";

export function parseStatement(parser: Parser): ASTNode {
  const startIndex = parser.current.pos;
  const id = parser.eat(TokenType.Identifier).value!;

  if (parser.current.type === TokenType.Colon) {
    parser.eat(TokenType.Colon);
    return { 
      type: "Label", 
      name: id, 
      trace: { 
        filePath: parser.filePath, 
        index: startIndex,
        end:parser.current.pos
      } };
  }

  const curVal = (parser.current.value ?? "").toUpperCase();
  if (curVal === "MACRO") {
    return parseMacro(parser, id, startIndex);
  }

  if (curVal === "PROC") {
    return parseProc(parser, id, startIndex);
  }

  if (curVal === "SEGMENT") {
    return parseSegment(parser, id, startIndex);
  }

  if (curVal === "STRUCT") {
    return parseStruct(parser, id, startIndex);
  }

  if (id === "IFDEF" || id === "IFNDEF") {
    return parseConditional(parser, id, startIndex);
  }

  // simplified segment directives like .DATA, .DATA?, .CONST, .CODE <name>
  const idUpper = id.toUpperCase();
  if([".CODE",".DATA",".DATA?",".CONST"].some(a=>a===idUpper)){
    return parseSimplifiedSegment(parser,id,idUpper,startIndex)
  }

  const operands = [];
  while (
    parser.current.type !== TokenType.NewLine &&
    parser.current.type !== TokenType.EOF &&
    parser.current.type !== TokenType.Comment
  ) {
    if (parser.current.type === TokenType.Comma) {
      parser.eat(TokenType.Comma);
      continue;
    }
    operands.push(parseOperand(parser));
  }
  const output:ASTNode={ 
    type: "Instruction", 
    mnemonic: id, operands, 
    trace: { 
      filePath: parser.filePath, 
      index: startIndex,
      end:parser.current.pos
    } 
  };

  if(parser.current.type===TokenType.Comment){
    if (parser.current.value){
      output.trace.trailing=[parser.current.value];
    }
    parser.eat(TokenType.Comment)
  }


  return output;
}

function parseMacro(parser: Parser, name: string, startIndex: Position): ASTNode {
  parser.eat(TokenType.Identifier); // MACRO
  const params: string[] = [];

  while (parser.current.type === TokenType.Identifier) {
    params.push(parser.eat(TokenType.Identifier).value!);
    //@ts-ignore
    if (parser.current.type === TokenType.Comma) { 
      parser.eat(TokenType.Comma);
    }
  }

  const body: ASTNode[] = [];
  while (true) {
    let a=parser.parseStatement();
    if (a.type==="Instruction" && a.mnemonic.toUpperCase()==="ENDM"){
      break
    }
    body.push(a);
  }

  // parser.eat(TokenType.Identifier);
  return { 
    type: "Macro", name, params, body, 
    trace: { 
      filePath: parser.filePath, 
      index: startIndex,
      end:parser.current.pos } 
  };
}

function parseProc(parser: Parser, name: string, startIndex: Position): ASTNode {
  parser.eat(TokenType.Identifier); // PROC
  // parse optional attributes and parameter list on the same line
  const attributes: string[] = [];
  const params: string[] = [];

  if (parser.current.type !== TokenType.NewLine && parser.current.type !== TokenType.EOF) {
    const parts: string[] = [];
    let curPart = "";
    //@ts-ignore
    while (parser.current.type !== TokenType.NewLine && parser.current.type !== TokenType.EOF) {
      if (parser.current.type === TokenType.Comma) {
        parts.push(curPart.trim());
        curPart = "";
        parser.eat(TokenType.Comma);
        continue;
      }
      const tok = parser.eat(parser.current.type);
      let txt = tok.value ?? "";
      switch (tok.type) {
        case TokenType.LParen:
          txt = "(";
          break;
        case TokenType.RParen:
          txt = ")";
          break;
        case TokenType.LBracket:
          txt = "[";
          break;
        case TokenType.RBracket:
          txt = "]";
          break;
        case TokenType.Colon:
          txt = ":";
          break;
        case TokenType.Plus:
          txt = "+";
          break;
        case TokenType.Minus:
          txt = "-";
          break;
        case TokenType.Star:
          txt = "*";
          break;
        case TokenType.Slash:
          txt = "/";
          break;
        case TokenType.AtIdentifier:
          txt = "@" + txt;
          break;
        case TokenType.String:
          txt = '"' + txt + '"';
          break;
        case TokenType.Ptr:
          txt = txt;
          break;
        default:
          txt = txt;
      }
      curPart += (curPart ? " " : "") + txt;
    }
    if (curPart.trim()) parts.push(curPart.trim());

    // classify parts into attributes vs params. Heuristic: if a part contains
    // any of these characters it's likely a parameter (':', '(', '@', '[' or digits)
    for (const p of parts) {
      if (/[\(\)@:\[\]0-9]/.test(p) || p.toUpperCase().indexOf("PTR") >= 0 || p.indexOf('"')>=0) {
        params.push(p);
      } else if (p) {
        attributes.push(p);
      }
    }
  }

  const body: ASTNode[] = [];
  let state: ASTNode | undefined = undefined;
  while (true) {
    state = parser.parseStatement();
    if (state.type === "Instruction") {
      if (state.mnemonic === name) {
        if (state.operands[0].kind === "Identifier") {
          if (state.operands[0].name.toUpperCase() === "ENDP") {
            break;
          }
        }
      }
    }
    body.push(state);
  }

  return {
    type: "Procedure",
    name,
    attributes: attributes.length ? attributes : undefined,
    params: params.length ? params : undefined,
    body,
    trace: { filePath: parser.filePath, index: startIndex, end: parser.current.pos },
  };
}

function parseSegment(parser: Parser, name: string, startIndex: Position): ASTNode {
  parser.eat(TokenType.Identifier); // SEGMENT
  let params=[];
  while(parser.current.type!==TokenType.NewLine){
    parser.current.value && params.push(parser.current.value)
    parser.eat(TokenType.Identifier);
  }
  const body: ASTNode[] = [];
  let state:ASTNode|undefined=undefined;
  while (true) {
    state=parser.parseStatement();
    if(state.type==="Instruction"){
      if(state.mnemonic===name){
        if(state.operands[0].kind==="Identifier"){
          if(state.operands[0].name.toUpperCase()==="ENDS"){
            break
          }
        }
      }
    }
    body.push(state);
  }
  // parser.eat(TokenType.Identifier); // ENDS
  return {
    type: "Segment",
    name,
    params,
    body,
    trace: { filePath: parser.filePath, index: startIndex, end: parser.current.pos },
  };
}

function parseSimplifiedSegment(parser: Parser, name: string, idUpper:string,startIndex: Position): ASTNode {
  const output:ASTNode={
      type: "Segment",
      name: "",
      params:[],
      body: [],
      trace: { filePath: parser.filePath, index: startIndex, end: parser.current.pos },
    };
  
  if (idUpper === ".DATA" || idUpper === ".DATA?" || idUpper === ".CONST") {
    // consume rest of line
    while (parser.current.type !== TokenType.NewLine && parser.current.type !== TokenType.EOF) {
      parser.eat(parser.current.type);
    }
    const segName = idUpper.replace(/^\./, '').replace('?', '');
    if (idUpper === ".DATA?") output.params.push('?');
    if (idUpper === ".CONST") output.params.push('CONST');
    output.name=segName;
  }

  if (idUpper === ".CODE") {
    // .CODE <segmentName>  (segment name required)
    let segName = "CODE";
    if (parser.current.type === TokenType.Identifier) {
      segName = parser.eat(TokenType.Identifier).value!;
    }
    while (parser.current.type !== TokenType.NewLine && parser.current.type !== TokenType.EOF) {
      parser.eat(parser.current.type);
    }
    output.name=segName;
    output.params=["CODE"]
  }
  //-------------------
  const body: ASTNode[] = [];
  let state:ASTNode|undefined=undefined;
  while (parser.current.type!==TokenType.EOF) {
    state=parser.parseStatement();
    if([".CODE",".DATA",".DATA?",".CONST"].some(a=>a===parser.current.value)){
      break
    }
    body.push(state);
  }
  // parser.eat(TokenType.Identifier); // ENDS
  output.body=body;
  output.trace.end=parser.current.pos;
  return output;
}

function parseStruct(parser: Parser, name: string, startIndex: Position): ASTNode {
  parser.eat(TokenType.Identifier); // STRUCT
  const body: ASTNode[] = [];
  let state:ASTNode|undefined=undefined;
  while (true) {
    state=parser.parseStatement();
    if(state.type==="Instruction"){
      if(state.mnemonic===name){
        if(state.operands[0].kind==="Identifier"){
          if(state.operands[0].name.toUpperCase()==="ENDS"){
            break
          }
        }
      }
    }
    body.push(state);
  }
  parser.eat(TokenType.Identifier); // ENDS
  return {
    type: "Struct",
    name,
    body,
    trace: { filePath: parser.filePath, index: startIndex, end: parser.current.pos },
  };
}

function parseConditional(parser: Parser, kind: string, startIndex: Position): ASTNode {
  const symbol = parser.eat(TokenType.Identifier).value!;
  const thenBody: ASTNode[] = [];
  const elseBody: ASTNode[] = [];

  while (
    ((parser.current.value ?? "").toUpperCase() !== "ELSE") &&
    ((parser.current.value ?? "").toUpperCase() !== "ENDIF")
  ) {
    thenBody.push(parser.parseStatement());
  }

  if (((parser.current.value ?? "").toUpperCase() === "ELSE")) {
    parser.eat(TokenType.Identifier);
    // @ts-ignore
    while (((parser.current.value ?? "").toUpperCase() !== "ENDIF")) {
      elseBody.push(parser.parseStatement());
    }
  }

  parser.eat(TokenType.Identifier);
  return {
    type: "Conditional",
    kind: kind as any,
    symbol,
    thenBody,
    elseBody: elseBody.length ? elseBody : undefined,
    trace: { 
      filePath: parser.filePath, 
      index: startIndex ,
      end:parser.current.pos}
  };
}
