import { Config, SRCFILE } from '../configration';
import { EMURUN } from '../runcode';

export class MsdosPlayer implements EMURUN {
    prepare(conf: Config): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    openEmu(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    Run(src: SRCFILE, msgprocessor: (ASM: string, link?: string) => boolean): Promise<any> {
        throw new Error('Method not implemented.');
    }
    Debug(src: SRCFILE, msgprocessor: (ASM: string, link?: string) => boolean): Promise<any> {
        throw new Error('Method not implemented.');
    }



}