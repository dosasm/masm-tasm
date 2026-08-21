/**
 * Recursive descent parser for MASM/TASM assembly language.
 *
 * Parses a token stream into an AST. The parser is line-oriented:
 * assembly statements are one-per-line, with newline as the statement terminator.
 *
 * Block structures (SEGMENT/ENDS, PROC/ENDP, MACRO/ENDM) are parsed recursively.
 */

import { Token, TokenType, DATA_DIRECTIVES, EQUATE_DIRECTIVES, SIMPLIFIED_SEGMENTS } from './tokens';
import {
    AstNode, ProgramNode, SegmentNode, ProcNode, MacroNode, StructNode,
    LabelNode, InstructionNode, VariableNode, ConstantNode, DirectiveNode,
    IncludeNode, ExternNode, CommentNode, BlankLineNode, OperandNode,
    AstRange, tokenToRange, makeRange, mergeRanges,
} from './nodes';

export class Parser {
    private tokens: Token[];
    private pos = 0;
    private currentLine = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens.filter(t => t.type !== TokenType.Newline);
    }

    // ─── Public API ─────────────────────────────────────────────────────

    parse(): ProgramNode {
        const children: AstNode[] = [];
        while (!this.isAtEnd()) {
            this.skipNewlinesAndComments();
            if (this.isAtEnd()) { break; }
            const node = this.parseStatement();
            if (node) {
                children.push(node);
            }
        }
        const range = children.length > 0
            ? mergeRanges(children[0].range, children[children.length - 1].range)
            : makeRange(0, 0, 0, 0);
        return { kind: 'program', children, range };
    }

    // ─── Token Navigation ───────────────────────────────────────────────

    private isAtEnd(): boolean {
        return this.pos >= this.tokens.length || this.peek().type === TokenType.Eof;
    }

    private peek(): Token {
        return this.tokens[this.pos] ?? { type: TokenType.Eof, text: '', offset: 0, line: 0, column: 0 };
    }

    private peekAt(offset: number): Token {
        const idx = this.pos + offset;
        return this.tokens[idx] ?? { type: TokenType.Eof, text: '', offset: 0, line: 0, column: 0 };
    }

    private advance(): Token {
        const tok = this.tokens[this.pos];
        if (tok && tok.type !== TokenType.Eof) { this.pos++; }
        return tok;
    }

    private match(type: TokenType): boolean {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }

    private check(type: TokenType): boolean {
        return this.peek().type === type;
    }

    private checkText(text: string): boolean {
        return this.peek().text.toUpperCase() === text.toUpperCase();
    }

    private expect(type: TokenType): Token {
        if (this.check(type)) {
            return this.advance();
        }
        // Error recovery: return current token anyway
        return this.peek();
    }

    /** Skip newline and comment tokens that appear between statements. */
    private skipNewlinesAndComments(): void {
        while (!this.isAtEnd() &&
            (this.peek().type === TokenType.Comment || this.peek().type === TokenType.Newline)) {
            this.advance();
        }
    }

    /** Consume tokens until the next line or EOF (rest of the current line). */
    private consumeRestOfLine(): Token[] {
        const rest: Token[] = [];
        while (!this.isAtEnd() && this.peek().line <= this.currentLine && this.peek().type !== TokenType.Newline) {
            rest.push(this.advance());
        }
        return rest;
    }

    /** Collect remaining tokens on the line as a raw string. */
    private restOfLineText(): string {
        const parts: string[] = [];
        while (!this.isAtEnd() && this.peek().line <= this.currentLine && this.peek().type !== TokenType.Newline) {
            parts.push(this.peek().text);
            this.advance();
        }
        return parts.join(' ');
    }

    /** Extract a trailing comment token if present. */
    private extractTrailingComment(): CommentNode | undefined {
        if (this.check(TokenType.Comment)) {
            const tok = this.advance();
            return {
                kind: 'comment',
                text: tok.text,
                range: tokenToRange(tok),
            };
        }
        return undefined;
    }

    // ─── Statement Parsing ──────────────────────────────────────────────

    /**
     * Parse a single statement. Determines the statement type from context.
     */
    private parseStatement(): AstNode | null {
        const tok = this.peek();
        this.currentLine = tok.line;

        // Comment-only line
        if (tok.type === TokenType.Comment) {
            this.advance();
            return { kind: 'comment', text: tok.text, range: tokenToRange(tok) };
        }

        // Dot-directive: `.386`, `.8086`, etc. (lexer produces Dot + Number)
        if (tok.type === TokenType.Dot) {
            return this.parseDotDirective();
        }

        // Identifier: could be label, variable, constant, macro, segment, proc, struct, or instruction-invoked-as-identifier
        if (tok.type === TokenType.Identifier || tok.type === TokenType.Instruction ||
            tok.type === TokenType.Register || tok.type === TokenType.Directive) {
            return this.parseIdentifierLine(tok);
        }

        // Data directive at start of line (anonymous variable: DB 10 DUP(?))
        if (DATA_DIRECTIVES.has(tok.text.toUpperCase())) {
            return this.parseVariable(undefined, undefined);
        }

        // Any other token — consume the line as a directive
        this.advance();
        return null;
    }

    /** Parse a dot-directive like `.386`, `.8086`, etc. */
    private parseDotDirective(): DirectiveNode {
        const dotTok = this.advance(); // consume '.'
        const nameParts: string[] = [dotTok.text];
        // Collect subsequent word/number tokens as part of the directive name
        while (!this.isAtEnd() && this.peek().line <= this.currentLine &&
            (this.peek().type === TokenType.Identifier || this.peek().type === TokenType.Number ||
             this.peek().type === TokenType.Instruction || this.peek().type === TokenType.Register)) {
            nameParts.push(this.peek().text);
            this.advance();
        }
        const name = nameParts.join('');
        const restText = this.restOfLineText().trim();
        const range = tokenToRange(dotTok);
        return {
            kind: 'directive',
            name,
            nameRange: range,
            arguments: restText,
            range,
        };
    }

    /**
     * When the first token is an Identifier (or could be one), figure out
     * what kind of statement this is by looking at what follows.
     */
    private parseIdentifierLine(firstToken: Token): AstNode | null {
        const name = firstToken;
        const nameRange = tokenToRange(name);
        const next = this.peekAt(1);

        // Check the second token on the line to disambiguate
        if (next.type === TokenType.Colon) {
            // Label: `name:`
            return this.parseLabel(name, nameRange);
        }

        if (next.type === TokenType.Directive || next.type === TokenType.SizeDirective) {
            const directiveText = next.text.toUpperCase();

            // Block openers
            if (directiveText === 'MACRO') {
                return this.parseMacro(name, nameRange);
            }
            if (directiveText === 'SEGMENT') {
                return this.parseSegment(name, nameRange);
            }
            if (directiveText === 'PROC') {
                return this.parseProc(name, nameRange);
            }
            if (directiveText === 'STRUCT' || directiveText === 'STRUC' || directiveText === 'UNION') {
                return this.parseStruct(name, nameRange);
            }

            // Block closers — consume the name so parseBlock sees the closer token
            if (directiveText === 'ENDS') {
                this.advance(); // consume name so peek() lands on ENDS
                return null;
            }
            if (directiveText === 'ENDP') {
                this.advance(); // consume name so peek() lands on ENDP
                return null;
            }
            if (directiveText === 'END') {
                this.advance(); // consume name
                this.advance(); // consume END
                this.consumeRestOfLine();
                return null;
            }

            // Data definitions: name DB/DW/DD/DQ/DF/DT value
            if (DATA_DIRECTIVES.has(directiveText)) {
                return this.parseVariable(name, nameRange);
            }

            // Equates: name EQU value, name TEXTEQU value
            if (EQUATE_DIRECTIVES.has(directiveText)) {
                return this.parseConstant(name, nameRange);
            }

            // Extern/scope declarations
            if (directiveText === 'EXTERN' || directiveText === 'EXTERNDEF' || directiveText === 'PUBLIC' || directiveText === 'COMM') {
                return this.parseExtern(name, nameRange, directiveText);
            }

            // size type (e.g. name DWORD ...) - could be a variable with a size directive
            if (next.type === TokenType.SizeDirective) {
                // Check if there's a data directive after: `name DWORD DD value` is unlikely
                // More likely: `name DWORD PTR [...]` or just `name DWORD 0`
                // Treat as variable
                return this.parseVariable(name, nameRange);
            }
        }

        // name = expr (constant with = sign)
        if (next.type === TokenType.Equals) {
            return this.parseConstantWithEquals(name, nameRange);
        }

        // If the name is actually a known instruction (like MOV misclassified as Identifier due to case)
        // This shouldn't normally happen since the lexer classifies instructions, but just in case:
        if (firstToken.type === TokenType.Instruction) {
            return this.parseInstructionFrom(firstToken);
        }

        // Default: treat as a label without colon (common in MASM for code labels)
        // or as a statement with the name as operator
        return this.parseLabelOrInstruction(name, nameRange);
    }

    // ─── Block Parsers ──────────────────────────────────────────────────

    private parseLabel(nameToken: Token, nameRange: AstRange): LabelNode {
        this.advance(); // consume name
        this.advance(); // consume ':'
        const comment = this.extractTrailingComment();
        this.skipToLineEnd();
        return {
            kind: 'label',
            name: nameToken.text,
            nameRange,
            isNear: true,
            range: mergeRanges(nameRange, comment?.range),
        };
    }

    private parseLabelOrInstruction(nameToken: Token, nameRange: AstRange): AstNode {
        // Look ahead to see if this line looks like an instruction invocation
        // e.g., `MYPROC` on its own line could be a label or a macro invocation
        // If followed by operands (commas, registers, numbers), treat as instruction
        const next = this.peekAt(1);

        if (next.type === TokenType.Newline || next.type === TokenType.Comment || next.type === TokenType.Eof ||
            next.line > this.currentLine) {
            // Standalone identifier — could be a label or macro invocation
            this.advance(); // consume name
            const comment = this.extractTrailingComment();
            this.skipToLineEnd();
            return {
                kind: 'label',
                name: nameToken.text,
                nameRange,
                isNear: false,
                range: mergeRanges(nameRange, comment?.range),
            };
        }

        // Has operands — treat as instruction (macro call or actual instruction)
        return this.parseInstructionFrom(nameToken);
    }

    private parseMacro(nameToken: Token, nameRange: AstRange): MacroNode {
        this.advance(); // consume name
        this.advance(); // consume MACRO
        const parameters = this.parseMacroParameters();
        this.skipToLineEnd();

        const children = this.parseBlock('ENDM');
        const endTok = this.peek();
        const endRange = this.checkText('ENDM') ? tokenToRange(endTok) : undefined;
        if (endRange) { this.advance(); } // consume ENDM

        // If no closer found (truncated file), extend range to include children
        const effectiveEndRange = endRange ?? (children.length > 0 ? children[children.length - 1].range : nameRange);

        return {
            kind: 'macro',
            name: nameToken.text,
            nameRange,
            parameters,
            children,
            range: mergeRanges(nameRange, effectiveEndRange),
        };
    }

    private parseMacroParameters(): string[] {
        const params: string[] = [];
        while (!this.isAtEnd() && this.peek().line <= this.currentLine && this.peek().type !== TokenType.Newline) {
            if (this.peek().type === TokenType.Identifier) {
                params.push(this.peek().text);
            }
            this.advance();
        }
        return params;
    }

    private parseSegment(nameToken: Token, nameRange: AstRange): SegmentNode {
        this.advance(); // consume name
        this.advance(); // consume SEGMENT
        const attrText = this.restOfLineText();

        const children = this.parseBlock('ENDS');
        const endTok = this.peek();
        const endRange = this.checkText('ENDS') ? tokenToRange(endTok) : undefined;
        if (endRange) { this.advance(); } // consume ENDS

        // If no closer found (truncated file), extend range to include children
        const effectiveEndRange = endRange ?? (children.length > 0 ? children[children.length - 1].range : nameRange);

        return {
            kind: 'segment',
            name: nameToken.text,
            nameRange,
            directive: 'SEGMENT',
            children,
            range: mergeRanges(nameRange, effectiveEndRange),
        };
    }

    private parseProc(nameToken: Token, nameRange: AstRange): ProcNode {
        this.advance(); // consume name
        this.advance(); // consume PROC
        const attributes = this.restOfLineText().trim();

        const children = this.parseBlock('ENDP');
        const endTok = this.peek();
        const endRange = this.checkText('ENDP') ? tokenToRange(endTok) : undefined;
        if (endRange) { this.advance(); } // consume ENDP

        // If no closer found (truncated file), extend range to include children
        const effectiveEndRange = endRange ?? (children.length > 0 ? children[children.length - 1].range : nameRange);

        return {
            kind: 'proc',
            name: nameToken.text,
            nameRange,
            attributes,
            children,
            range: mergeRanges(nameRange, effectiveEndRange),
        };
    }

    private parseStruct(nameToken: Token, nameRange: AstRange): StructNode {
        this.advance(); // consume name
        const keyword = this.advance().text.toUpperCase() as 'STRUCT' | 'UNION';
        this.skipToLineEnd();

        const children = this.parseBlock('ENDS');
        const fields = children.filter((n): n is VariableNode => n.kind === 'variable');
        const endTok = this.peek();
        const endRange = this.checkText('ENDS') ? tokenToRange(endTok) : undefined;
        if (endRange) { this.advance(); }

        return {
            kind: 'struct',
            name: nameToken.text,
            nameRange,
            keyword,
            fields,
            range: mergeRanges(nameRange, endRange),
        };
    }

    /**
     * Parse statements until we hit the expected closing directive (ENDM, ENDS, ENDP).
     * Also stops if we hit EOF or an unexpected closer.
     */
    private parseBlock(closer: string): AstNode[] {
        const children: AstNode[] = [];
        while (!this.isAtEnd()) {
            this.skipNewlinesAndComments();
            if (this.isAtEnd()) { break; }

            // Check for the expected closer
            if (this.checkText(closer)) {
                break;
            }

            // Check for unexpected closers (mismatched blocks)
            const tokText = this.peek().text.toUpperCase();
            if (tokText === 'ENDM' || tokText === 'ENDS' || tokText === 'ENDP') {
                break;
            }

            const node = this.parseStatement();
            if (node) {
                children.push(node);
            }
        }
        return children;
    }

    // ─── Simple Statement Parsers ───────────────────────────────────────

    private parseVariable(nameToken: Token | undefined, nameRange: AstRange | undefined): VariableNode {
        if (nameToken) { this.advance(); } // consume name
        const dataTypeTok = this.advance(); // consume DB/DW/DD/etc
        const valueStart = this.peek();
        const valueText = this.restOfLineText().trim();

        const line = nameToken?.line ?? dataTypeTok.line;
        const endCol = valueText.length > 0
            ? (this.tokens[this.pos - 1]?.column ?? 0) + (this.tokens[this.pos - 1]?.text.length ?? 0)
            : dataTypeTok.column + dataTypeTok.text.length;

        return {
            kind: 'variable',
            name: nameToken?.text,
            nameRange,
            dataType: dataTypeTok.text.toUpperCase(),
            value: valueText,
            valueRange: makeRange(line, dataTypeTok.column + dataTypeTok.text.length + 1, line, endCol),
            range: mergeRanges(nameRange, tokenToRange(dataTypeTok)),
        };
    }

    private parseConstant(nameToken: Token, nameRange: AstRange): ConstantNode {
        this.advance(); // consume name
        const equateTok = this.advance(); // consume EQU/TEXTEQU
        const value = this.restOfLineText().trim();

        return {
            kind: 'constant',
            name: nameToken.text,
            nameRange,
            equateType: equateTok.text.toUpperCase() as 'EQU' | 'TEXTEQU',
            value,
            range: mergeRanges(nameRange, tokenToRange(equateTok)),
        };
    }

    private parseConstantWithEquals(nameToken: Token, nameRange: AstRange): ConstantNode {
        this.advance(); // consume name
        this.advance(); // consume '='
        const value = this.restOfLineText().trim();

        return {
            kind: 'constant',
            name: nameToken.text,
            nameRange,
            equateType: '=',
            value,
            range: nameRange,
        };
    }

    private parseExtern(nameToken: Token, nameRange: AstRange, directive: string): ExternNode {
        this.advance(); // consume name
        this.advance(); // consume EXTERN/EXTERNDEF/...
        const typeSpec = this.restOfLineText().trim();

        return {
            kind: 'extern',
            name: nameToken.text,
            nameRange,
            directive: directive as ExternNode['directive'],
            typeSpec,
            range: nameRange,
        };
    }

    private parseInclude(): IncludeNode {
        const directiveTok = this.advance(); // consume INCLUDE/INCLUDELIB
        const pathTok = this.peek();
        let path = '';

        // The path might be a string literal or an identifier
        if (pathTok.type === TokenType.String) {
            path = pathTok.text.replace(/^['"]|['"]$/g, '');
            this.advance();
        } else if (pathTok.type === TokenType.Identifier) {
            path = pathTok.text;
            this.advance();
        }

        this.skipToLineEnd();

        return {
            kind: 'include',
            path,
            pathRange: tokenToRange(pathTok),
            directive: directiveTok.text.toUpperCase() as 'INCLUDE' | 'INCLUDELIB',
            range: mergeRanges(tokenToRange(directiveTok), tokenToRange(pathTok)),
        };
    }

    private parseInstructionFrom(mnemonicTok: Token): InstructionNode {
        this.advance(); // consume the mnemonic token
        const mnemonicRange = tokenToRange(mnemonicTok);
        const operands = this.parseOperands();
        const comment = this.extractTrailingComment();
        this.skipToLineEnd();

        const lastRange = comment?.range ?? (operands.length > 0 ? operands[operands.length - 1].range : mnemonicRange);

        return {
            kind: 'instruction',
            mnemonic: mnemonicTok.text,
            mnemonicRange,
            operands,
            comment,
            range: mergeRanges(mnemonicRange, lastRange),
        };
    }

    /**
     * Parse comma-separated operands for an instruction.
     * Stops at newline, comment, or EOF.
     */
    private parseOperands(): OperandNode[] {
        const operands: OperandNode[] = [];

        while (!this.isAtEnd()) {
            const tok = this.peek();
            if (tok.line > this.currentLine || tok.type === TokenType.Comment || tok.type === TokenType.Eof) {
                break;
            }

            // Collect tokens for this operand (until comma or end of line)
            const opTokens: Token[] = [];
            let depth = 0; // bracket/paren nesting depth
            while (!this.isAtEnd()) {
                const t = this.peek();
                if (t.line > this.currentLine || t.type === TokenType.Comment || t.type === TokenType.Eof) {
                    break;
                }
                if (t.type === TokenType.Comma && depth === 0) {
                    break; // next operand
                }
                if (t.type === TokenType.LBracket || t.type === TokenType.LParen) { depth++; }
                if (t.type === TokenType.RBracket || t.type === TokenType.RParen) { depth--; }
                opTokens.push(this.advance());
            }

            if (opTokens.length > 0) {
                const text = opTokens.map(t => t.text).join(' ');
                const range = mergeRanges(tokenToRange(opTokens[0]), tokenToRange(opTokens[opTokens.length - 1]));
                operands.push({ kind: 'operand', text, tokens: opTokens, range });
            }

            // Consume comma separator
            if (this.check(TokenType.Comma)) {
                this.advance();
            }
        }

        return operands;
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    private skipToLineEnd(): void {
        // In the filtered token stream (no newlines), we don't need to skip to line end.
        // But we should still consume trailing comments.
        if (this.check(TokenType.Comment)) {
            this.advance();
        }
    }
}
