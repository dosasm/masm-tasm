import { ExtensionContext } from "vscode";
import { ActionContext, AsmResult, ExecAction } from "../ASM/manager";
import { DosEmulatorType } from "../utils/configuration";


export class JSDosHost implements ExecAction{
    name: DosEmulatorType | DosEmulatorType[]=DosEmulatorType.jsdos;
    run(context: ExtensionContext, ctx: ActionContext): AsmResult | Thenable<AsmResult> {
        throw new Error("Method not implemented.");
    }
}