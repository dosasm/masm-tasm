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
    /** Override for file copy control. Same semantics as `ActionProfile.copyFileAs` — the program parses mount commands from `before` to determine the final DOS location. */
    copyFileAs?: string | null;
}

/** The profile of a build action */
export interface ActionProfile {
    before?: string[];
    open?: string[];
    run: string[];
    debug: string[];
    /**
     * Controls whether the active file is copied before run/debug, and specifies its path under DOS.
     * The program parses mount commands from `before` to determine the final DOS location of this file.
     * Different emulators may behave differently at the underlying level, but the effect under DOS is similar.
     * - `undefined` (absent): Copy with default filename
     * - `null`: Do not copy; rely on mount commands to make the original file accessible
     * - string: Copy to this path; DOS path is determined by mount commands in `before`
     */
    copyFileAs?: string | null;
    support?: string[];
    ignore?: string[];
    overwrite?: OverWrite[];
}

export type Assembler = string;