import { CommandInterface,utils } from "emulators";
import * as vscode from "vscode";

export function createTerminal(ci:CommandInterface) {
  const writeEmitter = new vscode.EventEmitter<string>();

  let command="";
  const shell=new utils.Shell(ci);
  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open: () => {
      writeEmitter.fire(
        "Jsdos Terminal all changes after launch \x1b[31mwill not\x1b[0m be applied to this shell\r\n"
      );
      ci.events().onStdout((val) => {
        writeEmitter.fire(val);
      });
    },
    close: () => {},
    handleInput: (data) => {
      if (data.charCodeAt(0) === 127) {
        writeEmitter.fire("<backspace>");
      } else {
        writeEmitter.fire(data);
      }
      const keys=utils.string2jsdosKey(data);
      keys.forEach(k=>ci.simulateKeyPress(...k));
    },
  };

  return vscode.window.createTerminal({ name: "Jsdos Terminal", pty });
}
