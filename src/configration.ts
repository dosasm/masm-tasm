import { workspace, window, Uri, FileSystem } from 'vscode';
import { TextEncoder } from 'util'
/**
 * class for configurations
 */
export class Config {
    private _toolspackaged: boolean = true//如果打包时没有包含汇编工具（tools）改为false
    private _path: string | undefined
    private _BOXrun: string | undefined
    private _DOSemu: string | undefined
    private _exturi: Uri
    public readonly toolsUri: Uri
    public readonly resolution: string | undefined
    public readonly savefirst: boolean | undefined
    public readonly MASMorTASM: string | undefined
    public static writefile: any
    public readonly OpenDosbox: string;
    constructor(exturi: Uri) {
        this.resolution = workspace.getConfiguration('masmtasm.dosbox').get('CustomResolution');
        this.MASMorTASM = workspace.getConfiguration('masmtasm.ASM').get('MASMorTASM');
        this._DOSemu = workspace.getConfiguration('masmtasm.ASM').get('emulator');
        this.savefirst = workspace.getConfiguration('masmtasm.ASM').get('savefirst');
        this._BOXrun = workspace.getConfiguration('masmtasm.dosbox').get('run');
        this._path = workspace.getConfiguration('masmtasm.ASM').get('toolspath');
        this._exturi = exturi
        this.toolsUri = this._toolsUri()
        this.writeBoxconfig(this)
        if(process.platform=="win32"){
            let console=workspace.getConfiguration('masmtasm.dosbox').get('console');
            let boxpath= '"'+this.path + '\\dosbox\\dosbox.exe"'
            switch(console){
            case "min": this.OpenDosbox='start/min/wait "" ' + boxpath;break
            case "noconsole":this.OpenDosbox=boxpath+' -noconsole';break
            case "normal":
                default:this.OpenDosbox=boxpath
            }
        }
        else {
            this.OpenDosbox='dosbox'
        }
        
    }
    /**
     * file path of scripts packaged inside
     */
    public get batchpath(): string {
        let path = Uri.joinPath(this._exturi, './scripts').fsPath
        return path
    }
    /**
     * file path of DOSBox configuration file `VSC-ExtUse.conf`
     */
    public get dosboxconfuri(): Uri {
        let uri = Uri.joinPath(this._exturi, './scripts/VSC-ExtUse.conf')
        return uri
    }
    /**
     * file path of the separated space for DOSBox to use
     * which will be mounted as `D:` in dosbox
     */
    public get workpath(): string {
        let path = Uri.joinPath(this._exturi, './scripts/work').fsPath
        return path
    }
    /**
     * file path of the compiler information in the dosbox mode
     */
    public get workloguri(): Uri {
        let uri = Uri.joinPath(this._exturi, './scripts/work/T.TXT')
        return uri
    }
    /**
     * file path of the batch for msdos-player
     */
    public get msbatpath() {
        let path = Uri.joinPath(this._exturi, './scripts/playerasm.bat').fsPath
        return path
    }
    /**
     * folder path of the ASM toolset
     */
    public get path(): string {
        let path = this.toolsUri.fsPath
        return path
    }
    /**
     * the vscode Uri of the ASM toolset folder
     */
    private _toolsUri(): Uri {
        let uri: Uri
        if (this._path) {
            uri = Uri.file(this._path)//1.首先使用自定义的工具集
        }
        else if (this._toolspackaged) {
            uri = Uri.joinPath(this._exturi, './tools')//2.其次使用插件打包的工具集
        }
        else {
            window.showInformationMessage('未设置汇编工具路径请在设置中添加相关设置');
            throw new Error("no tools please add your tool in settings");
        }
        return uri
    }
    /**
     * the command need to run in DOSBox after run the ASM code
     */
    public get boxruncmd(): string {
        let command: string = ' '
        switch (this._BOXrun) {
            case "keep": command = ' '; break;
            case "exit after run": command = 'exit'; break;
            case "pause then exit after run": command = 'pause \n exit'; break
        }
        return command
    }
    /**
     * the param need to use with batch in DOSBox after run the ASM code
     */
    public get boxrunbat(): string {
        let param: string = ' '
        switch (this._BOXrun) {
            case "keep": param = 'k'; break;
            case "exit after run": param = 'e'; break;
            case "pause then exit after run": param = 'p'; break
        }
        return param
    }
    /**
     * file path of the dosbox program which will be sent to terminal
     */
    public get DOSemu(): string {
        let dosemu = ' '
        if (this._DOSemu) dosemu = this._DOSemu
        if (process.platform != 'win32') dosemu = 'dosbox'//在linux下无法使用msdos只使用dosbox
        return dosemu
    }
    /**
     * write the DOSBox configuration file
     * @param conf 
     * @param autoExec 
     */
    private writeBoxconfig(conf: Config, autoExec?: string) {
        let configUri = conf.dosboxconfuri
        let Pathadd = ' '
        let configContent = `[sdl]
windowresolution=${conf.resolution}
output=opengl
[autoexec]
mount c "${conf.path}"
mount d "${conf.workpath}"
mount x "${conf.batchpath}"
d:
set PATH=%PATH%;c:\\tasm;c:\\masm`;
        if (autoExec) configContent = configContent + '\n' + autoExec
        this.writefile(configUri, configContent)
    }
    public writefile(Uri: Uri, Content: string) {
        let fs: FileSystem = workspace.fs
        fs.writeFile(Uri, new TextEncoder().encode(Content))
    }
}