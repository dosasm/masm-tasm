import { ExtensionContext, FileType, TextDocument, Uri, window, workspace } from 'vscode';
import { Logger } from './outputChannel';
import { inArrays, validfy } from './util';

const packaged_Tools = "./tools";
const fs = workspace.fs;
const delExtList = [".exe", ".obj"];
const DST_FILE_NAME = 'T';
let allowedEMU = () => {
    let emu = [DOSEMU.dosbox, DOSEMU.jsdos];
    if (process.platform === 'win32') {
        emu.push(DOSEMU.auto, DOSEMU.msdos);
    }
    return emu;
};

/**### the string replacer 
 * 
 * |string|replace to|
 * |------|----------|
 * |`${filename}`|the filename of the source code file like `hello`|
 * |`${fullname}`|the fullname of the source code file like`c:\asm\hello.asm`|
 * |`${fileFolder}`|the folder path of the source code file like `c:\asm`|
 * |`${fileDisk}`|the file disk of the source code file like `c`|
 * |`${toolpath}`|the folder path of the asm tools including *MASM* and *TASM* folder|
 */
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
 * This class defines some settings from VSCode configuration id `masmtasm.ASM`
 * and some uris to use
 */
export class Config {
    private _target = workspace.getConfiguration('masmtasm.ASM');
    /**if true,save file before assembling*/
    public get savefirst() {
        return this._target.get('savefirst');
    };
    /**use MASM or TASM */
    public get MASMorTASM(): ASMTYPE {
        return this._target.get('MASMorTASM') as ASMTYPE;
    };
    /**use dosbox or msdos as emulator */
    public get DOSemu(): DOSEMU {
        return validfy(this._target.get('emulator'), allowedEMU());
    };
    //Uris and tools information
    public Uris: TOOLURIS;
    public get Separate(): boolean { return this._target.get('ASM.separateSpace') as boolean; }
    public get Clean(): boolean { return this._target.get('ASM.clean') as boolean; }
    private readonly _exturi: Uri;
    private _toolpath: string | undefined;
    constructor(ctx: ExtensionContext) {
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('masmtasm')) {
                this._target = workspace.getConfiguration('masmtasm.ASM');
            }
        });
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
            jsdos: Uri.joinPath(this._exturi, './tools/js-dos/'),
            globalStorage: globalStorageUri
        };
        fs.createDirectory(this.Uris.workspace);//make sure the workspace uri exists
        this._toolpath = this._target.get('toolspath');
        Logger.send({ title: `[Config] ${new Date().toLocaleString()}`, content: Config.printConfig(this) });
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
    /**the separate workspace to use*/
    workspace: Uri,
    /**global storage uri */
    globalStorage: Uri
    /**the folder for dosbox */
    dosbox: Uri,
    /**the folder for msdos player */
    msdos: Uri,
    /**the folder for js dos */
    jsdos: Uri,
    /**tools folder */
    tools: Uri,
    /**folder for masm tools */
    masm?: Uri,
    /**folder for tasm tools */
    tasm?: Uri
};

/**use MASM or TASM
 * - MASM: including masm.exe,link.exe,debug.exe
 * - TASM: including tasm.exe,tlink.exe,TD.exe
 */
export enum ASMTYPE {
    MASM = 'MASM',
    TASM = 'TASM'
}

/**the emulator for the 16bit DOS environment
 * - `dosbox` is the most famous one
 * - `msdos`( player) is designed for running in windows cmd
 * - `jsdos` is designed for runing in browser
 * - `auto` is a mode to partly solve the problem of TD's hardly running in msdos
 */
export enum DOSEMU {
    dosbox = 'dosbox',
    msdos = 'msdos player',
    auto = 'auto',
    jsdos = 'jsdos',
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








