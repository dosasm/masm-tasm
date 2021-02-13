import { TextEncoder } from "util";
import { FileSystem, workspace, Uri } from "vscode";
const fs: FileSystem = workspace.fs;

function writefile(Uri: Uri, Content: string): Thenable<void> {

    return fs.writeFile(Uri, new TextEncoder().encode(Content));
}

class BOXCONF {
    config: { [id1: string]: { [id2: string]: string } };
    constructor(a: { [id: string]: string }) {
        const b: { [id1: string]: { [id2: string]: string } } = {};
        for (const key in a) {
            //console.log(key, a[key]);
            const [id1, id2] = key.split(".");
            if (b[id1]) {
                b[id1][id2] = a[key];
            }
            else {
                b[id1] = { [id2]: a[key] };
            }
        }
        this.config = b;
    }
    toFileString(): string {
        const b = this.config;
        let str = "";
        for (const id1 in b) {
            if (id1 === "AUTOEXEC") {
                str += "[AUTOEXEC]\n";
                const execstr = b[id1].undefined;
                str += execstr.replace(/\\n/g, '\n') + '\n';
            }
            else {
                str += `[${id1}]\n`;
                for (const id2 in b[id1]) {
                    str += `${id2}=${b[id1][id2]}\n`;
                }
            }
        }
        return str;
    }
}

/**configuration.get('dosbox.config')
 * write the DOSBox configuration file
 * @param autoExec the command autoexec
 */
export async function writeBoxconfig(configUri: Uri, config?: { [id: string]: string }, autoExec?: string): Promise<void> {
    if (config) {
        let content: string = new BOXCONF(config).toFileString();
        if (autoExec) { content = content + '\n[AUTOEXEC]\n' + autoExec; }
        await writefile(configUri, content);
    }
}


