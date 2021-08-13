//methods for manipute jsdos-bundles
import * as fs from 'fs';
import { resolve, relative } from 'path';
import * as JSZip from 'jszip';
import * as path from 'path';

/**create a jsdos bundle file by add new files to the sample. powered by https://stuk.github.io/jszip/
 * 
 * @param conf: the dosbox config, the original one will be overwrited
 * @param copys: the files need to be add to the bundle
 * @param sample: the base jsdos bundle
*/
export async function createBundle(dst: string, conf?: string, copys?: { from: string; to: string }[], sample?: string): Promise<string> {
    const zip = new JSZip();
    if (sample) {
        const zipdata = fs.readFileSync(sample);
        await zip.loadAsync(zipdata);
    }
    if (conf) {
        const data = conf;
        zip.file('.jsdos/dosbox.conf', data);
    }
    if (Array.isArray(copys)) {
        for (const m of copys) {
            if (fs.existsSync(m.from)) {
                const s = fs.statSync(m.from);
                if (s.isDirectory()) {
                    for await (const f of getFiles(m.from)) {
                        const rel = relative(m.from, f);
                        const dst = path.posix.join(m.to, rel);
                        //console.log(rel, dst)
                        const data = fs.readFileSync(f);
                        zip.file(dst, data);
                    }
                }
                else if (s.isFile()) {
                    const data = fs.readFileSync(m.from);
                    zip.file(m.to, data);
                }
            }
        }
    }
    return new Promise(
        resolve => {
            zip
                .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
                .pipe(fs.createWriteStream(dst))
                .on('finish', function () {
                    // JSZip generates a readable stream with a "end" event,
                    // but is piped here in a writable stream which emits a "finish" event.
                    console.log(dst + " written.");
                    resolve(dst);
                });
        }
    )
}

const readdir = fs.promises.readdir;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function* getFiles(dir: string): any {
    const dirents = await readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* getFiles(res);
        } else {
            yield res;
        }
    }
}