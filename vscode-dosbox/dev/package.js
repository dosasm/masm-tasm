const fs = require("fs");
const pak = require("../package.json");
const path = require("path");
const os = require("os");
const cp=require("child_process");

const projectDir = path.resolve(__dirname, "..");

const validTargets = [
  "win32-x64",
  "win32-ia32",
  "win32-arm64",
  "linux-x64",
  "linux-arm64",
  "linux-armhf",
  "darwin-x64",
  "darwin-arm64",
  "alpine-x64",
  "alpine-arm64",
  "web",
];

function generateIgnore(platform,arch){
  const ignorePath = path.resolve(projectDir, ".vscodeignore");
  const baseContent=fs.readFileSync(path.resolve(projectDir,".vsce/.vscodeignore"),"utf-8");
  const platformContent=fs.readFileSync(path.resolve(projectDir,`.vsce/${platform}.vscodeignore`),"utf-8");
  fs.writeFileSync(ignorePath,baseContent+"\n"+platformContent.replace(/\{arch\}/g,arch));
}

async function package(platform, arch,folder="build") {
  const target = platform + (arch ? "-" + arch : "");
  generateIgnore(platform,arch);

  !fs.existsSync(folder) && fs.mkdirSync(folder);

  const packagePath = `${folder}/${pak.name}-${target}-${pak.version}.vsix`;
  const run=command=>cp.execSync(command,{stdio:"inherit"});
  run(`pnpm vsce package --no-dependencies --target ${target} --out ${packagePath}`);

  console.log(`
start creating package in platform:${process.platform},arch:${process.arch}
package path: ${packagePath}
`,
    { target, platform, arch }
  );
}

async function main() {
  if (process.argv.includes("--all")) {
    for (const target of validTargets) {
      [platform, arch] = target.split("-");
      await package(platform, arch);
    }
  } else if (process.argv.includes("--target")) {
    const targetIdx = process.argv.findIndex((val) => val.includes("--target"));
    if (targetIdx >= 0) {
      target = process.argv[targetIdx + 1].startsWith("web")
        ? "web"
        : process.argv[targetIdx + 1];
      [platform, arch] = target.split("-");
      await package(platform, arch);
    }
  } else {
    let { platform, arch } = process;
    await package(platform, arch);
  }
}

main();
