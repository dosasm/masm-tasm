import * as nodefs from 'fs';
import * as path from 'path';

export async function* getFiles(dir: string): AsyncGenerator<string> {
    const dirents = await nodefs.promises.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* getFiles(res);
        } else {
            yield res;
        }
    }
}