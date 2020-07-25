import {  workspace, window} from 'vscode';
/**
 * 获取配置信息
 */
export class Config {
    private _path: string;
    public resolution: string | undefined;
    public BOXrun: string|undefined;
    public DOSemu: string|undefined;
    public savefirst: boolean|undefined;
    public MASMorTASM: string | undefined;
        public ASM:string
        public LINK:string
        public DEBUG:string
    constructor(extpath?:string) {
        this.resolution = workspace.getConfiguration('masmtasm.dosbox').get('CustomResolution');
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
                else if(extpath){
                    this._path=extpath+'/tools'
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
    public get path(): string{
        return this._path;
    }
}