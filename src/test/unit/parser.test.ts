import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { tokenize } from '../../language2/lexer';
import { Parser } from '../../language2/parser';
import {
    AstNode, ProgramNode, SegmentNode, ProcNode, MacroNode,
    LabelNode, InstructionNode, VariableNode, DirectiveNode,
} from '../../language2/nodes';

const SAMPLES_DIR = path.resolve(__dirname, '..', '..', '..', 'samples');

function parseSample(relPath: string): ProgramNode {
    const src = fs.readFileSync(path.join(SAMPLES_DIR, relPath), 'utf-8');
    const tokens = tokenize(src);
    return new Parser(tokens).parse();
}

/** Find direct children matching a predicate. */
function findChildren<T extends AstNode>(
    parent: { children: AstNode[] },
    kind: T['kind'],
): T[] {
    return parent.children.filter((c): c is T => c.kind === kind);
}

/** Find one direct child by kind, or fail. */
function findOne<T extends AstNode>(
    parent: { children: AstNode[] },
    kind: T['kind'],
): T {
    const matches = findChildren<T>(parent, kind);
    assert.ok(matches.length > 0, `Expected a ${kind} node but found none`);
    return matches[0];
}

/** Find one direct child by kind and name, or fail. */
function findOneNamed<T extends AstNode & { name: string }>(
    parent: { children: AstNode[] },
    kind: T['kind'],
    name: string,
): T {
    const matches = findChildren<T>(parent, kind).filter(n => n.name.toUpperCase() === name.toUpperCase());
    assert.ok(matches.length > 0, `Expected ${kind} "${name}" but found none`);
    return matches[0];
}

suite('Parser: sample files', () => {

    // ─── samples/1.asm (TASM style) ──────────────────────────────────

    suite('samples/1.asm — TASM hello world', () => {
        let ast: ProgramNode;

        setup(() => {
            ast = parseSample('1.asm');
        });

        test('root is a program node', () => {
            assert.strictEqual(ast.kind, 'program');
            assert.ok(ast.children.length > 0);
        });

        test('has a .386 directive', () => {
            const dir = findChildren<DirectiveNode>(ast, 'directive')
                .find(d => d.name === '.386');
            assert.ok(dir, 'Expected a .386 directive');
        });

        test('has DATA segment with MESG variable', () => {
            const data = findOneNamed<SegmentNode>(ast, 'segment', 'DATA');
            const vars = findChildren<VariableNode>(data, 'variable');
            assert.strictEqual(vars.length, 1);
            assert.strictEqual(vars[0].name, 'MESG');
            assert.strictEqual(vars[0].dataType, 'DB');
        });

        test('has CODE segment with instructions and labels', () => {
            const code = findOneNamed<SegmentNode>(ast, 'segment', 'CODE');
            const labels = findChildren<LabelNode>(code, 'label');
            const instrs = findChildren<InstructionNode>(code, 'instruction');

            assert.ok(labels.length >= 2, 'Expected at least BEG and LAST labels');
            const labelNames = labels.map(l => l.name.toUpperCase());
            assert.ok(labelNames.includes('BEG'), 'Expected BEG label');
            assert.ok(labelNames.includes('LAST'), 'Expected LAST label');

            assert.ok(instrs.length >= 8, 'Expected at least 8 instructions');
            const mnemonics = instrs.map(i => i.mnemonic.toUpperCase());
            assert.ok(mnemonics.includes('MOV'), 'Expected MOV instruction');
            assert.ok(mnemonics.includes('INT'), 'Expected INT instruction');
            assert.ok(mnemonics.includes('LOOP'), 'Expected LOOP instruction');
        });

        test('CODE segment has 12 children', () => {
            const code = findOneNamed<SegmentNode>(ast, 'segment', 'CODE');
            assert.strictEqual(code.children.length, 12);
        });
    });

    // ─── samples/3中文路径hasError.asm (Chinese path test) ────────────────────────────────

    suite('samples with Chinese path — same structure, LOP instead of LOOP', () => {
        let ast: ProgramNode;

        setup(() => {
            ast = parseSample('3中文路径hasError.asm');
        });

        test('parses successfully (parser is permissive)', () => {
            assert.strictEqual(ast.kind, 'program');
            assert.ok(ast.children.length > 0);
        });

        test('same top-level structure as 1.asm', () => {
            const directives = findChildren<DirectiveNode>(ast, 'directive');
            const segments = findChildren<SegmentNode>(ast, 'segment');
            assert.ok(directives.length >= 1, 'Expected at least 1 directive');
            assert.strictEqual(segments.length, 2, 'Expected DATA and CODE segments');
        });

        test('LOP is parsed as an instruction (parser does not validate mnemonics)', () => {
            const code = findOneNamed<SegmentNode>(ast, 'segment', 'CODE');
            const instrs = findChildren<InstructionNode>(code, 'instruction');
            const lop = instrs.find(i => i.mnemonic.toUpperCase() === 'LOP');
            assert.ok(lop, 'Expected LOP instruction node');
            assert.strictEqual(lop.operands.length, 1, 'LOP should have 1 operand');
        });
    });

    // ─── samples/multi/2.asm (MASM style) ────────────────────────────

    suite('samples/multi/2.asm — MASM with include and proc', () => {
        let ast: ProgramNode;

        setup(() => {
            ast = parseSample('multi/2.asm');
        });

        test('root is a program node', () => {
            assert.strictEqual(ast.kind, 'program');
            assert.ok(ast.children.length > 0);
        });

        test('include is parsed (as instruction with operand)', () => {
            // The lexer classifies "include" as Identifier, not Directive,
            // so the parser treats it as an instruction.
            const instrs = findChildren<InstructionNode>(ast, 'instruction');
            const inc = instrs.find(i => i.mnemonic.toLowerCase() === 'include');
            assert.ok(inc, 'Expected include statement');
            assert.strictEqual(inc.operands.length, 1, 'include should have 1 operand (the path)');
        });

        test('.model small parsed as instruction', () => {
            const instrs = findChildren<InstructionNode>(ast, 'instruction');
            const model = instrs.find(i => i.mnemonic === '.model');
            assert.ok(model, 'Expected .model instruction');
            assert.strictEqual(model.operands.length, 1);
        });

        test('.stack 64 parsed as instruction', () => {
            const instrs = findChildren<InstructionNode>(ast, 'instruction');
            const stack = instrs.find(i => i.mnemonic === '.stack');
            assert.ok(stack, 'Expected .stack instruction');
            assert.strictEqual(stack.operands.length, 1);
        });

        test('.data and .code parsed as labels', () => {
            const labels = findChildren<LabelNode>(ast, 'label');
            const names = labels.map(l => l.name);
            assert.ok(names.includes('.data'), 'Expected .data label');
            assert.ok(names.includes('.code'), 'Expected .code label');
        });

        test('has msg variable with DB', () => {
            const vars = findChildren<VariableNode>(ast, 'variable');
            const msg = vars.find(v => v.name === 'msg');
            assert.ok(msg, 'Expected msg variable');
            assert.strictEqual(msg.dataType, 'DB');
        });

        test('has main proc with far attribute', () => {
            const procs = findChildren<ProcNode>(ast, 'proc');
            assert.strictEqual(procs.length, 1);
            assert.strictEqual(procs[0].name, 'main');
            assert.strictEqual(procs[0].attributes, 'far');
        });

        test('main proc has 8 children', () => {
            const main = findOneNamed<ProcNode>(ast, 'proc', 'main');
            assert.strictEqual(main.children.length, 8);
        });
    });

    // ─── samples/multi/mac.inc ────────────────────────────────────────

    suite('samples/multi/mac.inc — macro definition', () => {
        let ast: ProgramNode;

        setup(() => {
            ast = parseSample('multi/mac.inc');
        });

        test('root is a program node', () => {
            assert.strictEqual(ast.kind, 'program');
        });

        test('has one child: macro mac', () => {
            assert.strictEqual(ast.children.length, 1);
            const mac = findOne<MacroNode>(ast, 'macro');
            assert.strictEqual(mac.name, 'mac');
        });

        test('macro has parameter "par"', () => {
            const mac = findOne<MacroNode>(ast, 'macro');
            assert.deepStrictEqual(mac.parameters, ['par']);
        });

        test('macro body is empty', () => {
            const mac = findOne<MacroNode>(ast, 'macro');
            assert.strictEqual(mac.children.length, 0);
        });
    });

    // ─── samples/test.asm (MASM with PROC and labels) ────────────────

    suite('samples/test.asm — MASM with BinToAsc procedure', () => {
        let ast: ProgramNode;

        setup(() => {
            ast = parseSample('test.asm');
        });

        test('root is a program node', () => {
            assert.strictEqual(ast.kind, 'program');
            assert.ok(ast.children.length > 0);
        });

        test('has .model and .STACK directives as instructions', () => {
            const instrs = findChildren<InstructionNode>(ast, 'instruction');
            const model = instrs.find(i => i.mnemonic === '.model');
            const stack = instrs.find(i => i.mnemonic === '.STACK');
            assert.ok(model, 'Expected .model');
            assert.ok(stack, 'Expected .STACK');
        });

        test('has .data and .code as labels', () => {
            const labels = findChildren<LabelNode>(ast, 'label');
            const names = labels.map(l => l.name);
            assert.ok(names.includes('.data'), 'Expected .data');
            assert.ok(names.includes('.code'), 'Expected .code');
        });

        test('has message variable with DB and DUP', () => {
            const vars = findChildren<VariableNode>(ast, 'variable');
            const msg = vars.find(v => v.name === 'message');
            assert.ok(msg, 'Expected message variable');
            assert.strictEqual(msg.dataType, 'DB');
            assert.ok(msg.value.includes('dup'), 'Value should contain DUP');
        });

        test('has main label', () => {
            const labels = findChildren<LabelNode>(ast, 'label');
            const main = labels.find(l => l.name === 'main');
            assert.ok(main, 'Expected main label');
        });

        test('has BinToAsc proc', () => {
            const procs = findChildren<ProcNode>(ast, 'proc');
            assert.strictEqual(procs.length, 1);
            assert.strictEqual(procs[0].name, 'BinToAsc');
        });

        test('BinToAsc proc has 14 children', () => {
            const proc = findOneNamed<ProcNode>(ast, 'proc', 'BinToAsc');
            assert.strictEqual(proc.children.length, 14);
        });

        test('BinToAsc proc contains L1 and L2 labels', () => {
            const proc = findOneNamed<ProcNode>(ast, 'proc', 'BinToAsc');
            const labels = findChildren<LabelNode>(proc, 'label');
            const names = labels.map(l => l.name);
            assert.ok(names.includes('L1'), 'Expected L1 label');
            assert.ok(names.includes('L2'), 'Expected L2 label');
        });

        test('BinToAsc proc contains expected instructions', () => {
            const proc = findOneNamed<ProcNode>(ast, 'proc', 'BinToAsc');
            const instrs = findChildren<InstructionNode>(proc, 'instruction');
            const mnemonics = instrs.map(i => i.mnemonic.toLowerCase());
            assert.ok(mnemonics.includes('push'), 'Expected push');
            assert.ok(mnemonics.includes('pop'), 'Expected pop');
            assert.ok(mnemonics.includes('shl'), 'Expected shl');
            assert.ok(mnemonics.includes('loop'), 'Expected loop');
            assert.ok(mnemonics.includes('ret'), 'Expected ret');
        });
    });

    // ─── Edge cases ───────────────────────────────────────────────────

    suite('edge cases', () => {
        test('empty source produces empty program', () => {
            const tokens = tokenize('');
            const ast = new Parser(tokens).parse();
            assert.strictEqual(ast.kind, 'program');
            assert.strictEqual(ast.children.length, 0);
        });

        test('comment-only source produces empty program', () => {
            // Standalone comments are skipped by skipNewlinesAndComments()
            const tokens = tokenize('; just a comment\n; another');
            const ast = new Parser(tokens).parse();
            assert.strictEqual(ast.kind, 'program');
            assert.strictEqual(ast.children.length, 0);
        });

        test('single instruction', () => {
            const tokens = tokenize('MOV AX, BX');
            const ast = new Parser(tokens).parse();
            assert.strictEqual(ast.children.length, 1);
            const instr = ast.children[0] as InstructionNode;
            assert.strictEqual(instr.kind, 'instruction');
            assert.strictEqual(instr.mnemonic, 'MOV');
            assert.strictEqual(instr.operands.length, 2);
        });

        test('label with colon', () => {
            const tokens = tokenize('START:\nMOV AX, 1');
            const ast = new Parser(tokens).parse();
            const label = findOne<LabelNode>(ast, 'label');
            assert.strictEqual(label.name, 'START');
            assert.strictEqual(label.isNear, true);
        });

        test('variable definition', () => {
            const tokens = tokenize('BUF DB 100 DUP(?)');
            const ast = new Parser(tokens).parse();
            const v = findOne<VariableNode>(ast, 'variable');
            assert.strictEqual(v.name, 'BUF');
            assert.strictEqual(v.dataType, 'DB');
        });

        test('constant with EQU', () => {
            const tokens = tokenize('MAXLEN EQU 256');
            const ast = new Parser(tokens).parse();
            assert.strictEqual(ast.children.length, 1);
            assert.strictEqual(ast.children[0].kind, 'constant');
        });

        test('nested segment with proc', () => {
            const src = [
                'CODE SEGMENT',
                '  MAIN PROC',
                '    MOV AX, 1',
                '    RET',
                '  MAIN ENDP',
                'CODE ENDS',
            ].join('\n');
            const tokens = tokenize(src);
            const ast = new Parser(tokens).parse();
            const code = findOneNamed<SegmentNode>(ast, 'segment', 'CODE');
            const main = findOneNamed<ProcNode>(code, 'proc', 'MAIN');
            assert.strictEqual(main.children.length, 2); // MOV, RET
        });
    });
});

// ─── dos-assembly-codes corpus ───────────────────────────────────────────

const DOS_ASM_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'dos-assembly-codes');

function collectAsmFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) { return results; }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectAsmFiles(full));
        } else if (/\.(asm|ASM|inc|INC)$/.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

suite('Parser: dos-assembly-codes corpus', () => {
    const asmFiles = collectAsmFiles(DOS_ASM_DIR);

    test(`found ${asmFiles.length} ASM/INC files`, () => {
        assert.ok(asmFiles.length > 0, 'Expected at least 1 ASM file in dos-assembly-codes');
    });

    for (const filePath of asmFiles) {
        const relPath = path.relative(DOS_ASM_DIR, filePath);
        test(`parses: ${relPath}`, () => {
            const src = fs.readFileSync(filePath, 'utf-8');
            assert.doesNotThrow(() => {
                const tokens = tokenize(src);
                const ast = new Parser(tokens).parse();
                assert.strictEqual(ast.kind, 'program', 'Root must be ProgramNode');
            });
        });
    }
});
