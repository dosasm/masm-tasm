export function localize(key: string, value: string, ...args: string[]): string {
    for (const argidx in args) {
        value = value.replace(`{${argidx}}`, args[argidx]);
    }
    return value;
}