import { ExtensionContext, FileType, TextDocument, Uri, window, workspace } from 'vscode';
import { Logger } from './outputChannel';
import { inDirectory, validfy } from './util';
import { localize } from '../i18n';

interface TOOLURIS {
    /**the separate workspace to use*/
    workspace: Uri;
    /**global storage uri */
    globalStorage: Uri;
    /**the folder for dosbox */
    dosbox: Uri;
    /**the folder for msdos player */
    msdos: Uri;
    /**the folder for js dos */
    jsdos: Uri;
    /**tools folder */
    tools: Uri;
    /**folder for masm tools */
    masm?: Uri;
    /**folder for tasm tools */
    tasm?: Uri;
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

const packagedTools = "./tools";
const fs = workspace.fs;
const delExtList = [".exe", ".obj", ".com"];
const DST_FILE_NAME = 'T';
const allowedEMU = (): DOSEMU[] => {
    const emu = [DOSEMU.dosbox, DOSEMU.jsdos];
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
export const settingsStrReplacer = (val: string, conf?: Config, src?: SRCFILE): string => {
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
    public get savefirst(): boolean {
        return this._target.get('savefirst') as boolean;
    };
    /**use MASM or TASM */
    public get MASMorTASM(): ASMTYPE {
        return this._target.get('MASMorTASM') as ASMTYPE;
    };
    /**use dosbox or msdos as emulator */
    public get DOSemu(): DOSEMU {
        return validfy(this._target.get('emulator'), allowedEMU());
    };
    public get toolspath(): Uri | undefined {
        const val: string | undefined = this._target.get('toolspath');
        if (val) {
            return Uri.file(val);
        }
        return;
    }
    //Uris and tools information
    public Uris: TOOLURIS;
    public get Separate(): boolean { return this._target.get('separateSpace') as boolean; }
    public get Clean(): boolean { return this._target.get('clean') as boolean; }
    private readonly _exturi: Uri;
    private _statusBar = window.createStatusBarItem();
    constructor(ctx: ExtensionContext) {
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('masmtasm.ASM')) {
                this.update();
            }
        });
        this.update();
        this._exturi = ctx.extensionUri;

        const globalStorageUri = ctx.globalStorageUri;
        const toolsUri = this.toolspath ? this.toolspath : Uri.joinPath(this._exturi, packagedTools);
        //the tools' Uri
        this.Uris = {
            tools: toolsUri,
            workspace: Uri.joinPath(globalStorageUri, './workspace/'),
            dosbox: Uri.joinPath(toolsUri, './dosbox/'),
            msdos: Uri.joinPath(toolsUri, './player/'),
            jsdos: Uri.joinPath(toolsUri, './js-dos/'),
            globalStorage: globalStorageUri
        };
        fs.createDirectory(this.Uris.workspace);//make sure the workspace uri exists
        this.printToChannel();
    }
    private update(): void {
        this._target = workspace.getConfiguration('masmtasm.ASM');
        this._statusBar.text = `${this.DOSemu} ${this.MASMorTASM}`;
        this._statusBar.show();
        this._statusBar.command = 'masmtasm.updateEmuASM';
    }

    public get dosboxconfuri(): Uri {
        const uri = Uri.joinPath(this.Uris.globalStorage, 'VSC-ExtUse.conf');
        return uri;
    }
    public printToChannel(): void {
        Logger.send(
            {
                title: localize('config.title', "[Config] {0}", new Date().toLocaleString()),
                content: localize('config.content', 'default workspace:"{0}"\nuse tools from "{1}"',
                    this.Uris.workspace.fsPath, this.Uris.tools.fsPath)
            }
        );
    }
}

/**The class for source code file
 * TODO: find out the dependences of all source code files
 */
export class SRCFILE {
    private _copy: Uri | undefined;
    public doc: TextDocument | undefined;
    constructor(private _uri: Uri) {
    }
    private pathinfo(): { name: string; ext: string } {
        let name = "", ext = "";
        const r = /.*[\\\/](.*)\.(.*)/;
        const re = r.exec(this.uri.fsPath);
        if (re) {
            name = re[1];
            ext = re[2];
        }
        return { name, ext };
    }
    public get disk(): string | undefined {
        const re = this.uri.fsPath.match(/([a-zA-Z]):/);
        if (re) {
            return re[1];
        }
        return undefined;
    }
    public get filename(): string {
        return this.pathinfo().name;
    }
    public get extname(): string {
        return this.pathinfo().ext;
    }
    public get dosboxFsReadable(): boolean {
        return !!this.filename.match(/^\w{1,8}$/);
    }
    /**copy the source code file to another path*/
    public async copyto(uri: Uri): Promise<boolean> {
        if (this._copy === undefined) {
            this._copy = Uri.joinPath(uri, DST_FILE_NAME + '.' + this.extname);
            await fs.copy(this._uri, this._copy, { overwrite: true });
            return true;
        }
        return false;
    }
    public async cleanDir(): Promise<undefined> {
        const uri = this.folder;
        const dirs: [string, FileType][] = await fs.readDirectory(uri);
        const delList = delExtList.map((val) => this.filename + val);
        for (const value of delList) {
            const del = inDirectory(dirs, [value, FileType.File]);
            if (del) {
                await fs.delete(Uri.joinPath(uri, del[0]), { recursive: false, useTrash: false });
            }
        }
        return;
    }
    /**copy the source code file and the generated exe file to another path*/
    public async copyEXEto(uri: Uri): Promise<void> {
        const dirinfo = await fs.readDirectory(this.folder);
        const related = dirinfo.filter(
            (val) => val[0].includes(this.filename) && val[1] === FileType.File
        );
        const srcFolder = this.folder;
        const dstFolder = uri;
        for (const r of related) {
            const src = Uri.joinPath(srcFolder, r[0]);
            const dst = Uri.joinPath(dstFolder, r[0].replace(this.filename, DST_FILE_NAME));
            await fs.copy(src, dst, { overwrite: true });
        }
        await this.copyto(uri);
    }
    public get uri(): Uri {
        if (this._copy) {
            return this._copy;
        }
        return this._uri;
    }
    public get folder(): Uri {
        return Uri.joinPath(this.uri, '../');
    }
    public pathMessage(more?: string): string {
        let str = `"${this._uri.fsPath}"`;
        if (this._copy) { str += `\ncopied as "${this._copy?.fsPath}" `; }
        if (more) { str += more; }
        return str;
    }
}








