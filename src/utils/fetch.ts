/* eslint-disable @typescript-eslint/no-explicit-any */

export const fetch =
    process.platform
        ? (...args: any[]) => import(
        /* webpackIgnore: true */'node-fetch').then((module) => {
            console.log(module);
            return (module.default as any)(...args);
        }
        )
        : window.fetch;