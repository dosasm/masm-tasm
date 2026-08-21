import * as vscode from "vscode";
import { DosEmulatorType } from "./types";
import * as config from "./config";

const emuBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
const asmBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

const emu = [
    DosEmulatorType.jsdos,
    DosEmulatorType.jsdosX,
    DosEmulatorType.dosbox,
    DosEmulatorType.dosboxX,
];

function isBrowser(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(process as any).browser;
}

function getAvailableEmulators(): DosEmulatorType[] {
    if (isBrowser()) {
        return [DosEmulatorType.jsdos];
    }
    return emu;
}

function getCompatibleAssemblers(emu: DosEmulatorType): string[] {
    const actions = config.getActions();
    const result: string[] = [];
    for (const a of Object.keys(actions)) {
        if (actions[a].support && !actions[a].support?.includes(emu)) {
            continue;
        }
        result.push(a);
    }
    return result;
}

function showStatus() {
    const currentEmu = config.getEmulator();
    const currentAsm = config.getAssembler();

    emuBar.command = "masmtasm.selectEmulator";
    emuBar.text = `$(server) ${currentEmu}`;
    emuBar.tooltip = "Click to select DOS emulator";
    emuBar.show();

    asmBar.command = "masmtasm.selectAssembler";
    asmBar.text = `$(symbol-class) ${currentAsm}`;
    asmBar.tooltip = "Click to select assembler";
    asmBar.show();
}

function getEmulatorPath(emu: DosEmulatorType): string {
    const settings = vscode.workspace.getConfiguration("masm-tasm");
    if (emu === DosEmulatorType.dosbox) {
        return settings.get<string>("command.dosbox", "dosbox");
    }
    if (emu === DosEmulatorType.dosboxX) {
        return settings.get<string>("command.dosboxX", "dosbox-x -nopromptfolder");
    }
    return ""; // jsdos runs in-browser
}

async function selectEmulator() {
    const _conf = vscode.workspace.getConfiguration("masmtasm.ASM");
    const currentEmu = config.getEmulator();
    const currentAsm = config.getAssembler();
    const available = getAvailableEmulators();

    const items = available.map(e => {
        const path = getEmulatorPath(e);
        const desc = e === currentEmu ? "(current)" : "";
        return {
            label: e,
            description: desc,
            detail: path || undefined,
            picked: e === currentEmu,
        };
    });

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select DOS emulator",
    });

    if (selected && selected.label !== currentEmu) {
        const newEmu = selected.label as DosEmulatorType;
        const target = vscode.ConfigurationTarget.Global;

        // Check if current assembler is compatible with new emulator
        const compatibleAsms = getCompatibleAssemblers(newEmu);
        let newAsm = currentAsm;

        if (!compatibleAsms.includes(currentAsm)) {
            // Switch to first compatible assembler
            newAsm = compatibleAsms[0];
            await _conf.update("assembler", newAsm, target);
        }

        await _conf.update("emulator", newEmu, target);
        showStatus();
    }
}

async function selectAssembler() {
    const _conf = vscode.workspace.getConfiguration("masmtasm.ASM");
    const currentEmu = config.getEmulator();
    const currentAsm = config.getAssembler();
    const compatible = getCompatibleAssemblers(currentEmu);

    const items = compatible.map(a => ({
        label: a,
        description: a === currentAsm ? "(current)" : "",
        picked: a === currentAsm,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select assembler",
    });

    if (selected && selected.label !== currentAsm) {
        const target = vscode.ConfigurationTarget.Global;
        await _conf.update("assembler", selected.label, target);
        showStatus();
    }
}

export function activate(context: vscode.ExtensionContext): void {
    const emuDisp = vscode.commands.registerCommand("masmtasm.selectEmulator", selectEmulator);
    const asmDisp = vscode.commands.registerCommand("masmtasm.selectAssembler", selectAssembler);
    context.subscriptions.push(emuDisp, asmDisp);
    showStatus();
}
