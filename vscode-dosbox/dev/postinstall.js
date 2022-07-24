const fs = require("fs");
const { resolve } = require("path");

function copydir(dir, dst) {
  for (const file of fs.readdirSync(dir)) {
    const src = resolve(dir, file);
    const s = fs.statSync(src);
    if (s.isFile()) {
      fs.cpSync(src, resolve(dst, file));
    }
  }
}

const mkdirSync = (dir) => !fs.existsSync(dir) && fs.mkdirSync(dir,{recursive:true});
mkdirSync("dist/emulators/");
mkdirSync("dist/emulators-ui/");
copydir("node_modules/emulators/dist", "dist/emulators/");
copydir("node_modules/emulators-ui/dist", "dist/emulators-ui/");
