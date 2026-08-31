/** The action type for running an assembly file */
export enum ActionType {
    open,
    run,
    debug,
}

/** The emulator for the 16-bit DOS environment */
export enum DosEmulatorType {
    dosbox = 'dosbox',
    dosboxX = 'dosbox-x',
    jsdos = 'jsdos',
    jsdosX = 'jsdos-x',
}

/** Conditional command override keyed by emulator */
export interface OverWrite {
    when: {
        emulator: DosEmulatorType;
    };
    before?: string[];
    open?: string[];
    run?: string[];
    debug?: string[];
    copyFileAs?: string | null;
}

/** The profile of a build action */
export interface ActionProfile {
    before?: string[];
    open?: string[];
    run: string[];
    debug: string[];
    copyFileAs?: string | null;
    support?: string[];
    ignore?: string[];
    overwrite?: OverWrite[];
}

export type Assembler = string;