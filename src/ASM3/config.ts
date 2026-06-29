import * as vscode from "vscode";
import { ActionProfile, Assembler, DosEmulatorType } from "./types";

function masmConfig() {
    return vscode.workspace.getConfiguration("masmtasm");
}

/** Get the configured emulator type */
export function getEmulator(): DosEmulatorType {
    return masmConfig().get<DosEmulatorType>("ASM.emulator", DosEmulatorType.jsdos);
}

/** Get the configured assembler type, with MASM → MASM-v6.11 fallback */
export function getAssembler(): Assembler {
    const raw = masmConfig().get<Assembler>("ASM.assembler", "TASM");
    const actions = getActions();
    if (Object.keys(actions).includes(raw)) {
        return raw;
    }
    if (raw === "MASM" && Object.keys(actions).includes("MASM-v6.11")) {
        return "MASM-v6.11";
    }
    vscode.window.showErrorMessage(
        `${raw} is not defined in "masmtasm.ASM.actions"`
    );
    throw new Error(`${raw} is not defined in "masmtasm.ASM.actions"`);
}

/** Get all action profiles */
export function getActions(): Record<string, ActionProfile> {
    const actions = masmConfig().get<Record<string, ActionProfile>>("ASM.actions");
    if (!actions) {
        throw new Error('`masmtasm.ASM.actions` is undefined');
    }
    return actions;
}

/** Get the action profile for the current assembler */
export function getAction(): ActionProfile {
    return getActions()[getAssembler()];
}

/** Get the base bundle path for the current assembler */
export function getBaseBundle(): string {
    return getAction().baseBundle;
}

/** Whether to save the file before running */
export function getSaveFirst(): boolean {
    return masmConfig().get<boolean>("ASM.savefirst", true);
}

/** What to do after program exits in DOSBox */
export function getDosboxRun(): string {
    return masmConfig().get<string>("dosbox.run", "choose");
}

/** Get DOSBox config overrides */
export function getDosboxConfig(emulator: DosEmulatorType): Record<string, string> | undefined {
    const key = emulator === DosEmulatorType.dosboxX ? "dosboxX.config" : "dosbox.config";
    return masmConfig().get<Record<string, string>>(key);
}
