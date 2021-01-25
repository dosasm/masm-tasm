import { Config, SRCFILE } from '../configration';
import { EMURUN, MSGProcessor } from '../runcode';


export class AutoMode implements EMURUN {
    prepare(conf: Config): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    openEmu(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    Run(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any> {
        throw new Error('Method not implemented.');
    }
    Debug(src: SRCFILE, msgprocessor: MSGProcessor): Promise<any> {
        throw new Error('Method not implemented.');
    }

}