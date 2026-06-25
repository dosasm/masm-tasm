/**
 * Lexer for MASM/TASM assembly language.
 * Tokenizes source text into a flat stream of typed tokens.
 *
 * Handles: hex (0FFh), binary (101b), octal (77q), decimal (42, 10d),
 * strings ('...' and "..."), line comments (;), dot-directives (.CODE),
 * and all punctuation. Instruction/register/directive classification
 * uses lookup tables from tokens.ts.
 */

import { Token, TokenType, classifyWord } from './tokens';

export class Lexer {
    private source: string;
    private tokens: Token[] = [];
    private pos = 0;
    private line = 0;
    private column = 0;
    private readonly length: number;

    constructor(source: string) {
        this.source = source;
        this.length = source.length;
    }

    tokenize(): Token[] {
        while (!this.isAtEnd()) {
            this.scanToken();
        }
        this.addToken(TokenType.Eof, '');
        return this.tokens;
    }

    // ─── Character Navigation ───────────────────────────────────────────

    private isAtEnd(): boolean {
        return this.pos >= this.length;
    }

    private peek(): string {
        return this.isAtEnd() ? '\0' : this.source[this.pos];
    }

    private peekNext(): string {
        return this.pos + 1 >= this.length ? '\0' : this.source[this.pos + 1];
    }

    private peekAt(offset: number): string {
        const p = this.pos + offset;
        return p >= this.length ? '\0' : this.source[p];
    }

    private advance(): string {
        const ch = this.source[this.pos++];
        if (ch === '\n') {
            this.line++;
            this.column = 0;
        } else {
            this.column++;
        }
        return ch;
    }

    private match(expected: string): boolean {
        if (this.isAtEnd()) { return false; }
        if (this.source[this.pos] !== expected) { return false; }
        this.advance();
        return true;
    }

    private addToken(type: TokenType, text: string, offset?: number): void {
        this.tokens.push({
            type,
            text,
            offset: offset ?? this.pos - text.length,
            line: this.line,
            column: this.column - text.length,
        });
    }

    private isAlpha(ch: string): boolean {
        return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '@' || ch === '?' || ch === '$';
    }

    private isDigit(ch: string): boolean {
        return ch >= '0' && ch <= '9';
    }

    private isAlphaNumeric(ch: string): boolean {
        return this.isAlpha(ch) || this.isDigit(ch);
    }

    private isHexDigit(ch: string): boolean {
        return this.isDigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
    }

    private isBinaryDigit(ch: string): boolean {
        return ch === '0' || ch === '1';
    }

    private isOctalDigit(ch: string): boolean {
        return ch >= '0' && ch <= '7';
    }

    // ─── Token Scanning ─────────────────────────────────────────────────

    private scanToken(): void {
        const ch = this.advance();
        const startOffset = this.pos - 1;
        const startCol = this.column - 1;

        switch (ch) {
            // Whitespace (skip)
            case ' ':
            case '\t':
            case '\r':
                break;

            // Newline
            case '\n':
                this.addToken(TokenType.Newline, '\n', startOffset);
                break;

            // Single-line comment
            case ';':
                this.scanComment(startOffset, startCol);
                break;

            // Punctuation
            case ':': this.addToken(TokenType.Colon, ':', startOffset); break;
            case ',': this.addToken(TokenType.Comma, ',', startOffset); break;
            case '[': this.addToken(TokenType.LBracket, '[', startOffset); break;
            case ']': this.addToken(TokenType.RBracket, ']', startOffset); break;
            case '(': this.addToken(TokenType.LParen, '(', startOffset); break;
            case ')': this.addToken(TokenType.RParen, ')', startOffset); break;
            case '+': this.addToken(TokenType.Plus, '+', startOffset); break;
            case '-': this.addToken(TokenType.Minus, '-', startOffset); break;
            case '*': this.addToken(TokenType.Mul, '*', startOffset); break;
            case '/': this.addToken(TokenType.Div, '/', startOffset); break;
            case '=': this.addToken(TokenType.Equals, '=', startOffset); break;

            // Dot (could be start of .CODE, .DATA, etc.)
            case '.':
                this.scanDotDirective(startOffset, startCol);
                break;

            // String literals
            case "'":
            case '"':
                this.scanString(ch, startOffset, startCol);
                break;

            // Number or identifier starting with a digit
            default:
                if (this.isDigit(ch)) {
                    this.scanNumber(ch, startOffset, startCol);
                } else if (this.isAlpha(ch)) {
                    this.scanIdentifier(startOffset, startCol);
                }
                // else: unknown character, skip
                break;
        }
    }

    // ─── Scanning Methods ───────────────────────────────────────────────

    private scanComment(startOffset: number, _startCol: number): void {
        while (!this.isAtEnd() && this.peek() !== '\n') {
            this.advance();
        }
        const text = this.source.substring(startOffset, this.pos);
        this.tokens.push({
            type: TokenType.Comment,
            text,
            offset: startOffset,
            line: this.line,
            column: 0, // will be recalculated if needed
        });
    }

    private scanString(quote: string, startOffset: number, _startCol: number): void {
        while (!this.isAtEnd()) {
            const ch = this.peek();
            if (ch === quote) {
                // Check for doubled quote (escape): '' or ""
                if (this.peekNext() === quote) {
                    this.advance(); // skip first quote
                    this.advance(); // skip second quote
                } else {
                    this.advance(); // consume closing quote
                    break;
                }
            } else if (ch === '\n') {
                break; // unterminated string
            } else {
                this.advance();
            }
        }
        const text = this.source.substring(startOffset, this.pos);
        this.addToken(TokenType.String, text, startOffset);
    }

    private scanNumber(first: string, startOffset: number, _startCol: number): void {
        let isHex = false;

        // Check for hex number starting with digit: look ahead for hex digits followed by 'h'/'H'
        // MASM allows: 0FFh, 9Ah, 0FFH
        // Also handle: 0x prefix (less common but accepted by some assemblers)
        if (first === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
            // 0x prefix
            this.advance(); // skip 'x'
            while (!this.isAtEnd() && this.isHexDigit(this.peek())) {
                this.advance();
            }
            isHex = true;
        } else {
            // Scan digits, then check for base suffix
            while (!this.isAtEnd() && this.isHexDigit(this.peek())) {
                this.advance();
            }

            // Check for 'h'/'H' suffix (hex)
            if (!this.isAtEnd() && (this.peek() === 'h' || this.peek() === 'H')) {
                this.advance();
                isHex = true;
            }
            // Check for binary suffix 'b'/'B'
            else if (!this.isAtEnd() && (this.peek() === 'b' || this.peek() === 'B')) {
                this.advance();
            }
            // Check for octal suffix 'q'/'Q'/'o'/'O'
            else if (!this.isAtEnd() && (this.peek() === 'q' || this.peek() === 'Q' || this.peek() === 'o' || this.peek() === 'O')) {
                this.advance();
            }
            // Check for decimal suffix 'd'/'D'
            else if (!this.isAtEnd() && (this.peek() === 'd' || this.peek() === 'D')) {
                this.advance();
            }
            // Check for 't'/'T' suffix (sometimes used for decimal in TASM)
            else if (!this.isAtEnd() && (this.peek() === 't' || this.peek() === 'T')) {
                this.advance();
            }
            // Floating point: contains '.'
            else if (!this.isAtEnd() && this.peek() === '.') {
                this.advance();
                while (!this.isAtEnd() && this.isDigit(this.peek())) {
                    this.advance();
                }
                // Optional exponent
                if (!this.isAtEnd() && (this.peek() === 'e' || this.peek() === 'E')) {
                    this.advance();
                    if (!this.isAtEnd() && (this.peek() === '+' || this.peek() === '-')) {
                        this.advance();
                    }
                    while (!this.isAtEnd() && this.isDigit(this.peek())) {
                        this.advance();
                    }
                }
                // Optional 'r'/'R' suffix for REAL
                if (!this.isAtEnd() && (this.peek() === 'r' || this.peek() === 'R')) {
                    this.advance();
                }
            }
        }

        const text = this.source.substring(startOffset, this.pos);
        this.addToken(TokenType.Number, text, startOffset);
    }

    private scanDotDirective(startOffset: number, _startCol: number): void {
        // Dot followed by a letter: .CODE, .DATA, .386, etc.
        if (!this.isAtEnd() && this.isAlpha(this.peek())) {
            while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
                this.advance();
            }
        }
        const text = this.source.substring(startOffset, this.pos);
        const upper = text.toUpperCase();

        // Classify the dot-directive
        if (upper === '.') {
            // Just a dot (struct member access like [STRUCT.field])
            this.addToken(TokenType.Dot, '.', startOffset);
        } else {
            // .CODE, .DATA, .386, .MODEL, etc. — classify as Directive
            this.addToken(classifyWord(text), text, startOffset);
        }
    }

    private scanIdentifier(startOffset: number, _startCol: number): void {
        while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
            this.advance();
        }

        const text = this.source.substring(startOffset, this.pos);
        const type = classifyWord(text);
        this.addToken(type, text, startOffset);
    }
}

// ─── Convenience ────────────────────────────────────────────────────────────

/**
 * Tokenize a source string. Returns the token stream (including Newline and Eof tokens).
 */
export function tokenize(source: string): Token[] {
    return new Lexer(source).tokenize();
}
