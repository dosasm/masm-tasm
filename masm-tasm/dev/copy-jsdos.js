// copy files to resources
const fs=require("fs");
const path=require("path")

const Files=[
    {from:"node_modules/emulators/dist/*.js",to:"resources/jsdos"},
    {from:"node_modules/emulators/dist/*.js",to:"resources/jsdos"},
]

const folder="node_modules/emulators/dist/"
const files=fs.readdirSync(folder);
for(const file of files){
    const source=path.resolve(folder,file)
    if(file.endsWith("x.js")){
        const header=fs.readFileSync("dev/header.js","utf-8")
        const body=fs.readFileSync(source,"utf-8");
        fs.writeFileSync("resources/jsdos/"+file,(header+body).replace(/\r\n/g,"\n"))
    }
    if(file.endsWith(".wasm")){
        fs.copyFileSync(source,"resources/jsdos/"+file)
    }
}

