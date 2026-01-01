import { CommandInterface, utils } from "emulators";
import * as vscode from "vscode";

export function createTerminal(ci: CommandInterface) {
  const writeEmitter = new vscode.EventEmitter<string>();
  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open: () => {
      writeEmitter.fire(
        "Jsdos Terminal all changes after launch \x1b[31mwill not\x1b[0m be applied to this shell\r\n"
      );
      ci.events().onStdout((val) => {
        writeEmitter.fire(val);
      });
      ci.events().onExit(
        () => {
          writeEmitter.fire(
            "Jsdos Terminal \x1b[31m exited\x1b[0m \r\n"
          );
        }
      )
    },
    close: () => { },
    handleInput: (datas) => {
      console.log(datas)
      for (const data of datas.split("")) {
        if (data.charCodeAt(0) === 127) {
          // writeEmitter.fire("<backspace>");
          ci.simulateKeyPress(utils.Keys.KBD_backspace)
        } else if (data.charCodeAt(0) === 13) {
          const key = utils.Keys.KBD_enter;
          console.log(key)
          ci.simulateKeyPress(257)
        }
        else {
          const keys = utils.string2jsdosKey(data, true, false);
          console.log(keys)
          keys.forEach(k => ci.simulateKeyPress(...k));
        }
      }

    },
  };

  return vscode.window.createTerminal({ name: "Jsdos Terminal", pty });
}
