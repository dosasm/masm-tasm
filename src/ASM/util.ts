import { FileType } from 'vscode';

/**check the file(dir) in folder or not */
export function inArrays(data: [string, FileType][], arr: [string, FileType], ignoreCase?: boolean): boolean {
    let ignore: boolean = process.platform === "win32";
    if (ignoreCase) {
        ignore = ignoreCase;
    }
    if (ignore) {
        return data.some(e => e[0].toLowerCase() === arr[0].toLowerCase() && e[1] === arr[1]);
    }
    else {
        return data.some(e => e.every((o, i) => Object.is(arr[i], o)));
    }
};

/**
 * make sure value in the list
 */
export function validfy<T>(value: T | undefined, list: T[]): T {
    for (let val of list) {
        if (value === val) {
            return value;
        }
    }
    return list[0];
}