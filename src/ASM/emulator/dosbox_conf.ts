import { TextEncoder } from "util";
import { FileSystem, workspace, Uri } from "vscode";

function writefile(Uri: Uri, Content: string) {
    let fs: FileSystem = workspace.fs;
    fs.writeFile(Uri, new TextEncoder().encode(Content));
}

class BOXCONF {
    config: { [id1: string]: { [id2: string]: string } };
    constructor(a: any) {
        var b: { [id1: string]: { [id2: string]: string } } = {};
        for (let key in a) {
            //console.log(key, a[key]);
            let [id1, id2] = key.split(".");
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
        let b = this.config, str: string = "";
        for (let id1 in b) {
            if (id1 === "AUTOEXEC") {
                str += "[AUTOEXEC]\n";
                let execstr = b[id1].undefined;
                str += execstr.replace(/\\n/g, '\n') + '\n';
            }
            else {
                str += `[${id1}]\n`;
                for (let id2 in b[id1]) {
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
export function writeBoxconfig(configUri: Uri, config?: Object, autoExec?: string) {
    if (config) {
        let content: string = new BOXCONF(config).toFileString();
        if (autoExec) { content = content + '\n[AUTOEXEC]\n' + autoExec; }
        writefile(configUri, content);
    }
}


