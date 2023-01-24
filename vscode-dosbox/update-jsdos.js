const { execSync } = require("child_process");
const fs=require("fs");
const JSZip = require("jszip");
const { resolve } = require("path");

const file=down()
unpack(file)

function down(){   
    const pack=JSON.parse(fs.readFileSync("package.json"));
    const emulators_version=pack["devDependencies"]["emulators"]
    console.log("downloading source code of version ",emulators_version)
    
    const url=`https://github.com/js-dos/emulators/archive/refs/tags/v${emulators_version}.zip`;
    execSync(`curl -fSL ${url} -o .${emulators_version}.zip`,{stdio:"inherit"});
    return `.${emulators_version}.zip`;
}

async function unpack(file){
    const zip=new JSZip()
    await zip.loadAsync(fs.readFileSync(file))
    const files=zip.file(/src.*\.ts/).filter(a=>!a.name.includes("test"))
    for (const file of files){
        const segs=file.name.split("/").slice(2)
        const dest=resolve(__dirname,"src","emulators",...segs)
        const text=await file.async("string")
        fs.writeFileSync(dest,text)
        console.log("writed",file.name) 
    }
    fs.rmSync(file)
}



    
