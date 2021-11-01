import * as vscode from 'vscode';

const fs = vscode.workspace.fs;

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