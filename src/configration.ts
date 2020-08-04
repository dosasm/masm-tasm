import {  workspace, window, Uri} from 'vscode';
/**
 * 获取配置信息
 */
export class Config {
    private _path:string|undefined
    private _BOXrun: string|undefined
    private _DOSemu: string|undefined
    private _extpath:string|undefined
    public resolution: string | undefined
    public savefirst: boolean|undefined
    public MASMorTASM: string | undefined
    constructor(extpath?:string) {
        this.resolution = workspace.getConfiguration('masmtasm.dosbox').get('CustomResolution');
        this.MASMorTASM= workspace.getConfiguration('masmtasm.ASM').get('MASMorTASM');
        this._DOSemu= workspace.getConfiguration('masmtasm.ASM').get('emulator');
        this.savefirst= workspace.getConfiguration('masmtasm.ASM').get('savefirst');
        this._BOXrun=workspace.getConfiguration('masmtasm.dosbox').get('run');
        this._path=workspace.getConfiguration('masmtasm.ASM').get('toolspath');
        this._extpath=extpath
    }
    public get path(): string{
        let path=this.toolsUri.fsPath
        return path
    }
    public get toolsUri(): Uri{
        let toolsuri:Uri
        if (this._path){
            toolsuri=Uri.file(this._path)}//1.首先使用用户设定的工具集
            else if(this._extpath){
                toolsuri=Uri.joinPath(Uri.file(this._extpath),'./tools')//2.其次使用插件打包的工具集
            }
            else {
                window.showInformationMessage('未设置汇编工具路径请在设置中添加相关设置');
                throw new Error("no tools please add your tool in settings");
            }
        return toolsuri
    }
    public get boxruncmd():string{
        let command:string=' '
        switch(this._BOXrun){
            case "keep":command=' ';break;
            case "exit after run":command='exit';break;
            case "pause then exit after run":command='pause \n exit';break
        }
        return command
    }
    public get boxrunbat():string{
        let param:string=' '
        switch(this._BOXrun){
            case "keep":param='k';break;
            case "exit after run":param='e';break;
            case "pause then exit after run":param='p';break
        }
        return param
    }
    public get DOSemu():string
    {
        let dosemu=' '
        if(this._DOSemu) dosemu=this._DOSemu
        if (process.platform!='win32')   dosemu='dosbox'//在linux下无法使用msdos只使用dosbox
        return dosemu
    }
}