const pack=require('./package.json');
const fs=require('fs');

pack.homepage="https://dosasm.gitee.io/react-app/";
fs.writeFileSync('./package.json',JSON.stringify(pack),{encoding:'utf-8'})

