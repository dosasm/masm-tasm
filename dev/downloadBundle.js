const { existsSync,copyFileSync,mkdirSync,readdirSync } = require('fs');
const path = require('path');
const pkg = require("../package.json");

const actions = pkg.contributes.configuration.properties['masmtasm.ASM.actions'].default
const assemblers = Object.keys(actions).map(key => actions[key].baseBundle.replace('<built-in>/', ""));

const srcFolder = path.resolve(__dirname,"..","..","assembly-tool","build")
const dstFolder = path.resolve(__dirname, "..", "resources");

async function main() {
    for (const asm of assemblers) {
        const dst = path.resolve(dstFolder, asm);
        const src = path.resolve(srcFolder, asm);
        if(!existsSync(src)){
            console.warn("can't find file "+src+"[skip]");
            continue
        }
        if (existsSync(dst)) {
            console.log('already added', asm)
        } else {
            console.log(src,dstFolder)
            copyFileSync(src,dst)
        }
    }
}

async function copyEmulator(){
    const src=path.resolve(__dirname,"../node_modules/emulators/build/wasm/")
    const dest=path.resolve(__dirname,"../resources/node_modules/emulators/build/wasm/")
    mkdirSync(dest,{recursive:true})
    const files=readdirSync(src);
    for(const file of files){
        copyFileSync(
            path.resolve(src,file),
            path.resolve(dest,file),
        )
    }
}

main()
copyEmulator()