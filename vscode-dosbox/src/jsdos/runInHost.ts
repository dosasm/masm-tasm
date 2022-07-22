export { emulators } from "../emulators/emulators";
import * as vscode from "vscode";
import { JsdosShell } from "../jsdos-ci-shell/main";

export function createTerminal(shell: JsdosShell) {
  const writeEmitter = new vscode.EventEmitter<string>();
  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open: () => {
      writeEmitter.fire(
        "Jsdos Terminal all changes after launch \x1b[31mwill not\x1b[0m be applied to this shell\r\n"
      );
      shell.onStdout((val) => {
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
      shell.shell(data);
    },
  };

  return vscode.window.createTerminal({ name: "Jsdos Terminal", pty });
}
