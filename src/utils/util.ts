import * as vscode from 'vscode';
import { URI, Utils } from 'vscode-uri';

const fs = vscode.workspace.fs;

async function openDir(uri: URI, onFile: (file: URI) => Thenable<void>) {
    const iterms = await fs.readDirectory(uri);
    for (const [name, type] of iterms) {
        const _uri = Utils.resolvePath(uri, name);
        if (type === vscode.FileType.File) {
            await onFile(_uri);
        }
        else if (type === vscode.FileType.Directory) {
            await openDir(_uri, onFile);
        }
    }
}

export async function* getFiles(dir: string | vscode.Uri): AsyncGenerator<vscode.Uri> {
    const rootDir = typeof dir === 'string' ? vscode.Uri.file(dir) : dir;
    const dirents = await fs.readDirectory(rootDir);
    for (const dirent of dirents) {
        const res = vscode.Uri.joinPath(rootDir, dirent[0]);
        if (dirent[1] === vscode.FileType.Directory) {
            yield* getFiles(res);
        } else {
            yield res;
        }
    }
}

export const uriUtils = {
    ...Utils,
    filename: function (uri: URI) {
        return Utils.basename(uri).replace("." + Utils.extname(uri), "");
    },
    info: function (uri: URI) {
        return {
            file: uriUtils.basename(uri),
            dir: uriUtils.dirname(uri),
            ext: uriUtils.extname(uri),
            filename: uriUtils.filename(uri)
        };
    }
};

export async function emptyFolder(uri: URI) {
    await fs.createDirectory(uri);
    const callback = (file: URI) => fs.delete(file);
    await openDir(uri, callback);
}

