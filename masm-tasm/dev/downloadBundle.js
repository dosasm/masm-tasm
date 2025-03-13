const fetch = require('node-fetch');
const {HttpProxyAgent }= require('http-proxy-agent');
const fs=require("fs")


const url = "https://dosasm.github.io/dosplay/jsdos-bundle/";

const proxy = 'http://127.0.0.1:7890';
const agent = new HttpProxyAgent(proxy);

async function main(params) {
    let a=await fetch(url+"info.json");
    let info=await a.json()
    console.log(info)
    for (const b of info.bundles){
        console.log(b)
        const response=await fetch(url+b.filepath)
        const fileStream = fs.createWriteStream("./resources/"+b.name+".zip");
        response.body.pipe(fileStream);
        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
          });
    }
}
main()
