import { Token, TokenType, ErrorInfo } from './ast';

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

// Check if a value is an instruction
function isInstruction(value: string, instructions = commonInstructions): boolean {
    return instructions.includes(value.toUpperCase());
}

// Lexical analyzer
export function tokenize(input: string): { tokens: Token[]; errors: ErrorInfo[] } {
    const tokens: Token[] = [];
    const errors: ErrorInfo[] = [];
    const regex = /\s*(?:([A-Za-z]+):?|(\d+)|(,)|(SEGMENT)|(ENDS)|(INCLUDE)\s+([^\s]+)|(\.[A-Za-z0-9]+)|(MACRO)|(ENDM)|(PROC)|(ENDP)|(".*?")|(EQU)|(DB|DW))\s*/g;
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
            tokens.push({ type: 'PROCESSOR_DIRECTIVE', value: match[8], position });
        } else if (match[9]) {
            tokens.push({ type: 'MACRO_START', value: match[9], position });
        } else if (match[10]) {
            tokens.push({ type: 'MACRO_END', value: match[10], position });
        } else if (match[11]) {
            tokens.push({ type: 'PROC', value: match[11], position });
        } else if (match[12]) {
            tokens.push({ type: 'ENDP', value: match[12], position });
        } else if (match[13]) {
            tokens.push({ type: 'STRING', value: match[13].slice(1, -1), position });
        } else if (match[14]) {
            tokens.push({ type: 'EQU', value: match[14], position });
        } else if (match[15]) {
            tokens.push({ type: match[15] as 'DB' | 'DW', value: match[15], position });
        }
    }
    return { tokens, errors };
}

    