import * as assert from 'assert';
import * as vscode from 'vscode';
import { tasmDiagnose } from '../../diagnose/diagnoseTASM';
import { masmDiagnose } from '../../diagnose/diagnoseMASM';
import { AssemblerMessageDiagnose, Assembler } from '../../diagnose/main';
import { getInternetlink } from '../../diagnose/diagnoseMasm-error-list';

suite('Diagnose test', function () {

    async function createTestDoc(lines: number = 20): Promise<vscode.TextDocument> {
        return await vscode.workspace.openTextDocument({ content: '\n'.repeat(lines), language: 'assembly' });
    }

    test('TASM Error message', async function () {
        const doc = await createTestDoc(20);
        const collection = vscode.languages.createDiagnosticCollection('tasm-test-error');

        const message = 'Turbo Assembler  Version 4.1  Copyright (c) 1988, 1996 Borland International\r\n' +
            '\r\n' +
            'Assembling file:   test.asm\r\n' +
            '**Error** test.asm(14) Illegal instruction\r\n' +
            'Error messages:    1\r\n' +
            'Warning messages:  None\r\n' +
            'Passes:            1\r\n' +
            'Remaining memory:  468k\r\n' +
            '\r\n' +
            'Turbo Link  Version 7.1.30.1. Copyright (c) 1987, 1996 Borland International\r\n' +
            "Fatal: Unable to open file 'test.obj'\r\n" +
            'Illegal command: test.\r\n';

        const result = tasmDiagnose(message, doc, collection);

        assert.strictEqual(result.error, 1, 'Should have 1 error');
        assert.strictEqual(result.warn, 0, 'Should have 0 warnings');
        assert.ok(result.diagnostics, 'Diagnostics should exist');
        assert.strictEqual(result.diagnostics!.length, 1, 'Should have 1 diagnostic');
        assert.strictEqual(result.diagnostics![0].source, 'TASM4.1');
        assert.strictEqual(result.diagnostics![0].severity, vscode.DiagnosticSeverity.Error);

        collection.dispose();
    });

    test('TASM Warning message', async function () {
        const doc = await createTestDoc(20);
        const collection = vscode.languages.createDiagnosticCollection('tasm-test-warning');

        const message = 'Turbo Assembler  Version 4.1  Copyright (c) 1988, 1996 Borland International\r\n' +
            '\r\n' +
            'Assembling file:   test.asm\r\n' +
            '**Warning** test.asm(5) Possible missing initialization\r\n' +
            'Error messages:    0\r\n' +
            'Warning messages:  1\r\n' +
            'Passes:            1\r\n' +
            'Remaining memory:  468k\r\n';

        const result = tasmDiagnose(message, doc, collection);

        assert.strictEqual(result.error, 0);
        assert.strictEqual(result.warn, 1);
        assert.strictEqual(result.diagnostics!.length, 1);
        assert.strictEqual(result.diagnostics![0].severity, vscode.DiagnosticSeverity.Warning);

        collection.dispose();
    });

    test('TASM Macro error message', async function () {
        // The document must contain macro definitions, otherwise lineMacro2DOC cannot find the macro location,
        // resulting in empty relatedInformation (the test expects macro errors to carry relatedInformation)
        const doc = await vscode.workspace.openTextDocument({
            content: 'myMacro macro\n' + '\n'.repeat(19),
            language: 'assembly'
        });
        const collection = vscode.languages.createDiagnosticCollection('tasm-test-macro');

        const message = 'Turbo Assembler  Version 4.1\r\n' +
            '**Error** test.asm(10) myMacro(2) Undefined symbol\r\n';

        const result = tasmDiagnose(message, doc, collection);

        assert.strictEqual(result.error, 1);
        assert.strictEqual(result.diagnostics!.length, 1);
        assert.ok(result.diagnostics![0].relatedInformation, 'Macro error should have relatedInformation');
        assert.ok(result.diagnostics![0].relatedInformation!.length > 0, 'Should have related information');

        collection.dispose();
    });

    test('TASM No error message', async function () {
        const doc = await createTestDoc(20);
        const collection = vscode.languages.createDiagnosticCollection('tasm-test-none');

        const message = 'Turbo Assembler  Version 4.1\r\n' +
            'Assembling file:   test.asm\r\n' +
            'Error messages:    0\r\n' +
            'Warning messages:  None\r\n';

        const result = tasmDiagnose(message, doc, collection);

        assert.strictEqual(result.error, 0);
        assert.strictEqual(result.warn, 0);
        assert.strictEqual(result.diagnostics!.length, 0);

        collection.dispose();
    });

    test('TASM Multiple errors', async function () {
        const doc = await createTestDoc(20);
        const collection = vscode.languages.createDiagnosticCollection('tasm-test-multi');

        const message = 'Turbo Assembler  Version 4.1\r\n' +
            '**Error** test.asm(3) First error\r\n' +
            '**Error** test.asm(7) Second error\r\n' +
            '**Warning** test.asm(10) A warning\r\n';

        const result = tasmDiagnose(message, doc, collection);

        assert.strictEqual(result.error, 2);
        assert.strictEqual(result.warn, 1);
        assert.strictEqual(result.diagnostics!.length, 3);

        collection.dispose();
    });

    test('MASM Error message', async function () {
        const doc = await createTestDoc(20);
        const collection = vscode.languages.createDiagnosticCollection('masm-test-error');

        const message = 'Microsoft (R) Macro Assembler Version 5.00\r\n' +
            'Copyright (C) Microsoft Corporation 1981-1997. All rights reserved.\r\n' +
            '\r\n' +
            'Assembling file: test.asm\r\n' +
            'T.ASM(5): error A2008: syntax error\r\n' +
            'T.ASM(10): fatal error A1000: cannot open file\r\n' +
            '\r\n' +
            'Microsoft (R) Overlay Linker  Version 3.60\r\n';

        const result = masmDiagnose(message, doc, collection);

        assert.strictEqual(result.error, 2);
        assert.strictEqual(result.warn, 0);
        assert.strictEqual(result.diagnostics!.length, 2);
        assert.strictEqual(result.diagnostics![0].source, 'MASM6.11');

        collection.dispose();
    });

    test('MASM Warning message', async function () {
        const doc = await createTestDoc(20);
        const collection = vscode.languages.createDiagnosticCollection('masm-test-warning');

        const message = 'Microsoft (R) Macro Assembler Version 5.00\r\n' +
            'T.ASM(3): warning A4004: non-standard assumption\r\n';

        const result = masmDiagnose(message, doc, collection);

        assert.strictEqual(result.error, 0);
        assert.strictEqual(result.warn, 1);
        assert.strictEqual(result.diagnostics!.length, 1);
        assert.strictEqual(result.diagnostics![0].severity, vscode.DiagnosticSeverity.Warning);

        collection.dispose();
    });

    test('AssemblerMessageDiagnose process TASM', async function () {
        const doc = await createTestDoc(20);
        const diag = new AssemblerMessageDiagnose();

        const message = 'Turbo Assembler  Version 4.1\r\n' +
            '**Error** test.asm(14) Illegal instruction\r\n';

        const result = diag.process(message, doc, Assembler.TASM);

        assert.ok(result);
        assert.strictEqual(result!.error, 1);
        assert.strictEqual(result!.warn, 0);
        assert.strictEqual(result!.diagnostics!.length, 1);
    });

    test('AssemblerMessageDiagnose process MASM', async function () {
        const doc = await createTestDoc(20);
        const diag = new AssemblerMessageDiagnose();

        const message = 'Microsoft (R) Macro Assembler Version 5.00\r\n' +
            'T.ASM(5): error A2008: syntax error\r\n';

        const result = diag.process(message, doc, Assembler.MASM);

        assert.ok(result);
        assert.strictEqual(result!.error, 1);
        assert.strictEqual(result!.warn, 0);
        assert.strictEqual(result!.diagnostics!.length, 1);
    });

    test('AssemblerMessageDiagnose clean', async function () {
        const doc = await createTestDoc(20);
        const diag = new AssemblerMessageDiagnose();

        const message = 'Turbo Assembler  Version 4.1\r\n' +
            '**Error** test.asm(14) Illegal instruction\r\n';

        diag.process(message, doc, Assembler.TASM);

        // Should not throw errors after cleanup
        assert.doesNotThrow(() => diag.clean());

        // Clean up diagnostics of a specified type
        assert.doesNotThrow(() => diag.clean(Assembler.TASM));
        assert.doesNotThrow(() => diag.clean(Assembler.MASM));
    });

    test('getInternetlink', function () {
        // Test known error codes
        assert.strictEqual(
            getInternetlink('A2008'),
            'https://docs.microsoft.com/en-us/cpp/assembler/masm/ml-nonfatal-error-a2008'
        );
        assert.strictEqual(
            getInternetlink('a1000'),
            'https://docs.microsoft.com/en-us/cpp/assembler/masm/ml-fatal-error-a1000'
        );
        assert.strictEqual(
            getInternetlink('A4004'),
            'https://docs.microsoft.com/en-us/cpp/assembler/masm/ml-warning-a4004'
        );

        // Test unknown error codes
        assert.strictEqual(getInternetlink('A9999'), undefined);
        assert.strictEqual(getInternetlink(''), undefined);
    });
});