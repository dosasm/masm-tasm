// Define token types
type TokenType = 'INSTRUCTION' | 'REGISTER' | 'NUMBER' | 'COMMA' | 'SEGMENT' | 'ENDS' | 'LABEL' | 'INCLUDE' | 'PROCESSOR_DIRECTIVE' | 'MODEL_DIRECTIVE' | 'STACK_DIRECTIVE' | 'DATA_DIRECTIVE' | 'CODE_DIRECTIVE';

// Define token interface
interface Token {
    type: TokenType;
    value: string;
    position: number;
}

// Define AST node types
type ASTNode = InstructionNode | SegmentNode | LabelNode | IncludeNode | ProcessorDirectiveNode | ModelDirectiveNode | StackDirectiveNode | DataDirectiveNode | CodeDirectiveNode;

// Define instruction node interface
interface InstructionNode {
    type: 'INSTRUCTION';
    name: string;
    operands: (RegisterNode | NumberNode | LabelReferenceNode)[];
}

// Define register node interface
interface RegisterNode {
    type: 'REGISTER';
    name: string;
}

// Define number node interface
interface NumberNode {
    type: 'NUMBER';
    value: number;
}

// Define segment node interface
interface SegmentNode {
    type: 'SEGMENT';
    name: string;
    instructions: ASTNode[];
}

// Define label node interface
interface LabelNode {
    type: 'LABEL';
    name: string;
    position: number;
}

// Define label reference node interface
interface LabelReferenceNode {
    type: 'LABEL_REFERENCE';
    name: string;
}

// Define include node interface
interface IncludeNode {
    type: 'INCLUDE';
    filename: string;
    ast: ASTNode[];
}

// Define processor directive node interface
interface ProcessorDirectiveNode {
    type: 'PROCESSOR_DIRECTIVE';
    directive: string;
}

// Define .MODEL directive node interface
interface ModelDirectiveNode {
    type: 'MODEL_DIRECTIVE';
    model: string;
}

// Define .STACK directive node interface
interface StackDirectiveNode {
    type: 'STACK_DIRECTIVE';
    size: number;
}

// Define .DATA directive node interface
interface DataDirectiveNode {
    type: 'DATA_DIRECTIVE';
}

// Define .CODE directive node interface
interface CodeDirectiveNode {
    type: 'CODE_DIRECTIVE';
}

// Define error information interface
interface ErrorInfo {
    type: string;
    position: number;
    message: string;
}

// Define common assembly instructions
const commonInstructions = [
    'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'INC', 'DEC', 'CMP',
    'JMP', 'JE', 'JNE', 'JG', 'JGE', 'JL', 'JLE',
    'PUSH', 'POP', 'CALL', 'RET'
];

// Simulate file reading function. Replace with actual file reading logic in production.
function readFile(filename: string): string {
    // Here you can implement the logic to read file content from the file system.
    // In this example, it simply returns an empty string. You need to modify it according to your actual situation.
    return '';
}

// Lexical analyzer
export function tokenize(input: string): { tokens: Token[]; errors: ErrorInfo[] } {
    const tokens: Token[] = [];
    const errors: ErrorInfo[] = [];
    const regex = /\s*(?:([A-Za-z]+):?|(\d+)|(,)|(SEGMENT)|(ENDS)|(INCLUDE)\s+([^\s]+)|(\.[A-Za-z0-9]+)(?:\s+([^\s]+))?)\s*/g;
    let match;
    while ((match = regex.exec(input))!== null) {
        const position = match.index;
        if (match[1]) {
            if (match[1].endsWith(':')) {
                tokens.push({ type: 'LABEL', value: match[1].slice(0, -1), position });
            } else if (isInstruction(match[1])) {
                tokens.push({ type: 'INSTRUCTION', value: match[1], position });
            } else {
                tokens.push({ type: 'REGISTER', value: match[1], position });
            }
        } else if (match[2]) {
            tokens.push({ type: 'NUMBER', value: match[2], position });
        } else if (match[3]) {
            tokens.push({ type: 'COMMA', value: match[3], position });
        } else if (match[4]) {
            tokens.push({ type: 'SEGMENT', value: match[4], position });
        } else if (match[5]) {
            tokens.push({ type: 'ENDS', value: match[5], position });
        } else if (match[6]) {
            tokens.push({ type: 'INCLUDE', value: match[7], position });
        } else if (match[8]) {
            switch (match[8].toUpperCase()) {
                case '.386':
                    tokens.push({ type: 'PROCESSOR_DIRECTIVE', value: match[8], position });
                    break;
                case '.MODEL':
                    if (!match[9]) {
                        errors.push({
                            type: 'SyntaxError',
                            position,
                            message: 'Expected model type after .MODEL directive'
                        });
                    } else {
                        tokens.push({ type: 'MODEL_DIRECTIVE', value: match[9], position });
                    }
                    break;
                case '.STACK':
                    if (!match[9] || isNaN(Number(match[9]))) {
                        errors.push({
                            type: 'SyntaxError',
                            position,
                            message: 'Expected a valid number for stack size after .STACK directive'
                        });
                    } else {
                        tokens.push({ type: 'STACK_DIRECTIVE', value: match[9], position });
                    }
                    break;
                case '.DATA':
                    tokens.push({ type: 'DATA_DIRECTIVE', value: match[8], position });
                    break;
                case '.CODE':
                    tokens.push({ type: 'CODE_DIRECTIVE', value: match[8], position });
                    break;
                default:
                    tokens.push({ type: 'PROCESSOR_DIRECTIVE', value: match[8], position });
            }
        }
    }
    return { tokens, errors };
}

// Check if a value is an instruction
function isInstruction(value: string, instructions = commonInstructions): boolean {
    return instructions.includes(value.toUpperCase());
}

// Syntax analyzer
export function parse(tokens: Token[]): { ast: ASTNode[]; errors: ErrorInfo[] } {
    const ast: ASTNode[] = [];
    const errors: ErrorInfo[] = [];
    let currentSegment: SegmentNode | null = null;
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
                        if (currentSegment) {
                            currentSegment.instructions.push(labelNode);
                        } else {
                            ast.push(labelNode);
                        }
                    }
                    break;
                }
                case 'INSTRUCTION': {
                    const instructionToken = token;
                    const operands: (RegisterNode | NumberNode | LabelReferenceNode)[] = [];
                    while (i + 1 < tokens.length) {
                        const nextToken = tokens[++i];
                        if (nextToken.type === 'REGISTER') {
                            operands.push({ type: 'REGISTER', name: nextToken.value });
                        } else if (nextToken.type === 'NUMBER') {
                            operands.push({ type: 'NUMBER', value: parseInt(nextToken.value, 10) });
                        } else if (nextToken.type === 'LABEL') {
                            operands.push({ type: 'LABEL_REFERENCE', name: nextToken.value });
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
                    if (currentSegment) {
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
                    if (currentSegment) {
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
                    if (currentSegment) {
                        currentSegment.instructions.push(directiveNode);
                    } else {
                        ast.push(directiveNode);
                    }
                    break;
                }
                case 'MODEL_DIRECTIVE': {
                    const modelDirectiveNode: ModelDirectiveNode = {
                        type: 'MODEL_DIRECTIVE',
                        model: token.value
                    };
                    ast.push(modelDirectiveNode);
                    break;
                }
                case 'STACK_DIRECTIVE': {
                    const stackDirectiveNode: StackDirectiveNode = {
                        type: 'STACK_DIRECTIVE',
                        size: parseInt(token.value, 10)
                    };
                    ast.push(stackDirectiveNode);
                    break;
                }
                case 'DATA_DIRECTIVE': {
                    const dataDirectiveNode: DataDirectiveNode = {
                        type: 'DATA_DIRECTIVE'
                    };
                    ast.push(dataDirectiveNode);
                    break;
                }
                case 'CODE_DIRECTIVE': {
                    const codeDirectiveNode: CodeDirectiveNode = {
                        type: 'CODE_DIRECTIVE'
                    };
                    ast.push(codeDirectiveNode);
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

    return { ast, errors };
}
