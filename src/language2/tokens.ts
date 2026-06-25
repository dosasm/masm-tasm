/**
 * Token types and classification tables for MASM/TASM assembly language.
 * This module defines the vocabulary that the lexer produces and the parser consumes.
 */

// ─── Token Type Enum ────────────────────────────────────────────────────────

export enum TokenType {
    // Literals
    Number,          // 0FFh, 101b, 77q, 42, 10d, 3.14
    String,          // 'hello', "hello"

    // Identifiers & Keywords
    Identifier,      // myVar, MyProc, start
    Instruction,     // MOV, JMP, PUSH, POP...
    Register,        // EAX, AX, DS, CS...
    Directive,       // .CODE, .DATA, PROC, ENDP, SEGMENT, ENDS, MACRO, ENDM...
    Operator,        // PTR, OFFSET, SEG, SIZEOF, NOT, AND, OR, SHL, SHR...
    SizeDirective,   // BYTE, WORD, DWORD, QWORD, FWORD, TBYTE, REAL4, REAL8...

    // Punctuation
    Colon,           // :
    Comma,           // ,
    LBracket,        // [
    RBracket,        // ]
    LParen,          // (
    RParen,          // )
    Plus,            // +
    Minus,           // -
    Mul,             // *
    Div,             // /
    Dot,             // .
    Equals,          // =

    // Special
    Comment,         // ; ...
    Newline,
    Eof,
}

// ─── Token Interface ────────────────────────────────────────────────────────

export interface Token {
    type: TokenType;
    text: string;
    offset: number;    // byte offset in source
    line: number;      // 0-based line number
    column: number;    // 0-based column
}

// ─── Lookup Tables ──────────────────────────────────────────────────────────
// These sets classify alphanumeric tokens during lexing.

const INSTRUCTIONS = new Set([
    // Data transfer
    'MOV', 'MOVZX', 'MOVSX', 'MOVS', 'MOVSB', 'MOVSW', 'MOVSD',
    'XCHG', 'LEA', 'LDS', 'LES', 'LFS', 'LGS', 'LSS',
    'PUSH', 'PUSHF', 'PUSHFD', 'PUSHA', 'PUSHAD',
    'POP', 'POPF', 'POPFD', 'POPA', 'POPAD',
    'BSWAP', 'CBW', 'CWDE', 'CWD', 'CDQ', 'CQO',
    'MOVBE', 'MOVNTI',
    // Arithmetic
    'ADD', 'ADC', 'SUB', 'SBB', 'MUL', 'IMUL', 'DIV', 'IDIV',
    'INC', 'DEC', 'NEG', 'CMP', 'DAA', 'DAS', 'AAA', 'AAS', 'AAM', 'AAD',
    // Logic
    'AND', 'OR', 'XOR', 'NOT', 'TEST',
    'SHL', 'SAL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR',
    'SHLD', 'SHRD',
    // String
    'CMPS', 'CMPSB', 'CMPSW', 'CMPSD',
    'SCAS', 'SCASB', 'SCASW', 'SCASD',
    'LODS', 'LODSB', 'LODSW', 'LODSD',
    'STOS', 'STOSB', 'STOSW', 'STOSD',
    'REP', 'REPE', 'REPZ', 'REPNE', 'REPNZ',
    // Bit manipulation
    'BT', 'BTS', 'BTR', 'BTC', 'BSF', 'BSR',
    'SETA', 'SETAE', 'SETB', 'SETBE', 'SETE', 'SETG', 'SETGE',
    'SETL', 'SETLE', 'SETNA', 'SETNAE', 'SETNB', 'SETNBE',
    'SETNE', 'SETNG', 'SETNGE', 'SETNL', 'SETNLE', 'SETNO',
    'SETNP', 'SETNS', 'SETNZ', 'SETO', 'SETPE', 'SETPO', 'SETS', 'SETZ',
    // Control flow
    'JMP', 'JE', 'JZ', 'JNE', 'JNZ', 'JA', 'JNBE', 'JAE', 'JNB',
    'JB', 'JNAE', 'JBE', 'JNA', 'JG', 'JNLE', 'JGE', 'JNL',
    'JL', 'JNGE', 'JLE', 'JNG', 'JS', 'JNS', 'JO', 'JNO',
    'JP', 'JPE', 'JNP', 'JPO', 'JCXZ', 'JECXZ', 'JRCXZ',
    'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ',
    'CALL', 'RET', 'RETF', 'IRET', 'IRETD', 'IRETQ',
    'INT', 'INTO', 'BOUND', 'ENTER', 'LEAVE',
    'SYSCALL', 'SYSENTER', 'SYSEXIT', 'SYSRET',
    // Flags
    'CLC', 'STC', 'CMC', 'CLD', 'STD', 'CLI', 'STI',
    'LAHF', 'SAHF', 'PUSHF', 'POPF',
    // Segment
    'LAR', 'LSL', 'VERR', 'VERW',
    // Misc
    'NOP', 'HLT', 'WAIT', 'FWAIT', 'LOCK', 'CPUID',
    'RDTSC', 'RDMSR', 'WRMSR', 'RDPMC',
    'XLAT', 'XLATB',
    'IN', 'OUT', 'INS', 'INSB', 'INSW', 'INSD',
    'OUTS', 'OUTSB', 'OUTSW', 'OUTSD',
    // FPU
    'FLD', 'FST', 'FSTP', 'FILD', 'FIST', 'FISTP',
    'FADD', 'FADDP', 'FIADD', 'FSUB', 'FSUBP', 'FISUB',
    'FSUBR', 'FSUBRP', 'FISUBR', 'FMUL', 'FMULP', 'FIMUL',
    'FDIV', 'FDIVP', 'FIDIV', 'FDIVR', 'FDIVRP', 'FIDIVR',
    'FCOM', 'FCOMP', 'FCOMPP', 'FICOM', 'FICOMP',
    'FTST', 'FXAM', 'FABS', 'FCHS', 'FSQRT', 'FPREM', 'FPREM1',
    'FRNDINT', 'FXTRACT', 'FSCALE', 'FSIN', 'FCOS', 'FSINCOS', 'FPTAN', 'FPATAN',
    'FLD1', 'FLDL2T', 'FLDL2E', 'FLDPI', 'FLDLG2', 'FLDLN2', 'FLDZ',
    'FINIT', 'FNINIT', 'FCLEX', 'FNCLEX', 'FSTCW', 'FNSTCW', 'FLDCW',
    'FSTSW', 'FNSTSW', 'FSTENV', 'FNSTENV', 'FLDENV',
    'FSAVE', 'FNSAVE', 'FRSTOR', 'FDECSTP', 'FINCSTP',
    'FFREE', 'FLDPI', 'FCMOVB', 'FCMOVBE', 'FCMOVE', 'FCMOVNB',
    'FCMOVNBE', 'FCMOVNE', 'FCMOVNU', 'FCMOVU',
    'FUCOM', 'FUCOMP', 'FUCOMPP', 'FCOMI', 'FCOMIP', 'FUCOMI', 'FUCOMIP',
    'FXCH', 'FNOP',
    // MMX
    'MOVD', 'MOVQ', 'PACKSSDW', 'PACKSSWB', 'PACKUSWB',
    'PADDB', 'PADDW', 'PADDD', 'PADDSB', 'PADDSW', 'PADDUSB', 'PADDUSW',
    'PAND', 'PANDN', 'POR', 'PXOR',
    'PCMPEQB', 'PCMPEQW', 'PCMPEQD', 'PCMPGTB', 'PCMPGTW', 'PCMPGTD',
    'PMULHW', 'PMULLW', 'PMADDWD',
    'PSLLW', 'PSLLD', 'PSLLQ', 'PSRLW', 'PSRLD', 'PSRLQ', 'PSRAW', 'PSRAD',
    'PSUBB', 'PSUBW', 'PSUBD', 'PSUBSB', 'PSUBSW', 'PSUBUSB', 'PSUBUSW',
    'PUNPCKHBW', 'PUNPCKHWD', 'PUNPCKHDQ', 'PUNPCKLBW', 'PUNPCKLWD', 'PUNPCKLDQ',
    'EMMS',
    // SSE
    'MOVAPS', 'MOVUPS', 'MOVHPS', 'MOVLPS', 'MOVHLPS', 'MOVLHPS',
    'MOVSS', 'MOVNTPS',
    'ADDPS', 'ADDSS', 'SUBPS', 'SUBSS', 'MULPS', 'MULSS', 'DIVPS', 'DIVSS',
    'SQRTPS', 'SQRTSS', 'MAXPS', 'MAXSS', 'MINPS', 'MINSS',
    'RCPPS', 'RCPSS', 'RSQRTPS', 'RSQRTSS',
    'ANDPS', 'ANDNPS', 'ORPS', 'XORPS',
    'CMPPS', 'CMPSS', 'COMISS', 'UCOMISS',
    'SHUFPS', 'UNPCKHPS', 'UNPCKLPS',
    'CVTPI2PS', 'CVTSI2SS', 'CVTPS2PI', 'CVTSS2SI', 'CVTTPS2PI', 'CVTTSS2SI',
    'PMAXUB', 'PMINSW', 'PMAXSW', 'PMINUB',
    'PAVGB', 'PAVGW', 'PSADBW',
    'PEXTRW', 'PINSRW', 'PMOVMSKB',
    'MASKMOVQ', 'MOVNTQ', 'MOVNTPS',
    'LDMXCSR', 'STMXCSR',
    'PREFETCHT0', 'PREFETCHT1', 'PREFETCHT2', 'PREFETCHNTA', 'SFENCE',
    // SSE2
    'MOVDQA', 'MOVDQU', 'MOVDQ2Q', 'MOVQ2DQ',
    'MOVAPD', 'MOVUPD', 'MOVHPD', 'MOVLPD', 'MOVNTPD', 'MOVNTDQ', 'MOVNTI',
    'ADDPD', 'ADDSD', 'SUBPD', 'SUBSD', 'MULPD', 'MULSD', 'DIVPD', 'DIVSD',
    'SQRTPD', 'SQRTSD', 'MAXPD', 'MAXSD', 'MINPD', 'MINSD',
    'ANDPD', 'ANDNPD', 'ORPD', 'XORPD',
    'CMPPD', 'CMPSD', 'COMISD', 'UCOMISD',
    'SHUFPD', 'UNPCKHPD', 'UNPCKLPD',
    'CVTPI2PD', 'CVTSI2SD', 'CVTPD2PI', 'CVTSD2SI', 'CVTTPD2PI', 'CVTTSD2SI',
    'CVTPS2PD', 'CVTPD2PS', 'CVTSS2SD', 'CVTSD2SS',
    'CVTDQ2PS', 'CVTPS2DQ', 'CVTTPS2DQ',
    'CVTDQ2PD', 'CVTPD2DQ', 'CVTTPD2DQ',
    'PADDQ', 'PSUBQ', 'PMULUDQ',
    'PSLLDQ', 'PSRLDQ',
    'PUNPCKHQDQ', 'PUNPCKLQDQ',
    'CLFLUSH', 'LFENCE', 'MFENCE', 'PAUSE',
    // SSE3
    'ADDSUBPS', 'ADDSUBPD', 'HADDPS', 'HADDPD', 'HSUBPS', 'HSUBPD',
    'LDDQU', 'MOVSHDUP', 'MOVSLDUP', 'MOVDDUP',
    'FISTTP', 'MONITOR', 'MWAIT',
]);

const REGISTERS = new Set([
    // 8-bit general
    'AL', 'AH', 'BL', 'BH', 'CL', 'CH', 'DL', 'DH',
    'SPL', 'BPL', 'SIL', 'DIL',
    'R8B', 'R9B', 'R10B', 'R11B', 'R12B', 'R13B', 'R14B', 'R15B',
    // 16-bit general
    'AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP',
    'R8W', 'R9W', 'R10W', 'R11W', 'R12W', 'R13W', 'R14W', 'R15W',
    // 32-bit general
    'EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP', 'EIP',
    'R8D', 'R9D', 'R10D', 'R11D', 'R12D', 'R13D', 'R14D', 'R15D',
    // 64-bit general
    'RAX', 'RBX', 'RCX', 'RDX', 'RSI', 'RDI', 'RBP', 'RSP', 'RIP',
    'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15',
    // Segment
    'CS', 'DS', 'ES', 'FS', 'GS', 'SS',
    // Control
    'CR0', 'CR1', 'CR2', 'CR3', 'CR4', 'CR8',
    // Debug
    'DR0', 'DR1', 'DR2', 'DR3', 'DR4', 'DR5', 'DR6', 'DR7',
    // FPU
    'ST', 'ST(0)', 'ST(1)', 'ST(2)', 'ST(3)', 'ST(4)', 'ST(5)', 'ST(6)', 'ST(7)',
    // MMX
    'MM0', 'MM1', 'MM2', 'MM3', 'MM4', 'MM5', 'MM6', 'MM7',
    // SSE/AVX
    'XMM0', 'XMM1', 'XMM2', 'XMM3', 'XMM4', 'XMM5', 'XMM6', 'XMM7',
    'XMM8', 'XMM9', 'XMM10', 'XMM11', 'XMM12', 'XMM13', 'XMM14', 'XMM15',
    'YMM0', 'YMM1', 'YMM2', 'YMM3', 'YMM4', 'YMM5', 'YMM6', 'YMM7',
    'YMM8', 'YMM9', 'YMM10', 'YMM11', 'YMM12', 'YMM13', 'YMM14', 'YMM15',
    // System
    'GDTR', 'IDTR', 'LDTR', 'TR',
    'MSR', 'TSC',
]);

const DIRECTIVES = new Set([
    // Simplified segment
    '.CODE', '.DATA', '.DATA?', '.CONST', '.STACK', '.FARDATA', '.FARDATA?',
    '.MODEL', '.STARTUP', '.EXIT', '.DOSSEG',
    // Segment
    'SEGMENT', 'ENDS', 'GROUP', 'ASSUME', 'END',
    // Procedures
    'PROC', 'ENDP', 'PROTO', 'INVOKE',
    // Macros
    'MACRO', 'ENDM', 'LOCAL', 'EXITM', 'GOTO', 'PURGE',
    // Conditional assembly
    'IF', 'IFE', 'IFDEF', 'IFNDEF', 'IFB', 'IFNB', 'IFIDN', 'IFIDNI',
    'IFDIF', 'IFDIFI', 'ELSE', 'ELSEIF', 'ELSEIF2', 'ENDIF', 'IF2',
    // Repeat blocks
    'REPEAT', 'REPT', 'WHILE', 'FOR', 'FORC', 'IRP', 'IRPC',
    // Conditional control flow
    '.IF', '.ELSE', '.ELSEIF', '.ENDIF', '.WHILE', '.ENDW',
    '.REPEAT', '.UNTIL', '.UNTILCXZ', '.BREAK', '.CONTINUE',
    // Conditional error
    '.ERR', '.ERR2', '.ERRB', '.ERRNB', '.ERRDEF', '.ERRNDEF',
    '.ERRE', '.ERRNZ', '.ERRDIF', '.ERRDIFI', '.ERRIDN', '.ERRIDNI',
    // Data allocation
    'DB', 'DW', 'DD', 'DQ', 'DF', 'DT',
    'BYTE', 'SBYTE', 'WORD', 'SWORD', 'DWORD', 'SDWORD',
    'FWORD', 'QWORD', 'TBYTE', 'REAL4', 'REAL8', 'REAL10',
    'LABEL', 'ORG', 'ALIGN', 'EVEN',
    // Equates
    'EQU', 'TEXTEQU',
    // Scope
    'PUBLIC', 'PRIVATE', 'EXTERN', 'EXTERNDEF', 'COMM', 'INCLUDELIB',
    // Structures & records
    'STRUCT', 'STRUC', 'UNION', 'RECORD', 'TYPEDEF',
    // Processor
    '.8086', '.8087', '.186', '.286', '.286C', '.286P', '.287',
    '.386', '.386C', '.386P', '.387', '.486', '.486P',
    '.586', '.586P', '.686', '.686P', '.K3D', '.MMX', '.XMM',
    // Listing control
    '.CREF', '.NOCREF', '.LIST', '.NOLIST', '.LISTALL', '.LISTIF',
    '.NOLISTIF', '.LISTMACRO', '.NOLISTMACRO', '.LISTMACROALL',
    'PAGE', 'SUBTITLE', 'TITLE', '.TFCOND', '.SFCOND', '.LFCOND', '.XALL', '.XREF',
    // Miscellaneous
    'COMMENT', 'ECHO', 'INCLUDE', '.RADIX', '.SAFESEH',
    '.FPO', 'OPTION', 'PUSHCONTEXT', 'POPCONTEXT', 'ALIAS',
    'MMWORD', 'XMMWORD', 'YMMWORD',
    // String operations
    'CATSTR', 'SUBSTR', 'INSTR', 'SIZESTR',
    // x64 specific
    '.ALLOCSTACK', '.ENDPROLOG', '.PUSHFRAME', '.PUSHREG',
    '.SAVEREG', '.SAVEXMM128', '.SETFRAME',
    // TASM specific
    'IDEAL', 'MASM', 'JUMPS', 'NOSMART', 'SMART', 'READONLY', 'NOJUMPS',
    'P386', 'P386N', 'P387', 'P8086', 'P8087', 'P186', 'P286', 'P286N', 'P287',
    'CODESEG', 'DATASEG', 'STACKSEG', 'CONST', 'FARDATA', 'UDATASEG',
    'UCODESEG', 'UFARDATA',
    'LABEL', 'GLOBAL', 'LOCAL',
    'ARG',
    'IMPLEMENTS',
]);

const OPERATORS = new Set([
    'PTR', 'OFFSET', 'SEG', 'THIS', 'TYPE', 'SIZEOF', 'LENGTHOF',
    'HIGH', 'LOW', 'HIGHWORD', 'LOW32', 'HIGH32',
    'NOT', 'AND', 'OR', 'XOR', 'MOD', 'SHL', 'SHR',
    'DUP', 'EQ', 'NE', 'LT', 'LE', 'GT', 'GE',
    'LROFFSET', 'IMAGEREL', 'SECTIONREL', 'OPATTR',
    'MASK', 'WIDTH', 'SHORT', '.TYPE',
    'ABS', 'ADDR', 'REP',
]);

const SIZE_DIRECTIVES = new Set([
    'BYTE', 'SBYTE', 'WORD', 'SWORD', 'DWORD', 'SDWORD',
    'FWORD', 'QWORD', 'TBYTE', 'REAL4', 'REAL8', 'REAL10',
    'MMWORD', 'XMMWORD', 'YMMWORD',
]);

// ─── Classification Function ────────────────────────────────────────────────

/**
 * Classify an alphanumeric token by looking it up in the keyword tables.
 * Comparison is case-insensitive (MASM/TASM are case-insensitive).
 */
export function classifyWord(word: string): TokenType {
    const upper = word.toUpperCase();
    if (INSTRUCTIONS.has(upper)) { return TokenType.Instruction; }
    if (REGISTERS.has(upper)) { return TokenType.Register; }
    if (DIRECTIVES.has(upper)) { return TokenType.Directive; }
    if (OPERATORS.has(upper)) { return TokenType.Operator; }
    if (SIZE_DIRECTIVES.has(upper)) { return TokenType.SizeDirective; }
    return TokenType.Identifier;
}

// ─── Directive Groups (for formatter and analysis) ──────────────────────────

/** Directives that start a block (opening) */
export const BLOCK_OPENERS = new Set([
    'MACRO', 'SEGMENT', 'PROC', 'STRUCT', 'STRUC', 'UNION', 'RECORD',
]);

/** Directives that end a block (closing) */
export const BLOCK_CLOSERS = new Set([
    'ENDM', 'ENDS', 'ENDP',
]);

/** Directives that define a simplified segment */
export const SIMPLIFIED_SEGMENTS = new Set([
    '.CODE', '.DATA', '.DATA?', '.CONST', '.STACK', '.FARDATA', '.FARDATA?',
]);

/** Data allocation directives */
export const DATA_DIRECTIVES = new Set([
    'DB', 'DW', 'DD', 'DQ', 'DF', 'DT',
]);

/** Equate directives */
export const EQUATE_DIRECTIVES = new Set([
    'EQU', 'TEXTEQU',
]);

/** Directives that declare external/public symbols */
export const SCOPE_DIRECTIVES = new Set([
    'PUBLIC', 'EXTERN', 'EXTERNDEF', 'COMM',
]);
