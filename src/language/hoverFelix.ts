import { Uri, workspace } from "vscode";

const fs = workspace.fs;

/**the information iterm for instructions */
interface InstructionsJSON {
    linkprefix: string;
    sections: string[];
    from: string;
    collection: [
        /**the code of section */
        number,
        /**the keyword name */
        string,
        /**the summary */
        string,
        /**link path of https://www.felixcloutier.com/x86/ */
        string,
    ][];
}

/**offer information of Intel x86 instructions
 * use data from `/resources/instruction-refernces`
 * which is generated from https://www.felixcloutier.com/x86/
 */
export class FELIX {

    static async create(fileuri: Uri): Promise<FELIX> {
        const arr = await fs.readFile(fileuri);
        const json = JSON.parse(arr.toString());
        return new FELIX(json);
    }

    constructor(private target: InstructionsJSON) {

    }

    public findKeyword(word: string): string | undefined {
        const items = this.target.collection.filter(
            val => val[1].toLowerCase() === word.toLowerCase()
        );
        if (items.length > 0) {
            const section = this.target.sections[items[0][0]];
            let md = `**${word}** ${section}\n\n`;
            md += items.map(
                val => `- [link](${this.target.linkprefix}${val[3]}) ${val[2]} `
            ).join('\n');
            return md;
        }
        return undefined;
    }
}