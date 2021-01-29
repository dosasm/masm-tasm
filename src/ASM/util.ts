import { FileType } from 'vscode';

/**check whether the entry is in directory or not
 * @param dirinfo the entris of one directory
 * @param entry the entry to find
 * @param ignoreCase ignore Case or not,default is true in win32 and false for other
 */
export function inDirectory(dirinfo: [string, FileType][], entry: [string, FileType], ignoreCase: boolean = process.platform === "win32"): [string, FileType] | undefined {
    for (const d of dirinfo) {
        const filecheck = ignoreCase ? d[0].toLowerCase() === d[0].toLowerCase() : d[0] === d[0];
        if (filecheck && d[1] === d[1]) {
            return d;
        }
    }
    return;
};

/**
 * make sure value in the list
 */
export function validfy<T>(value: T | undefined, list: T[]): T {
    for (const val of list) {
        if (value === val) {
            return value;
        }
    }
    return list[0];
}