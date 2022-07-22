import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const { arch } = process;
  const msdosPath = context.asAbsolutePath(
    `./emu/msdos_player/win32-${arch === "arm64" ? "ia32" : arch}/msdos.exe`
  );
  const commandPath = context.asAbsolutePath("./emu/msdos_player/command.com");
  function player(
    msdosArgs: string[] = ["-e", "-d"],
    command: string = commandPath
  ) {
    const t = vscode.window.createTerminal({
      name: "msdos-player",
      shellPath: "cmd.exe",
      shellArgs: ["/C", msdosPath, ...msdosArgs, command],
    });
    return t;
  }

  let disposable = vscode.commands.registerCommand(
    "dosbox.openMsdosPlayer",
    () => {
      if (process.platform !== "win32") {
        throw new Error("msdos player can only run in win32 system");
      }
      player().show();
    }
  );

  context.subscriptions.push(disposable);

  return {
    msdosPath,
    commandPath,
    msdosPlayer: player,
  };
}
