import { workspace, window, Uri, FileSystem, FileType, ExtensionContext } from 'vscode';
import { TextEncoder } from 'util';
interface ToolInfo {
    uri: Uri,
    hasBoxasm: boolean,
    hasPlayerasm: boolean
    hasDosbox: boolean,
    hasDosboxConf?: boolean,
    hasMasm: boolean,
    hasTasm: boolean,
}
export const inArrays = (data: [string, FileType][], arr: [string, FileType]) => {
    let ignoreCase = process.platform === "win32";
    if (ignoreCase) {
        return data.some(e => e[0].toLowerCase() === arr[0] && e[1] === arr[1]);
    }
    else {
        return data.some(e => e.every((o, i) => Object.is(arr[i], o)));
    }
};
async function customToolCheck(path: string): Promise<ToolInfo> {

    let uri: Uri = Uri.file(path);
    let fs = workspace.fs;
    let info: ToolInfo = {
        uri: uri,
        hasBoxasm: false,
        hasPlayerasm: false,
        hasDosbox: false,
        hasMasm: false,
        hasTasm: false
    };
    let dir1 = await fs.readDirectory(uri);
    console.log(inArrays(dir1, ["boxasm.bat", FileType.File]));
    if (inArrays(dir1, ["dosbox", FileType.Directory]) && process.platform === "win32") {
        let dir2 = await fs.readDirectory(Uri.joinPath(uri, './dosbox'));
        if (inArrays(dir2, ["dosbox.exe", FileType.File])) {
            info.hasDosbox = true;
        }
    }
    if (inArrays(dir1, ["player", FileType.Directory]) && process.platform === "win32") {
        let dir2 = await fs.readDirectory(Uri.joinPath(uri, './player'));
        if (inArrays(dir2, ["playerasm.bat", FileType.File])) {
            info.hasPlayerasm = true;
        }
    }
    info.hasBoxasm = inArrays(dir1, ["boxasm.bat", FileType.File]);
    info.hasMasm = inArrays(dir1, ["masm", FileType.Directory]);
    info.hasTasm = inArrays(dir1, ["tasm", FileType.Directory]);
    console.log(dir1, info);
    return info;
};
function writefile(Uri: Uri, Content: string) {
    let fs: FileSystem = workspace.fs;
    fs.writeFile(Uri, new TextEncoder().encode(Content));
}
/**
 * class for configurations
 */
export class Config {
    private readonly _toolspackaged: boolean = true;//如果打包时没有包含汇编工具（tools）改为false 废弃
    private readonly _exturi: Uri;
    private _BOXrun: string | undefined;
    private emulator: string | undefined;
    public toolsUri: Uri;
    public customToolInfo: ToolInfo | undefined = undefined;
    public readonly resolution: string | undefined;
    public readonly savefirst: boolean | undefined;
    public readonly MASMorTASM: string | undefined;
    public readonly _console: string | undefined;
    constructor(content: ExtensionContext) {
        let configuration = workspace.getConfiguration('masmtasm');
        this.MASMorTASM = configuration.get('ASM.MASMorTASM');
        this.emulator = configuration.get('ASM.emulator');
        this.savefirst = configuration.get('ASM.savefirst');
        this.resolution = configuration.get('dosbox.CustomResolution');
        this._BOXrun = configuration.get('dosbox.run');
        this._console = configuration.get("dosbox.console");
        this._exturi = content.extensionUri;
        //the tools' Uri
        let toolpath: string | undefined = configuration.get('ASM.toolspath');
        this.toolsUri = Uri.joinPath(content.extensionUri, './tools');
        if (toolpath) {
            customToolCheck(toolpath).then(
                (value) => { this.customToolInfo = value; },
                (reason) => { console.log(reason); this.customToolInfo = undefined; }
            );
        };

        //写dosbox配置信息
        this.writeBoxconfig(this);
    }
    public get OpenDosbox() {
        //command for open
        let boxUri = Uri.joinPath(this._exturi, './tools/dosbox/dosbox.exe');
        if (this.customToolInfo?.hasDosbox) { boxUri = Uri.joinPath(this.customToolInfo.uri, './dosbox/dosbox.exe'); }
        let command: string = "dosbox";
        if (process.platform === "win32") {
            let path = '"' + boxUri.fsPath + '"';
            switch (this._console) {
                case "min": command = 'start/min/wait "" ' + path; break;
                case "noconsole": command = path + ' -noconsole'; break;
                case "normal":
                default: command = path;
            }
        }
        return command;
    }
    /**
     * file path of scripts packaged inside
     */
    public get extScriptsUri(): Uri {
        let path = Uri.joinPath(this._exturi, './scripts');
        return path;
    }
    /**
     * file path of DOSBox configuration file `VSC-ExtUse.conf`
     */
    public get dosboxconfuri(): Uri {
        let uri = Uri.joinPath(this._exturi, './scripts/VSC-ExtUse.conf');
        return uri;
    }
    /**
     * file path of the separated space for DOSBox to use
     * which will be mounted as `D:` in dosbox
     */
    public get workUri(): Uri {
        return Uri.joinPath(this._exturi, './scripts/work/');
    }
    /**
     * file path of the compiler information in the dosbox mode
     */
    public get workloguri(): Uri {
        let uri = Uri.joinPath(this._exturi, './scripts/work/T.TXT');
        return uri;
    }
    /**
     * file path of the batch for msdos-player
     */
    public get msbatpath() {
        let path = Uri.joinPath(this._exturi, './scripts/playerasm.bat').fsPath;
        if (this.customToolInfo?.hasPlayerasm) {
            path = Uri.joinPath(this.customToolInfo.uri, './player/playerasm.bat').fsPath;
        }
        return path;
    }
    /**
     * folder path of the ASM toolset
     */
    public get path(): string {
        let path = this.toolsUri.fsPath;
        return path;
    }
    /**
     * the command need to run in DOSBox after run the ASM code
     */
    public get boxruncmd(): string {
        let command: string = ' ';
        switch (this._BOXrun) {
            case "keep": command = ' '; break;
            case "exit": command = '\n exit'; break;
            case "pause":
            default: command = '\n pause \n exit'; break;
        }
        return command;
    }
    /**
     * the param need to use with batch in DOSBox after run the ASM code
     */
    public get boxrunbat(): string {
        let param: string = ' ';
        switch (this._BOXrun) {
            case "keep": param = 'k'; break;
            case "exit": param = 'e'; break;
            case "pause":
            default: param = 'p'; break;
        }
        return param;
    }
    /**
     * the command to send to dosbox command to operate ASM codes
     * @param runOrDebug true to run code, false to debug
     */
    public boxasmCommand(runOrDebug: boolean): string {

        let str = "c:\\boxasm.bat " + this.MASMorTASM;
        if (runOrDebug) {
            let param: string = ' ';
            switch (this._BOXrun) {
                case "keep": param = 'k'; break;
                case "exit": param = 'e'; break;
                case "pause":
                default: param = 'p'; break;
            }
            str += " run " + param;
        }
        else {
            str += " debug ";
        }
        return str;
    }
    /**
     * file path of the dosbox program which will be sent to terminal
     */
    public get DOSemu(): string {
        let dosemu = ' ';
        if (this.emulator) { dosemu = this.emulator; }
        if (process.platform !== 'win32') { dosemu = 'dosbox'; }//在linux下无法使用msdos只使用dosbox
        return dosemu;
    }
    /**
     * write the DOSBox configuration file
     * @param conf 
     * @param autoExec 
     */
    private writeBoxconfig(conf: Config, autoExec?: string) {
        let configUri = conf.dosboxconfuri;
        let configContent = `[sdl]
windowresolution=${conf.resolution}
output=opengl
`;
        if (autoExec) { configContent = configContent + '\n' + autoExec; }
        writefile(configUri, configContent);
    }

}
