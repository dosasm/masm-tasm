import { FileSystem, Uri, workspace, window,extensions} from 'vscode';
import { TextEncoder } from 'util';
export class Config {
    private readonly _fs: FileSystem;
    private _path: string=' ';
    private toolspackin:boolean=true;
    private _resolution: string | undefined;
    public ASM:string
    public LINK:string
    public DEBUG:string
    public MASMorTASM: string | undefined;
    public BOXrun: string|undefined;
    public DOSemu: string|undefined;
    public savefirst: boolean|undefined;
    constructor() {
        this._fs = workspace.fs;
        this._resolution = workspace.getConfiguration('masmtasm.dosbox').get('CustomResolution');
        this.MASMorTASM= workspace.getConfiguration('masmtasm.ASM').get('MASMorTASM');
        this.DOSemu= workspace.getConfiguration('masmtasm.emu').get('emulator');
        this.savefirst= workspace.getConfiguration('masmtasm.emu').get('savefirst');
        let confboxrun=workspace.getConfiguration('masmtasm.dosbox').get('run');
        let configtoolpath:string|undefined=workspace.getConfiguration('masmtasm.ASM').get('toolspath');
            switch(confboxrun){
                case "keep":this.BOXrun=' ';break;
                case "exit after run":this.BOXrun=' exit ';break;
                case "pause then exit after run":this.BOXrun='pause \n exit';break;
            }
            if (configtoolpath){
                this._path=configtoolpath.toString().replace(/\\/g, '/');}
                else if (this.toolspackin)
                {
                }
                else {
                window.showInformationMessage('未设置汇编工具路径请在设置中添加相关设置');
                throw new Error("no tools please add your tool in settings");
            }
            if (this.MASMorTASM=='MASM'){
                this.ASM='MASM T.ASM;'
                this.LINK='LINK T.OBJ;'
                this.DEBUG='DEBUG T.EXE'
                }
                else{
                this.ASM='TASM /zi T.ASM'
                this.LINK='TLINK /v/3 T.OBJ;'
                this.DEBUG='if exist c:\\tasm\\TDC2.TD copy c:\\tasm\\TDC2.TD TDCONFIG.TD \nTD T.EXE'
            }
    }
    public writeConfig(autoExec: string,bothtool:boolean) {
        let configUri:Uri = Uri.parse('file:///' + this._path + '/dosbox/VSC-ExtUse.conf');
        let Pathadd=this.MASMorTASM
        if (bothtool==true){Pathadd='tasm;c:\\masm'}
        const configContent = `[sdl]
windowresolution=${this._resolution}
output=opengl
[autoexec]
mount c ${this._path}
mount d ${this._path}\\work
set PATH=c:\\${Pathadd}
d:
${autoExec}`;
        this._fs.writeFile(configUri, new TextEncoder().encode(configContent));
    }
    public get path(): string{
        return this._path;
    }
}