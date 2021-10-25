/**
 * manage commands run inside the DOS emulator
 */
import * as vscode from 'vscode';
import * as conf from '../utils/configuration';

type ACTIONS = {
    [id: string]: {
        baseBundle: string,
        before: string[],
        run: string[],
        debug: string[]
    }
};

export function baseBundle() {
    const actions: ACTIONS | undefined = vscode.workspace.getConfiguration('masmtasm').get('ASM.actions');
    if (actions === undefined) {
        throw new Error("configurate `masmtasm.ASM.actions` first");
    }
    const path = actions[conf.extConf.asmType]["baseBundle"];
    return path.replace('<built-in>/', "resources/");
}


