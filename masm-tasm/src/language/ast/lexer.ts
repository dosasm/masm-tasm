// Token type definitions
interface Token {
    type: string;
    value: string;
    line: number;
    column: number;
  }
  
  // Lexer class to tokenize assembly code
export class AssemblyLexer {
    private code: string;
    private lines: string[];
    private currentLine: number;
    private currentColumn: number;
  
    constructor(code: string) {
      this.code = code;
      this.lines = code.split('\n').map(line => line.trimEnd());
      this.currentLine = 0;
      this.currentColumn = 0;
    }
  
    // Main tokenize function
    public tokenize(): Token[] {
      const tokens: Token[] = [];
  
      while (this.currentLine < this.lines.length) {
        const line = this.lines[this.currentLine];
        if (line === '') {
          this.nextLine();
          continue;
        }
  
        this.currentColumn = 0;
        while (this.currentColumn < line.length) {
          const char = line[this.currentColumn];
          
          // Skip whitespace
          if (/\s/.test(char)) {
            this.currentColumn++;
            continue;
          }
  
          // Handle comments
          if (char === ';') {
            const comment = this.consumeUntilEndOfLine(line);
            tokens.push({
              type: 'Comment',
              value: comment,
              line: this.currentLine + 1,
              column: this.currentColumn + 1,
            });
            break;
          }
  
          // Handle directives (e.g., .386)
          if (char === '.') {
            const directive = this.consumeWord(line);
            tokens.push({
              type: 'Directive',
              value: directive,
              line: this.currentLine + 1,
              column: this.currentColumn + 1 - directive.length,
            });
            continue;
          }
  
          // Handle strings (e.g., 'hello tasm')
          if (char === "'"||char==='"') {
            const str = this.consumeString(line);
            tokens.push({
              type: 'String',
              value: str,
              line: this.currentLine + 1,
              column: this.currentColumn + 1 - str.length - 2,
            });
            continue;
          }
  
          // Handle words (instructions, registers, labels, etc.)
          const word = this.consumeWord(line);
          const token = this.classifyWord(word, line);
          if (token) {
            tokens.push({
              ...token,
              line: this.currentLine + 1,
              column: this.currentColumn + 1 - word.length,
            });
          }
          if (!token){
            break;
          }
        }
        this.nextLine();
      }
  
      return tokens;
    }
  
    // Move to the next line
    private nextLine(): void {
      this.currentLine++;
      this.currentColumn = 0;
    }
  
    // Consume characters until a whitespace or end of line
    private consumeWord(line: string): string {
      let word = '';
      let quoted='';
      if (line[this.currentColumn]=="'"||line[this.currentColumn]=='"'){
        quoted=line[this.currentColumn];
        while (this.currentColumn < line.length && line[this.currentColumn]==quoted) {
          word += line[this.currentColumn];
          this.currentColumn++;
        }
        return word;
      }
      while(/[:,\s]/.test(line[this.currentColumn])){
        this.currentColumn++;
      }
      while (this.currentColumn < line.length && !/[\s,;:]/.test(line[this.currentColumn])) {
        word += line[this.currentColumn];
        this.currentColumn++;
      }
      return word;
    }
  
    // Consume a string literal enclosed in single quotes
    private consumeString(line: string): string {
      let str = "'";
      this.currentColumn++; // Skip opening quote
      while (this.currentColumn < line.length && line[this.currentColumn] !== "'") {
        str += line[this.currentColumn];
        this.currentColumn++;
      }
      if (this.currentColumn < line.length) {
        str += "'";
        this.currentColumn++; // Skip closing quote
      }
      return str;
    }
  
    // Consume the rest of the line (for comments)
    private consumeUntilEndOfLine(line: string): string {
      const rest = line.slice(this.currentColumn);
      this.currentColumn = line.length;
      return rest;
    }
  
    // Classify a word into a specific token type
    private classifyWord(word: string, line: string) {
      // Label (ends with :)
      if (word.endsWith(':')) {
        return { type: 'Label', value: word };
      }
  
      // Segment keywords
      if (['SEGMENT', 'ENDS'].includes(word.toUpperCase())) {
        return { type: 'SegmentKeyword', value: word.toUpperCase() };
      }
  
      // Instructions
      const instructions = ['MOV', 'INT', 'LOOP', 'ASSUME'];
      if (instructions.includes(word.toUpperCase())) {
        return { type: 'Instruction', value: word.toUpperCase() };
      }
  
      // Registers
      const registers = ['AX', 'DS', 'CX', 'DX', 'CS', 'AH'];
      if (registers.includes(word.toUpperCase())) {
        return { type: 'Register', value: word.toUpperCase() };
      }
  
      // Special keywords (e.g., DATA, CODE, USE16, OFFSET)
      const keywords = ['DATA', 'CODE', 'USE16', 'OFFSET', 'END'];
      if (keywords.includes(word.toUpperCase())) {
        return { type: 'Keyword', value: word.toUpperCase() };
      }
  
      // Hexadecimal constants (e.g., 0AH, 21H, 4CH)
      if (/^[0-9A-F]+H$/i.test(word)) {
        return { type: 'HexConstant', value: word.toUpperCase() };
      }
  
      // Identifiers (e.g., MESG, BEG)
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(word)) {
        return { type: 'Identifier', value: word };
      }
  
      // Comma separator
      if (word === ',') {
        return { type: 'Comma', value: word };
      }
  
      return null; // Unrecognized token
    }
  }

  // Example usage
function main() {
  const asmCode = `; a simple hello word sample
.386
DATA SEGMENT USE16
    MESG DB 'hello tasm',0AH,'$'
DATA ENDS
CODE SEGMENT USE16
         ASSUME CS:CODE,DS:DATA
    BEG: MOV    AX,DATA
         MOV    DS, AX
         MOV    CX,8
    LAST:MOV    AH,9
         MOV    DX, OFFSET MESG
         INT    21H
         LOOP   LAST
         MOV    AH,4CH
         INT    21H             ;BACK TO DOS
CODE ENDS
END  BEG`;

  const lexer = new AssemblyLexer(asmCode);
  const tokens = lexer.tokenize();

  console.log('Tokens:', JSON.stringify(tokens, null, 2));
}

main();