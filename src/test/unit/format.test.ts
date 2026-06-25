import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { tokenize } from '../../language2/lexer';
import { Parser } from '../../language2/parser';
import { ProgramNode } from '../../language2/nodes';
import { formatSource, FormatOptions, DEFAULT_FORMAT_OPTIONS } from '../../language2/format';

const SAMPLES_DIR = path.resolve(__dirname, '..', '..', '..', 'samples');

function parse(src: string): ProgramNode {
    return new Parser(tokenize(src)).parse();
}

function format(src: string, opts?: Partial<FormatOptions>): string[] {
    const options = { ...DEFAULT_FORMAT_OPTIONS, ...opts };
    const lines = src.split(/\r?\n/);
    const ast = parse(src);
    return formatSource(lines, ast, options);
}

function formatSample(relPath: string, opts?: Partial<FormatOptions>): string[] {
    const src = fs.readFileSync(path.join(SAMPLES_DIR, relPath), 'utf-8');
    const options = { ...DEFAULT_FORMAT_OPTIONS, ...opts };
    const lines = src.split(/\r?\n/);
    const ast = parse(src);
    return formatSource(lines, ast, options);
}

suite('Formatter', () => {

    // ─── Basic label and instruction ───────────────────────────────────

    suite('label and instruction indentation', () => {
        test('label has no indent, instruction has one tab', () => {
            const src = 'START:\nMOV AX, BX';
            const result = format(src);
            assert.strictEqual(result[0], 'START:');
            assert.strictEqual(result[1], '\tMOV AX, BX');
        });

        test('label on same line as instruction splits into two lines', () => {
            const src = 'BEG: MOV AX, BX';
            const result = format(src);
            assert.strictEqual(result[0], 'BEG:');
            assert.ok(result[1].startsWith('\t'), 'instruction should be indented');
            assert.ok(result[1].includes('MOV'), 'instruction should contain MOV');
        });

        test('multiple labels and instructions', () => {
            const src = 'BEG:\nMOV AX, 1\nLAST:\nMOV BX, 2';
            const result = format(src);
            assert.strictEqual(result[0], 'BEG:');
            assert.ok(result[1].startsWith('\t'), 'instruction should be indented');
            assert.strictEqual(result[2], 'LAST:');
            assert.ok(result[3].startsWith('\t'), 'instruction should be indented');
        });
    });

    // ─── Operand alignment ────────────────────────────────────────────

    suite('operand alignment', () => {
        test('operands aligned to longest mnemonic', () => {
            const src = 'MOV AX, BX\nINT 21H';
            const result = format(src);
            // MOV (3) is longer than INT (3), so both get same pad
            assert.ok(result[0].includes('MOV'));
            assert.ok(result[1].includes('INT'));
            // Both operands should start at the same column
            const movOpCol = result[0].indexOf('AX');
            const intOpCol = result[1].indexOf('21H');
            assert.strictEqual(movOpCol, intOpCol, 'operands should be aligned');
        });

        test('longer mnemonic gets less padding', () => {
            const src = 'MOV AX, BX\nLOOP LAST';
            const result = format(src);
            // MOV (3) vs LOOP (4) — LOOP is longer
            const movOpCol = result[0].indexOf('AX');
            const loopOpCol = result[1].indexOf('LAST');
            assert.strictEqual(movOpCol, loopOpCol, 'operands should be aligned');
        });
    });

    // ─── Nested blocks ────────────────────────────────────────────────

    suite('nested blocks', () => {
        test('segment with labels and instructions', () => {
            const src = [
                'DATA SEGMENT',
                'BUF DB 100 DUP(?)',
                'DATA ENDS',
                'CODE SEGMENT',
                'BEG:',
                'MOV AX, 1',
                'CODE ENDS',
            ].join('\n');
            const result = format(src);

            // DATA segment opening: no indent
            assert.ok(result[0].startsWith('DATA'));
            // Variable inside segment: one tab
            assert.ok(result[1].startsWith('\t'));
            // CODE segment opening: no indent
            assert.ok(result[3].startsWith('CODE'));
            // Label inside segment: no indent
            assert.strictEqual(result[4].trim(), 'BEG:');
            // Instruction inside segment: one tab
            assert.ok(result[5].startsWith('\t'));
        });

        test('proc inside segment gets deeper indentation', () => {
            const src = [
                'CODE SEGMENT',
                'MAIN PROC',
                'MOV AX, 1',
                'RET',
                'MAIN ENDP',
                'CODE ENDS',
            ].join('\n');
            const result = format(src);

            // SEGMENT: no indent
            assert.ok(result[0].startsWith('CODE'));
            // PROC: one tab
            assert.ok(result[1].startsWith('\t'));
            // Instruction inside PROC: two tabs
            assert.ok(result[2].startsWith('\t\t'), `Expected double tab, got: ${JSON.stringify(result[2])}`);
            assert.ok(result[3].startsWith('\t\t'), `Expected double tab, got: ${JSON.stringify(result[3])}`);
            // ENDP: one tab
            assert.ok(result[4].startsWith('\t'));
            // ENDS: no indent
            assert.ok(result[5].startsWith('CODE'));
        });
    });

    // ─── Comment handling ─────────────────────────────────────────────

    suite('comments', () => {
        test('standalone comment preserved when followed by instruction', () => {
            const src = '; this is a comment\nMOV AX, 1';
            const result = format(src);
            // The parser skips standalone comments — only the instruction appears
            assert.ok(result.some(l => l.includes('MOV')));
        });

        test('inline comment preserved on instruction', () => {
            const src = 'MOV AX, BX ; load value';
            const result = format(src);
            assert.ok(result[0].includes('; load value'));
        });
    });

    // ─── Space after comma ────────────────────────────────────────────

    suite('comma spacing', () => {
        test('add space after comma', () => {
            const src = 'MOV AX,BX';
            const result = format(src, { spaceAfterComma: 'always' });
            assert.ok(result[0].includes('AX, BX'), `Got: ${result[0]}`);
        });

        test('remove space after comma', () => {
            const src = 'MOV AX, BX';
            const result = format(src, { spaceAfterComma: 'never' });
            assert.ok(result[0].includes('AX,BX'), `Got: ${result[0]}`);
        });
    });

    // ─── Tab vs spaces ────────────────────────────────────────────────

    suite('tab vs spaces', () => {
        test('use spaces when useTab is false', () => {
            const src = 'MOV AX, BX';
            const result = format(src, { useTab: false, tabSize: 4 });
            assert.ok(result[0].startsWith('    '), `Expected 4 spaces, got: ${JSON.stringify(result[0])}`);
        });
    });

    // ─── Sample files ─────────────────────────────────────────────────

    suite('sample files', () => {
        test('samples/1.asm — TASM: labels at col 0, instructions indented', () => {
            const result = formatSample('1.asm');
            const joined = result.join('\n');

            // .386 directive: no indent (top-level)
            assert.ok(joined.includes('.386'), 'Should contain .386');

            // DATA SEGMENT: no indent
            assert.ok(result.some(l => l.startsWith('DATA')), 'DATA should be at col 0');

            // MESG DB: indented (inside segment)
            const mesgLine = result.find(l => l.includes('MESG'));
            assert.ok(mesgLine, 'Should have MESG line');
            assert.ok(mesgLine!.startsWith('\t'), `MESG should be indented, got: ${JSON.stringify(mesgLine)}`);

            // BEG: label at col 0 (instruction split to next line)
            const begIdx = result.findIndex(l => l === 'BEG:');
            assert.ok(begIdx >= 0, 'Should have BEG label on its own line');
            assert.ok(result[begIdx + 1].startsWith('\t'), 'Line after BEG should be indented');

            // MOV instruction: indented
            const movLine = result.find(l => l.trim().startsWith('MOV'));
            assert.ok(movLine, 'Should have MOV instruction');
            assert.ok(movLine!.startsWith('\t'), `MOV should be indented, got: ${JSON.stringify(movLine)}`);

            // CODE ENDS: no indent
            assert.ok(result.some(l => l.startsWith('CODE ENDS')), 'CODE ENDS at col 0');
        });

        test('samples/test.asm — MASM with PROC: nested indentation', () => {
            const result = formatSample('test.asm');
            const joined = result.join('\n');

            // .model small: no indent (top-level)
            assert.ok(joined.includes('.model'), 'Should contain .model');

            // BinToAsc PROC: indented (inside .code)
            const procLine = result.find(l => l.includes('BinToAsc') && l.includes('PROC'));
            assert.ok(procLine, 'Should have BinToAsc PROC');
            assert.ok(procLine!.startsWith('\t'), `PROC should be indented, got: ${JSON.stringify(procLine)}`);

            // push cx inside PROC: double indented
            const pushLine = result.find(l => l.trim().startsWith('push'));
            assert.ok(pushLine, 'Should have push instruction');
            assert.ok(pushLine!.startsWith('\t\t'), `push inside PROC should be double indented, got: ${JSON.stringify(pushLine)}`);

            // L1 label inside PROC: no indent, instruction on next line
            const l1Idx = result.findIndex(l => l === 'L1:');
            assert.ok(l1Idx >= 0, 'Should have L1 label on its own line');
            assert.ok(result[l1Idx + 1].startsWith('\t'), 'Line after L1 should be indented');

            // BinToAsc ENDP: indented (inside .code)
            const endpLine = result.find(l => l.includes('ENDP'));
            assert.ok(endpLine, 'Should have ENDP');
            assert.ok(endpLine!.startsWith('\t'), `ENDP should be indented, got: ${JSON.stringify(endpLine)}`);
        });

        test('samples/multi/mac.inc — macro formatting', () => {
            const result = formatSample('multi/mac.inc');
            // MACRO should be present
            assert.ok(result.some(l => l.includes('MACRO')), 'Should have MACRO');
            // ENDM should be present
            assert.ok(result.some(l => l.includes('ENDM')), 'Should have ENDM');
        });
    });

    // ─── Edge cases ───────────────────────────────────────────────────

    suite('edge cases', () => {
        test('empty input', () => {
            const result = format('');
            assert.strictEqual(result.length, 0);
        });

        test('comment-only input produces no output (parser skips comments)', () => {
            const result = format('; just a comment');
            // Standalone comments are skipped by the parser — no AST nodes
            assert.strictEqual(result.length, 0);
        });

        test('preserves blank lines between statements', () => {
            const src = 'MOV AX, 1\n\nMOV BX, 2';
            const result = format(src);
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[1].trim(), '');
        });
    });
});
