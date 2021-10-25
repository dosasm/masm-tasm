const download = require('download');
const { existsSync } = require('fs');
const { resolve } = require('path');
const pkg = require("../package.json");

const actions = pkg.contributes.configuration.properties['masmtasm.ASM.actions'].default
const assemblers = Object.keys(actions).map(key => actions[key].baseBundle.replace('<built-in>/', ""));

const host = "https://dosasm.github.io/dosrun/bundles/"
const dstFolder = resolve(__dirname, "..", "resources");

async function main() {
    for (const asm of assemblers) {
        const dst = resolve(dstFolder, asm);
        const src = host + asm;
        if (existsSync(dst)) {
            console.log('already downloaded', asm)
            console.log(src, dst)
        } else {
            await download(src, dstFolder)
        }
    }
}

main()