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

/** The profile of a build action */
export interface ActionProfile {
    baseBundle: string;
    before?: string[];
    run: string[];
    debug: string[];
    support?: string[];
}

export type Assembler = string;
