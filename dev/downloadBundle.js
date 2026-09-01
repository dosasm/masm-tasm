const { existsSync,copyFileSync,mkdirSync,readdirSync } = require('fs');
const path = require('path');
const pkg = require("../package.json");

const actions = pkg.contributes.configuration.properties['masmtasm.ASM.actions'].default
const assemblers = [
    "TASM.jsdos",
    "MASM-v5.00.jsdos",
    "MASM-v6.11.jsdos"
];

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
    const src=path.resolve(__dirname,"../node_modules/@xsro/emulators/dist/")
    const dest=path.resolve(__dirname,"../resources/node_modules/emulators/build/wasm/")
    mkdirSync(dest,{recursive:true})
    const files=readdirSync(src);
    for(const file of files){
        if (file.includes("jspi")|| file.includes("nodefs")){
            continue
        }
        copyFileSync(
            path.resolve(src,file),
            path.resolve(dest,file),
        )
    }
    console.log("copied emulators wasm to ",dest)
}

main()
copyEmulator()