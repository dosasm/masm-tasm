import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

// import * as myExtension from '../../extension';

suite('Diagnose test', () => {

    test('TASM Error message', () => {
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

    });
});

