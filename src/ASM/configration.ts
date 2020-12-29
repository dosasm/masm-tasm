import { OutputChannel, Uri, workspace } from 'vscode';
import { BOXCONFIG } from './DOSBox';
import { customToolCheck, ToolInfo } from './ToolInfo';
import { validfy } from './util';
import { PlayerConfig } from './viaPlayer';

const configuration = workspace.getConfiguration('masmtasm');

enum ASMTYPE {
    MASM = 'MASM',
    TASM = 'TASM'
}

enum DOSEMU {
    dosbox = 'dosbox',
    msdos = 'msdos player',
    auto = 'auto'
}

interface Config2 extends PlayerConfig, BOXCONFIG {
    DOSemu: DOSEMU;
};
/**
 * class for configurations
 */
export class Config implements Config2 {
    //basic settings
    public readonly savefirst: boolean;
    public readonly MASMorTASM: ASMTYPE;
    public readonly DOSemu: DOSEMU;
    //Uris and tools information
    public readonly workUri: Uri;
    public ASMtoolsUri: Uri;
    public BOXfolder: Uri;
    public Playerfolder: Uri;
    public customToolInfo: ToolInfo | undefined = undefined;
    //private
    private readonly _exturi: Uri;
    private readonly _BOXrun: string | undefined;
    constructor(extensionUri: Uri, channel?: OutputChannel) {

        let allowedEMU = [DOSEMU.dosbox];
        if (process.platform === 'win32') {
            allowedEMU.push(DOSEMU.auto, DOSEMU.msdos);
        }

        this.MASMorTASM = validfy(configuration.get('ASM.MASMorTASM'), [ASMTYPE.TASM, ASMTYPE.TASM]);
        this.DOSemu = validfy(configuration.get('ASM.emulator'), allowedEMU);
        this.savefirst = validfy(configuration.get('ASM.savefirst'), [true, false]);

        this._BOXrun = configuration.get('dosbox.run');
        this._exturi = extensionUri;
        //the tools' Uri
        let toolpath: string | undefined = configuration.get('ASM.toolspath');
        this.ASMtoolsUri = Uri.joinPath(extensionUri, './tools');
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
                    if (channel) { Config.printConfig(channel, this); }
                },
                (reason) => { console.log(reason); this.customToolInfo = undefined; }
            );
        } else if (channel) { Config.printConfig(channel, this); }
        // //write dosbox.conf
        // writeBoxconfig(this.dosboxconfuri);
    }
    /**
     * the command need to run in DOSBox after run the ASM code
     */
    public get boxruncmd(): string[] {
        let command: string[] = [];
        switch (this._BOXrun) {
            case "keep": break;
            case "exit": command.push('exit'); break;
            case "pause":
            default: command.push('pause', 'exit'); break;
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
    static printConfig(channel: OutputChannel, conf: Config) {
        let date = new Date();
        let output = `${date.toLocaleString()}
        workspace: ${conf.workUri.fsPath}
        use DOSBox from folder: ${conf.BOXfolder.fsPath}
        use MSdos - player from folder: ${conf.Playerfolder.fsPath}
        use assembler from folder: ${conf.ASMtoolsUri.fsPath}
        `;
        channel.append(output);
    }
}



