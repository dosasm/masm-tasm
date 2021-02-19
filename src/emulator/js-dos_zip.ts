import { FileType, Uri, workspace } from 'vscode';
import { createWriteStream } from 'fs';
import * as archiver from 'archiver';

const fs = workspace.fs;

/**
 * compress files in a folder to a zip
 * @param src the folder of files
 * @param dst the destination path
 */
function compress(src: string, dst: string): void {

    // create a file to stream archive data to.
    const output = createWriteStream(dst);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function () {
        console.log('Data has been drained');
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function (err: { code: string }) {
        if (err.code === 'ENOENT') {
            // log warning
        } else {
            // throw error
            throw err;
        }
    });

    // good practice to catch this error explicitly
    archive.on('error', function (err: unknown) {
        throw err;
    });

    // pipe archive data to the file
    archive.pipe(output);

    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(src, false);

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    archive.finalize();
}

export function compressDir(srcDir: Uri, dstFile: Uri): void {
    compress(srcDir.fsPath, dstFile.fsPath);
}

/**compress the subfolder `masm` and `tasm` from **uri** to **dst**
 * as two zips
 * @param uri the folder contains subfolder `masm` and `tasm`
 * @param dst the destination folder,will create `masm.zip` and `tasm.zip` in this folder
 */
export async function compressAsmTools(uri: Uri, dst: Uri): Promise<void> {
    const dirs = await fs.readDirectory(dst);
    if (dirs.some(val => val[0] === 'masm.zip' && val[1] === FileType.File)) {

    } else {
        compressDir(Uri.joinPath(uri, 'masm'), Uri.joinPath(dst, 'masm.zip'));
    }
    if (dirs.some(val => val[0] === 'tasm.zip' && val[1] === FileType.File)) {

    } else {
        compressDir(Uri.joinPath(uri, 'tasm'), Uri.joinPath(dst, 'tasm.zip'));
    }
}
