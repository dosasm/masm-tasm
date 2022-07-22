import JSZip from "jszip";
import { homepage } from '../package.json'

export class BundleZip {
    public zip: JSZip = new JSZip();
    constructor(
    ) {
        this.zip = new JSZip();
        this.zip.file('.jsdos/dosbox.conf', '[AUTOEXEC]')
    }
    async download(bundleUrl: string) {
        const a = new URL(homepage);
        const response = await fetch(a.pathname + bundleUrl);
        if (response.status === 200 || response.status === 0) {
            const blob = await response.blob();
            this.zip = await JSZip.loadAsync(blob);
            return this.zip
        }
    }
    async getBundle(autoexec?: string[], file?: { path: string, text: string }) {
        if (this.zip) {
            const zip = this.zip;
            if (autoexec)
                zip.file('.jsdos/dosbox.conf', '[AUTOEXEC]\n' + autoexec.join('\n'));
            if (file) {
                // eslint-disable-next-line no-control-regex
                const text = file.text.replace(/[^\x00-\x7F]/g, "")//only keep ASCII charactors in file
                    .replace(/\r/g, "").replace(/\n/g, '\r\n')//use crlf (\r\n) as eol
                zip.file(file.path, text);
            }
            const bundle = await zip.generateAsync({ type: "uint8array" });
            return bundle;
        }
    }
    async readFile(path: string) {
        if (this.zip) {
            return this.zip.file(path)?.async('string');
        }
    }
}

/**run jsdos and get the ci for render */
export async function loadBundle(baseBundle: string): Promise<JSZip> {
    //https://stuk.github.io/jszip/documentation/examples/get-binary-files-ajax.html
    const response = await fetch(baseBundle);
    if (response.status === 200 || response.status === 0) {
        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);
        return zip
        // zip.file('.jsdos/dosbox.conf', '[AUTOEXEC]\n' + autoexec.join('\n'));
        // const bundle = await zip.generateAsync({ type: "uint8array" });
        // const ci = emulators.dosboxWorker(bundle);
        // return ci;
    }
    throw new Error();
}