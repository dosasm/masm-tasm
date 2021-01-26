import { Uri } from 'vscode';
import { ASMTYPE, Config, SRCFILE } from '../configration';
import { ASMPREPARATION, EMURUN, MSGProcessor } from '../runcode';
import { DOSBox } from './DOSBox';
import { MsdosPlayer } from './msdos-player';

export class AutoMode implements EMURUN {
    private _dosbox: DOSBox;
    private _msdos: MsdosPlayer;
    private _conf: Config;
    copyUri?: Uri;
    forceCopy?: boolean;
    constructor(conf: Config) {
        this._conf = conf;
        this._dosbox = new DOSBox(conf);
        this._msdos = new MsdosPlayer(conf);
    }
    prepare(opt: ASMPREPARATION): boolean {
        this.copyUri = this._msdos.copyUri;
        let output = this._dosbox.prepare(opt) && this._msdos.prepare(opt);
        this.forceCopy = this._msdos.forceCopy || this._dosbox.forceCopy;
        return output;
    }
    openEmu(folder: Uri) {
        return this._dosbox.openEmu(folder);
    }
    async Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any> {
        let msg = await this._msdos.runPlayer(this._conf);
        if (await msgprocessor(msg)) {
            await this._dosbox.Run(src);
        }
        return;
    }
    async Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any> {
        if (this._conf.MASMorTASM === ASMTYPE.MASM) {
            return this._msdos.Debug(src, msgprocessor);
        }
        else {
            let msg = await this._msdos.runPlayer(this._conf);
            if (await msgprocessor(msg)) {
                this._dosbox.Debug(src);
            }
        }

    }

}