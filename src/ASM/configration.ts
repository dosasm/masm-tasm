import { ExtensionContext, FileType, TextDocument, Uri, window, workspace } from 'vscode';
import { scanTools } from './conf_tools';
import { logger } from './outputChannel';
import { inArrays, validfy } from './util';

const packaged_Tools = "./tools";
const fs = workspace.fs;
const delExtList = [".exe", ".obj"];
const DST_FILE_NAME = 'T';
export const str_replacer = (val: string, conf?: Config, src?: SRCFILE) => {
    let str: string = val;
    if (src) {
        str = str
            .replace(/\${filename}/g, src.filename)
            .replace(/\${fullname}/g, src.uri.fsPath)
            .replace(/\${fileFolder}/g, src.folder.fsPath);
        if (src.disk) {
            str = str.replace(/\${fileDisk}/g, src.disk);
        }
    }
    if (conf) {
        str = str.replace(/\${toolpath}/g, conf.Uris.tools.fsPath);
    }
    return str;
};

/**class for configurations
 * This class defines some settings and some uri to use
 */
export class Config {
    //basic settings
    /**if true,save file before assembling*/
    public readonly savefirst: boolean;
    /**use MASM or TASM */
    public readonly MASMorTASM: ASMTYPE;
    /**use dosbox or msdos as emulator */
    public readonly DOSemu: DOSEMU;
    //Uris and tools information
    public Uris: TOOLURIS;
    public Seperate: boolean = false;
    public Clean: boolean = true;
    private readonly _exturi: Uri;
    private _asmAction: any;
    private _toolpath: string | undefined;
    constructor(ctx: ExtensionContext) {
        const configuration = workspace.getConfiguration('masmtasm');

        let allowedEMU = [DOSEMU.dosbox];
        if (process.platform === 'win32') {
            allowedEMU.push(DOSEMU.auto, DOSEMU.msdos);
        }

        this.MASMorTASM = validfy(configuration.get('ASM.MASMorTASM'), [ASMTYPE.MASM, ASMTYPE.TASM]);
        this.DOSemu = validfy(configuration.get('ASM.emulator'), allowedEMU);
        this.Seperate = validfy(configuration.get('ASM.seperateSpace'), [false, true]);
        this.Clean = validfy(configuration.get('ASM.clean'), [true, false]);
        this.savefirst = validfy(configuration.get('ASM.savefirst'), [true, false]);
        this._exturi = ctx.extensionUri;
        Uri.joinPath(this._exturi, './tools/');
        let globalStorageUri = ctx.globalStorageUri;
        if (globalStorageUri === undefined) {
            globalStorageUri = Uri.file(ctx.globalStoragePath);//for vscode like 1.44 the global storage Uri API is undenfined
        }
        //the tools' Uri
        this.Uris = {
            tools: Uri.joinPath(this._exturi, './tools/'),
            workspace: Uri.joinPath(globalStorageUri, './workspace/'),
            dosbox: Uri.joinPath(this._exturi, './tools/dosbox/'),
            msdos: Uri.joinPath(this._exturi, './tools/player/'),
            globalStorage: globalStorageUri
        };
        fs.createDirectory(this.Uris.workspace);//make sure the workspace uri exists
        this._toolpath = configuration.get('ASM.toolspath');
        logger({ title: `[Config] ${new Date().toLocaleString()}`, content: Config.printConfig(this) });
    }
    private async updateTools(uri: Uri) {
        this._asmAction = await scanTools(uri, this._exturi);
        this.Uris.tools = uri;
        let UriChange: boolean = false;
        const update = (key: string, target: 'msdos' | 'dosbox') => {
            if (this._asmAction[key]) {
                let u = Uri.joinPath(uri, this._asmAction[key]);
                if (u.path !== this.Uris[target].path) {
                    this.Uris[target] = u;
                    UriChange = true;
                }
            }
        }
        update('dosboxFolder', 'dosbox');
        update('msdosFolder', 'msdos');
        if (UriChange) {
            logger({ title: `[Config] ${new Date().toLocaleString()}`, content: Config.printConfig(this) });
        }
    }
    public async prepare(): Promise<boolean> {
        let ASMtoolsUri = Uri.joinPath(this._exturi, packaged_Tools);
        if (this._toolpath) {
            ASMtoolsUri = Uri.file(this._toolpath);
        }
        await this.updateTools(ASMtoolsUri);
        let output: boolean = false;
        switch (this.DOSemu) {
            case DOSEMU.dosbox:
                output = !!this._asmAction['dosbox'];
                break;
            case DOSEMU.msdos:
            case DOSEMU.auto:
                output = !!this._asmAction['msdos'];
                break;
        }
        if (!output) {
            window.showErrorMessage('Action undefined');
        }
        return output;
    }
    public getBoxAction(scope: string, src?: SRCFILE): string[] {
        let obj = this._asmAction['dosbox'];
        let boxcmd = obj[scope.toLowerCase()];
        if (Array.isArray(boxcmd)) {
            boxcmd = boxcmd.map(
                (val) => str_replacer(val, this, src)
            );
            return boxcmd;
        }
        else {
            return [];
        }
    }
    public getPlayerAction(scope: string, src?: SRCFILE): string {
        let obj = this._asmAction['msdos'];
        let str = obj[scope.toLowerCase()];
        str = str_replacer(str, this, src);
        return str;
    }
    public get dosboxconfuri(): Uri {
        let uri = Uri.joinPath(this.Uris.globalStorage, 'VSC-ExtUse.conf');
        return uri;
    }
    static printConfig(conf: Config) {
        let output = `
workspace: ${conf.Uris.workspace.fsPath}
use DOSBox from folder: ${conf.Uris.dosbox.fsPath}
use MSdos - player from folder: ${conf.Uris.msdos.fsPath}
        `;
        return output;
    }
}

interface TOOLURIS {
    /**the seperate workspace to use*/
    workspace: Uri,
    /**global storage uri */
    globalStorage: Uri
    /**the folder for dosbox */
    dosbox: Uri,
    /**the folder for msdos player */
    msdos: Uri,
    /**tools folder */
    tools: Uri,
    /**folder for masm tools */
    masm?: Uri,
    /**folder for tasm tools */
    tasm?: Uri
};

export enum ASMTYPE {
    MASM = 'MASM',
    TASM = 'TASM'
}

export enum DOSEMU {
    dosbox = 'dosbox',
    msdos = 'msdos player',
    auto = 'auto',
    jsdos = 'js-dos',
}


/**The class for source code file
 * TODO: find out the dependences of all source code files
 */
export class SRCFILE {
    private _copy: Uri | undefined;
    public doc: TextDocument | undefined;
    constructor(private _uri: Uri) {
    }
    private pathinfo() {
        let name = "", ext = "";
        let r = /.*[\\\/](.*)\.(.*)/;
        let re = r.exec(this.uri.fsPath);
        if (re) {
            name = re[1];
            ext = re[2];
        }
        return { name: name, ext: ext };
    }
    public get disk() {
        let re = this.uri.fsPath.match(/([a-zA-Z]):/);
        if (re) {
            return re[1];
        }
        return undefined;
    }
    public get filename() {
        return this.pathinfo().name;
    }
    public get extname() {
        return this.pathinfo().ext;
    }
    public get dosboxFsReadable() {
        return !!this.filename.match(/^\w{1,8}$/);
    }
    /**copy the source code file to another path*/
    public async copyto(uri: Uri) {
        if (this._copy === undefined) {
            this._copy = Uri.joinPath(uri, DST_FILE_NAME + '.' + this.extname);
            await fs.copy(this._uri, this._copy, { overwrite: true });
            return true;
        }
        return false;
    }
    public async cleanDir() {
        let uri = this.folder;
        let dirs: [string, FileType][] = await fs.readDirectory(uri);
        let delList = delExtList.map((val) => this.filename + val);
        for (let value of delList) {
            if (inArrays(dirs, [value, FileType.File])) {
                await fs.delete(Uri.joinPath(uri, value), { recursive: false, useTrash: false });
            }
        }

    }
    /**copy the source code file and the generated exe file to another path*/
    public async copyEXEto(uri: Uri) {
        let dirinfo = await fs.readDirectory(this.folder);
        let related = dirinfo.filter(
            (val) => val[0].includes(this.filename) && val[1] === FileType.File
        );
        let srcFolder = this.folder;
        let dstFolder = uri;
        for (let r of related) {
            let src = Uri.joinPath(srcFolder, r[0]);
            let dst = Uri.joinPath(dstFolder, r[0].replace(this.filename, DST_FILE_NAME));
            await fs.copy(src, dst, { overwrite: true });
        }
        this.copyto(uri);
    }
    public get uri(): Uri {
        if (this._copy) {
            return this._copy;
        }
        return this._uri;
    }
    public get folder() {
        return Uri.joinPath(this.uri, '../');
    }
    public pathMessage(more?: string) {
        let str = `"${this._uri.fsPath}"`;
        if (this._copy) { str += `\ncopied as "${this._copy?.fsPath}" `; }
        if (more) { str += more; }
        return str;
    }
}








