import { workspace, Uri, FileSystem, FileType, ExtensionContext, OutputChannel } from 'vscode';
import { TextEncoder } from 'util';
import { BoxConfig } from './DOSBox';
import { PlayerConfig } from './viaPlayer';
interface ToolInfo {
    uri: Uri,
    hasBoxasm: boolean,
    hasPlayerasm: boolean
    hasDosbox: boolean,
    hasPlayer: boolean,
    hasDosboxConf?: boolean,
    hasMasm: boolean,
    hasTasm: boolean,
}
export const inArrays = (data: [string, FileType][], arr: [string, FileType], ignoreCase?: boolean) => {
    let ignore: boolean = process.platform === "win32";
    if (ignoreCase) {
        ignore = ignoreCase;
    }
    if (ignore) {
        return data.some(e => e[0].toLowerCase() === arr[0].toLowerCase() && e[1] === arr[1]);
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
        hasPlayer: false,
        hasMasm: false,
        hasTasm: false
    };
    let dir1 = await fs.readDirectory(uri);
    //console.log(inArrays(dir1, ["boxasm.bat", FileType.File]));
    if (inArrays(dir1, ["dosbox", FileType.Directory]) && process.platform === "win32") {
        let dir2 = await fs.readDirectory(Uri.joinPath(uri, './dosbox'));
        if (inArrays(dir2, ["dosbox.exe", FileType.File])) {
            info.hasDosbox = true;
        }
    }
    info.hasPlayer = inArrays(dir1, ["player", FileType.Directory]);
    if (info.hasPlayer) {
        let dir2 = await fs.readDirectory(Uri.joinPath(uri, './player'));
        if (inArrays(dir2, ["playerasm.bat", FileType.File])) {
            info.hasPlayerasm = true;
        }
    }
    info.hasBoxasm = inArrays(dir1, ["boxasm.bat", FileType.File]);
    info.hasMasm = inArrays(dir1, ["masm", FileType.Directory]);
    info.hasTasm = inArrays(dir1, ["tasm", FileType.Directory]);
    //console.log(dir1, info);
    return info;
};
let configuration = workspace.getConfiguration('masmtasm');
function MASMorTASM(): 'MASM' | 'TASM' {
    let output: 'MASM' | 'TASM', cfg = configuration.get('ASM.MASMorTASM');
    if (cfg === 'MASM' || cfg === 'masm') { output = "MASM"; }
    else { output = "TASM"; }
    return output;
}
function emulator(): 'dosbox' | 'auto' | 'msdos player' {
    let output: 'dosbox' | 'auto' | 'msdos player';
    if (process.platform !== 'win32') { output = 'dosbox'; }//Currently, msdos player is not runnable in non-win OS
    else {
        let cfg = configuration.get('ASM.emulator');
        if (cfg === 'msdos player') { output = 'msdos player'; }
        else if (cfg === 'auto') { output = 'auto'; }
        else { output = 'dosbox'; }
    }
    return output;
}
function savefirst(): boolean {
    let output: boolean, cfg = configuration.get('ASM.savefirst');
    if (typeof (cfg) === 'boolean') { output = cfg; }
    else { output = true; };
    return output;
}
function writefile(Uri: Uri, Content: string) {
    let fs: FileSystem = workspace.fs;
    fs.writeFile(Uri, new TextEncoder().encode(Content));
}
/**
 * write the DOSBox configuration file
 * @param autoExec the command autoexec
 */
function writeBoxconfig(configUri: Uri, autoExec?: string) {
    let resolution = configuration.get('dosbox.CustomResolution');
    let configContent = `[sdl]
windowresolution=${resolution}
output=opengl
`;
    if (autoExec) { configContent = configContent + '\n[AUTOEXEC]\n' + autoExec; }
    writefile(configUri, configContent);
}
function OpenDosbox() {
    //command for open dosbox
    let command: string = "dosbox";
    //First, use the user-defined command;
    let customCommand = configuration.get("dosbox.command");
    let console = configuration.get("dosbox.console");
    if (customCommand) {
        return customCommand + " ";
    }
    //for windows,using different command according to dosbox's path and the choice of the console window
    if (process.platform === "win32") {
        let path = 'dosbox';
        switch (console) {
            case "min": command = 'start/min/wait "" ' + path; break;
            case "noconsole": command = path + ' -noconsole'; break;
            case "normal":
            default: command = path;
        }
    }
    //for darwin
    else if (process.platform === "darwin") {
        command = "open -a DOSBox --args ";
    }
    //for other system, temporarily use command `dosbox`
    return command;
}
function printConfig(channel: OutputChannel, conf: Config) {
    let date = new Date();
    let output =
        `
${date.toLocaleString()}
    workspace: ${conf.workUri.fsPath}
    use DOSBox from folder: ${conf.BOXfolder.fsPath}
    use MSdos-player from folder: ${conf.Playerfolder.fsPath} 
    use assembler from folder: ${conf.ASMtoolsUri.fsPath}
`;
    channel.append(output);
}
interface Config2 extends PlayerConfig, BoxConfig {
    DOSemu: 'dosbox' | 'auto' | 'msdos player'
};
/**
 * class for configurations
 */
export class Config implements Config2 {
    //basic settings
    public readonly savefirst: boolean;
    public readonly MASMorTASM: 'MASM' | 'TASM';
    public readonly DOSemu: 'dosbox' | 'auto' | 'msdos player';
    public readonly OpenDosbox: string;
    //Uris and tools information
    public readonly workUri: Uri;
    public ASMtoolsUri: Uri;
    public BOXfolder: Uri;
    public Playerfolder: Uri;
    public customToolInfo: ToolInfo | undefined = undefined;
    //private
    private readonly _exturi: Uri;
    private readonly _BOXrun: string | undefined;
    constructor(content: ExtensionContext, channel?: OutputChannel) {
        configuration = workspace.getConfiguration('masmtasm');
        this.MASMorTASM = MASMorTASM();
        this.DOSemu = emulator();
        this.savefirst = savefirst();
        this._BOXrun = configuration.get('dosbox.run');
        this.OpenDosbox = OpenDosbox();
        this._exturi = content.extensionUri;
        //the tools' Uri
        let toolpath: string | undefined = configuration.get('ASM.toolspath');
        this.ASMtoolsUri = Uri.joinPath(content.extensionUri, './tools');
        this.BOXfolder = Uri.joinPath(this._exturi, './tools/dosbox/');
        this.Playerfolder = Uri.joinPath(this._exturi, './tools/player/');
        this.workUri = Uri.joinPath(this._exturi, './workspace/');
        workspace.fs.createDirectory(this.workUri);
        if (toolpath) {
            customToolCheck(toolpath).then(
                (value) => {
                    this.customToolInfo = value;
                    if (value.hasMasm && value.hasTasm) { this.ASMtoolsUri = value.uri; }
                    if (value.hasDosbox) { this.BOXfolder = Uri.joinPath(value.uri, "./dosbox"); }
                    if (value.hasPlayer) {
                        this.Playerfolder = Uri.joinPath(this._exturi, './tools/player/');
                    }
                    if (channel) { printConfig(channel, this); }
                },
                (reason) => { console.log(reason); this.customToolInfo = undefined; }
            );
        } else if (channel) { printConfig(channel, this); }
        //write dosbox.conf
        writeBoxconfig(this.dosboxconfuri);
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
    public get extScriptsUri(): Uri {
        let path = Uri.joinPath(this._exturi, './resources');
        return path;
    }
    public get dosboxconfuri(): Uri {
        let uri = Uri.joinPath(this._exturi, './resources/VSC-ExtUse.conf');
        return uri;
    }
    public get workloguri(): Uri {
        let uri = Uri.joinPath(this._exturi, './resources/work/T.TXT');
        return uri;
    }
    public get playerbat() {
        let path = Uri.joinPath(this._exturi, './resources/playerasm.bat').fsPath;
        if (this.customToolInfo?.hasPlayerasm) {
            path = Uri.joinPath(this.customToolInfo.uri, './player/playerasm.bat').fsPath;
        }
        return path;
    }
}
