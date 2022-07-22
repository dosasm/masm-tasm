const vsce = require("vsce");
const fs = require("fs");
const pak = require("../package.json");
const path = require("path");
const os = require("os");

const cwd = path.resolve(__dirname, "..");

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

async function package(platform, arch) {
  const target = platform + (arch ? "-" + arch : "");
  const ignorePath = path.resolve(cwd, ".vscodeignore");
  const _vscodeignore = await fs.promises.readFile(ignorePath, {
    encoding: "utf-8",
  });

  let vscodeignore = _vscodeignore;

  if (platform === "win32") {
    vscodeignore = vscodeignore
      .replace(
        "!emu/dosbox_x",
        `
                    !emu/dosbox_x/win32-${arch}
                    !emu/dosbox_x/*.conf
                    !emu/dosbox_x/zh-CN/simkai.ttf
                    !emu/dosbox_x/zh-CN/zh_CN.lng
                `
      )
      .replace(
        "!emu/msdos_player",
        `
                !emu/msdos_player/win32-${arch === "arm64" ? "ia32" : arch}
                !emu/msdos_player/command.com`
      );
  } else if (platform === "web") {
    vscodeignore =
      vscodeignore
        .replace("!emu/dosbox", "!emu/dosbox/dosbox-0.74.conf")
        .replace("!emu/dosbox_x", "")
        .replace("!emu/msdos_player", "")
        .replace("!node_modules/emulators*/package.json", "")
        .replace("!node_modules/emulators*/dist/*.*", "") +
      os.EOL +
      "dist/extension.js";
  } else if (platform === "darwin") {
    vscodeignore = vscodeignore
      .replace("!emu/dosbox", "!emu/dosbox/dosbox-0.74.conf")
      .replace(
        "!emu/dosbox_x",
        `
                !emu/dosbox_x/*.conf
                !emu/dosbox_x/zh-CN/simkai.ttf
                !emu/dosbox_x/zh-CN/zh_CN.lng
                `
      )
      .replace("!emu/msdos_player", "");
  } else {
    vscodeignore = vscodeignore
      .replace("!emu/dosbox", "!emu/dosbox/dosbox-0.74.conf")
      .replace("!emu/dosbox_x", `!emu/dosbox_x/*.conf`)
      .replace("!emu/msdos_player", "");
  }
  await fs.promises.writeFile(ignorePath, vscodeignore);

  const files = await vsce.listFiles({
    packageManager: vsce.PackageManager.Yarn,
  });
  console.log(files);

  await vsce.createVSIX({ target, useYarn: true });

  await fs.promises.writeFile(ignorePath, _vscodeignore);

  const packagePath = `${pak.name}-${target}-${pak.version}.vsix`;
  console.log(
    `
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
