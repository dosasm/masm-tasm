

export function messageCollector(): [(msg: string) => void, Promise<string>] {
    let allmsg = "";
    let resolve: ((value: string) => void) | undefined = undefined;
    return [
        (msg: string) => {
            allmsg += msg;
            let re = allmsg.match(/Microsoft \(R\) MASM Compatibility Driver([\s\S]*)Microsoft \(R\) Segmented Executable Linker/);
            if (re && re[1] && resolve) {
                resolve(re[1]);
                resolve = undefined;
            }
            re = allmsg.match(/Turbo Assembler  Version 4.1  Copyright \(c\) 1988, 1996 Borland International([\s\S]*)Turbo Link  Version 7\./);
            if (re && re[1] && resolve) {
                resolve(re[1]);
                resolve = undefined;
            }
        }
        ,
        new Promise<string>(
            _resolve => resolve = _resolve
        )];

}