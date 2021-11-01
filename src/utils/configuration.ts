/**use MASM or TASM
 * - MASM: including masm.exe,link.exe,debug.exe
 * - TASM: including tasm.exe,tlink.exe,TD.exe
 */
export type Assembler = string;

type ACTION = {
    baseBundle: string,
    before?: string[],
    run: string[],
    debug: string[],
    support?: string[],
};
export type ACTIONS = {
    [id: string]: ACTION
};

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

export enum actionType {
    open,
    run,
    debug
}

import * as vscode from 'vscode';

class ExtensionConfiguration {
    public get _conf() {
        return vscode.workspace.getConfiguration('masmtasm');
    }

    public get actions(): ACTIONS {
        const actions: ACTIONS | undefined = this._conf.get("ASM.actions");
        if (actions === undefined) {
            throw new Error('`masmtasm.ASM.actions` is undefined');
        }
        return actions;
    }
    public get asmType(): Assembler {
        const asmType: Assembler | undefined = vscode.workspace.getConfiguration('masmtasm').get('ASM.assembler');
        if (asmType === undefined) {
            throw new Error('`masmtasm.ASM.assembler` is undefined');
        }
        if (Object.keys(this.actions).includes(asmType)) {
            return asmType;
        } else {
            if (asmType === 'MASM' && Object.keys(this.actions).includes('MASM-v6.11')) {
                return 'MASM-v6.11';
            }
            vscode.window.showErrorMessage(`${asmType} is not defined in "masmtasm.ASM.actions"`);
            throw new Error(`${asmType} is not defined in "masmtasm.ASM.actions"`);
        }
    }
    public get action(): ACTION {
        return this.actions[this.asmType];
    }

    public get emulator(): DosEmulatorType {
        const emu: DosEmulatorType | undefined = vscode.workspace.getConfiguration('masmtasm').get('ASM.emulator');
        return emu ? emu : DosEmulatorType.jsdos;
    }
}

export const extConf = new ExtensionConfiguration();