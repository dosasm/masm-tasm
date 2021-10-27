/**use MASM or TASM
 * - MASM: including masm.exe,link.exe,debug.exe
 * - TASM: including tasm.exe,tlink.exe,TD.exe
 */
export enum Assembler {
    MASM = 'MASM',
    TASM = 'TASM'
}

/**the emulator for the 16bit DOS environment
 * - `dosbox` is the most famous one
 * - `msdos`( player) is designed for running in windows cmd
 * - `jsdos` is designed for runing in browser
 * - `auto` is a mode to partly solve the problem of TD's hardly running in msdos
 */
export enum DosEmulatorType {
    dosbox = 'dosbox',
    dosboxX = 'dosbox-x',
    msdos = 'msdos player',
    jsdos = 'jsdos',
}

import * as vscode from 'vscode';

class ExtensionConfiguration {
    public get asmType(): Assembler {
        const asmType: Assembler | undefined = vscode.workspace.getConfiguration('masmtasm').get('ASM.assembler');
        return asmType ? asmType : Assembler.TASM;
    }
    public get emulator(): DosEmulatorType {
        const emu: DosEmulatorType | undefined = vscode.workspace.getConfiguration('masmtasm').get('ASM.emulator');
        return emu ? emu : DosEmulatorType.jsdos;
    }
}

export const extConf = new ExtensionConfiguration();