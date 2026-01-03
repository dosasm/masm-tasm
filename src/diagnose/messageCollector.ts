import * as vscode from "vscode"
import {AssemblerMessageDiagnose} from "./main"
import { logger } from "../utils/logger";
import * as conf from '../utils/configuration';

export function messageCollector(): [(msg: string) => void, Promise<string>] {
    let allmsg = "";
    let resolve: ((value: string) => void) | undefined = undefined;
    return [
        (msg: string) => {
            allmsg += msg;
            let re = allmsg.match(/Microsoft \(R\) MASM Compatibility Driver([\s\S]*)Microsoft \(R\) Segmented Executable Linker/);
            if (re && re[1] && resolve) {
                resolve(re[1]);
                resolve = undefined;
            }
            re = allmsg.match(/Turbo Assembler  Version 4.1  Copyright \(c\) 1988, 1996 Borland International([\s\S]*)Turbo Link  Version 7\./);
            if (re && re[1] && resolve) {
                resolve(re[1]);
                resolve = undefined;
            }
            re = allmsg.match(/Microsoft \(R\) Macro Assembler Version 5.00([\s\S]*)Microsoft \(R\) Overlay Linker  Version 3.60/);
            if (re && re[1] && resolve) {
                resolve(re[1]);
                resolve = undefined;
            }
        }
        ,
        new Promise<string>(
            _resolve => resolve = _resolve
        )];
}

export async function messageDiagnose(message:string,doc:vscode.TextDocument,diag:AssemblerMessageDiagnose){
    const diagnose = diag.process(message, doc, conf.extConf.asmType);
    if (diagnose) {
        if (diagnose?.error > 0) {
            vscode.window.showErrorMessage(logger.localize("ASM.error"));
            logger.outputChannel.show();
        }
        logger.channel(
            logger.localize('diag.msg', diagnose.error.toString(), diagnose.warn.toString()),
            "\n\t" + message.replace(/\r/g, "").replace(/[\n]+/g, "\n\t")
        );
    }
    return {
        message,
        error: diagnose?.error,
        warn: diagnose?.warn
    };
}