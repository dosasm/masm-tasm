import {
    ASTNode,
    InstructionNode,
    SegmentNode,
    LabelNode,
    IncludeNode,
    ProcessorDirectiveNode,
    MacroDefinitionNode,
    ProcedureNode,
    StringNode,
    EquNode,
    DataNode,
    Token,
    TokenType,
    LabelReferenceNode,
    RegisterNode,
    NumberNode,
    ErrorInfo
} from './ast';
import { tokenize } from './lexer';

// Simulate file reading function. Replace with actual file reading logic in production.
function readFile(filename: string): string {
    // Here you can implement the logic to read file content from the file system.
    // In this example, it simply returns an empty string. You need to modify it according to your actual situation.
    return '';
}

// Syntax analyzer
export function parse(tokens: Token[]): { ast: ASTNode[]; errors: ErrorInfo[] } {
    const ast: ASTNode[] = [];
    const errors: ErrorInfo[] = [];
    let currentSegment: SegmentNode | null = null;
    let currentMacro: MacroDefinitionNode | null = null;
    let currentProcedure: ProcedureNode | null = null;
    const labelMap = new Map<string, LabelNode>();

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        try {
            switch (token.type) {
                case 'SEGMENT': {
                    const segmentNameToken = tokens[++i];
                    if (!segmentNameToken || segmentNameToken.type!== 'REGISTER') {
                        throw new Error('Expected segment name after SEGMENT keyword');
                    }
                    currentSegment = {
                        type: 'SEGMENT',
                        name: segmentNameToken.value,
                        instructions: []
                    };
                    ast.push(currentSegment);
                    break;
                }
                case 'ENDS': {
                    if (!currentSegment) {
                        throw new Error('ENDS keyword without corresponding SEGMENT');
                    }
                    currentSegment = null;
                    break;
                }
                case 'LABEL': {
                    if (labelMap.has(token.value)) {
                        errors.push({
                            type: 'LabelError',
                            position: token.position,
                            message: `Label '${token.value}' is already defined at position ${labelMap.get(token.value)?.position}`
                        });
                    } else {
                        const labelNode: LabelNode = {
                            type: 'LABEL',
                            name: token.value,
                            position: token.position
                        };
                        labelMap.set(token.value, labelNode);
                        if (currentMacro) {
                            currentMacro.body.push(labelNode);
                        } else if (currentProcedure) {
                            currentProcedure.instructions.push(labelNode);
                        } else if (currentSegment) {
                            currentSegment.instructions.push(labelNode);
                        } else {
                            ast.push(labelNode);
                        }
                    }
                    break;
                }
                case 'INSTRUCTION': {
                    const instructionToken = token;
                    const operands: (RegisterNode | NumberNode | LabelReferenceNode | StringNode)[] = [];
                    while (i + 1 < tokens.length) {
                        const nextToken = tokens[++i];
                        if (nextToken.type === 'REGISTER') {
                            operands.push({ type: 'REGISTER', name: nextToken.value });
                        } else if (nextToken.type === 'NUMBER') {
                            operands.push({ type: 'NUMBER', value: parseInt(nextToken.value, 10) });
                        } else if (nextToken.type === 'LABEL') {
                            operands.push({ type: 'LABEL_REFERENCE', name: nextToken.value });
                        } else if (nextToken.type === 'STRING') {
                            operands.push({ type: 'STRING', value: nextToken.value });
                        } else if (nextToken.type === 'COMMA') {
                            continue;
                        } else {
                            i--;
                            break;
                        }
                    }
                    const instructionNode: InstructionNode = {
                        type: 'INSTRUCTION',
                        name: instructionToken.value,
                        operands
                    };
                    if (currentMacro) {
                        currentMacro.body.push(instructionNode);
                    } else if (currentProcedure) {
                        currentProcedure.instructions.push(instructionNode);
                    } else if (currentSegment) {
                        currentSegment.instructions.push(instructionNode);
                    } else {
                        ast.push(instructionNode);
                    }
                    break;
                }
                case 'INCLUDE': {
                    const filename = token.value;
                    const fileContent = readFile(filename);
                    const { tokens: includedTokens, errors: includedErrors } = tokenize(fileContent);
                    errors.push(...includedErrors.map(err => ({
                        ...err,
                        message: `In included file ${filename}: ${err.message}`
                    })));
                    const { ast: includedAst, errors: parseErrors } = parse(includedTokens);
                    errors.push(...parseErrors.map(err => ({
                        ...err,
                        message: `In included file ${filename}: ${err.message}`
                    })));
                    const includeNode: IncludeNode = {
                        type: 'INCLUDE',
                        filename,
                        ast: includedAst
                    };
                    if (currentMacro) {
                        currentMacro.body.push(includeNode);
                    } else if (currentProcedure) {
                        currentProcedure.instructions.push(includeNode);
                    } else if (currentSegment) {
                        currentSegment.instructions.push(includeNode);
                    } else {
                        ast.push(includeNode);
                    }
                    break;
                }
                case 'PROCESSOR_DIRECTIVE': {
                    const directiveNode: ProcessorDirectiveNode = {
                        type: 'PROCESSOR_DIRECTIVE',
                        directive: token.value
                    };
                    if (currentMacro) {
                        currentMacro.body.push(directiveNode);
                    } else if (currentProcedure) {
                        currentProcedure.instructions.push(directiveNode);
                    } else if (currentSegment) {
                        currentSegment.instructions.push(directiveNode);
                    } else {
                        ast.push(directiveNode);
                    }
                    break;
                }
                case 'MACRO_START': {
                    const macroNameToken = tokens[++i];
                    if (!macroNameToken || macroNameToken.type!== 'REGISTER') {
                        throw new Error('Expected macro name after MACRO keyword');
                    }
                    currentMacro = {
                        type: 'MACRO_DEFINITION',
                        name: macroNameToken.value,
                        body: []
                    };
                    break;
                }
                case 'MACRO_END': {
                    if (!currentMacro) {
                        throw new Error('ENDM keyword without corresponding MACRO');
                    }
                    if (currentSegment) {
                        currentSegment.instructions.push(currentMacro);
                    } else {
                        ast.push(currentMacro);
                    }
                    currentMacro = null;
                    break;
                }
                case 'PROC': {
                    const procedureNameToken = tokens[++i];
                    if (!procedureNameToken || procedureNameToken.type!== 'REGISTER') {
                        throw new Error('Expected procedure name after PROC keyword');
                    }
                    currentProcedure = {
                        type: 'PROCEDURE',
                        name: procedureNameToken.value,
                        instructions: []
                    };
                    break;
                }
                case 'ENDP': {
                    if (!currentProcedure) {
                        throw new Error('ENDP keyword without corresponding PROC');
                    }
                    if (currentSegment) {
                        currentSegment.instructions.push(currentProcedure);
                    } else {
                        ast.push(currentProcedure);
                    }
                    currentProcedure = null;
                    break;
                }
                case 'EQU': {
                    const labelToken = tokens[i - 1];
                    if (!labelToken || labelToken.type!== 'LABEL') {
                        throw new Error('Expected label before EQU keyword');
                    }
                    const valueToken = tokens[++i];
                    let value: number | LabelReferenceNode;
                    if (valueToken.type === 'NUMBER') {
                        value = parseInt(valueToken.value, 10);
                    } else if (valueToken.type === 'LABEL') {
                        value = { type: 'LABEL_REFERENCE', name: valueToken.value };
                    } else {
                        throw new Error('Expected number or label after EQU keyword');
                    }
                    const equNode: EquNode = {
                        type: 'EQU',
                        label: labelToken.value,
                        value
                    };
                    if (currentMacro) {
                        currentMacro.body.push(equNode);
                    } else if (currentProcedure) {
                        currentProcedure.instructions.push(equNode);
                    } else if (currentSegment) {
                        currentSegment.instructions.push(equNode);
                    } else {
                        ast.push(equNode);
                    }
                    break;
                }
                case 'DB':
                case 'DW': {
                    const values: (NumberNode | StringNode)[] = [];
                    while (i + 1 < tokens.length) {
                        const nextToken = tokens[++i];
                        if (nextToken.type === 'NUMBER') {
                            values.push({ type: 'NUMBER', value: parseInt(nextToken.value, 10) });
                        } else if (nextToken.type === 'STRING') {
                            values.push({ type: 'STRING', value: nextToken.value });
                        } else if (nextToken.type === 'COMMA') {
                            continue;
                        } else {
                            i--;
                            break;
                        }
                    }
                    const dataNode: DataNode = {
                        type: 'DATA',
                        directive: token.type as 'DB' | 'DW',
                        values
                    };
                    if (currentMacro) {
                        currentMacro.body.push(dataNode);
                    } else if (currentProcedure) {
                        currentProcedure.instructions.push(dataNode);
                    } else if (currentSegment) {
                        currentSegment.instructions.push(dataNode);
                    } else {
                        ast.push(dataNode);
                    }
                    break;
                }
            }
        } catch (e) {
            const errorMessage = e instanceof Error? e.message : 'Unknown error';
            errors.push({
                type: 'SyntaxError',
                position: token.position,
                message: errorMessage
            });
        }
    }

    if (currentSegment) {
        errors.push({
            type: 'SyntaxError',
            position: tokens[tokens.length - 1]?.position || 0,
            message: 'Unclosed segment'
        });
    }
    if (currentMacro) {
        errors.push({
            type: 'SyntaxError',
            position: tokens[tokens.length - 1]?.position || 0,
            message: 'Unclosed macro'
        });
    }
    if (currentProcedure) {
        errors.push({
            type: 'SyntaxError',
            position: tokens[tokens.length - 1]?.position || 0,
            message: 'Unclosed procedure'
        });
    }

    return { ast, errors };
}
    