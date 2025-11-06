import { CommandInterface } from "emulators";
import str2code, { KeyPress, KeyPressType } from "./jsdosKeyCode";

export class JsdosShell {
  /**manage the queue of key events */
  private codes: KeyPress[] = [];
  constructor(private ci: CommandInterface) {
    setInterval(() => {
      if (this.ci && this.codes.length > 0) {
        const key = this.codes.shift();
        if (key) {
          if (key.type === KeyPressType.press) {
            this.ci.simulateKeyPress(key.keyCode);
          }
          if (key.type === KeyPressType.pressdown) {
            this.ci.sendKeyEvent(key.keyCode, true);
          }
          if (key.type === KeyPressType.pressup) {
            this.ci.sendKeyEvent(key.keyCode, false);
          }
        }
      }
    }, 60);
  }
  public onStdout = this.ci.events().onStdout;
  /**exec shell command in jsdos */
  public shell(cmd: string): void {
    const codes = str2code(cmd);
    if (cmd.trim().toLowerCase() === "exit") {
      console.warn(
        "===EXIT cmd detected: run `ci.exit()` instead of sending this to dosbox==="
      );
      this.ci.exit();
    }
    this.codes.push(...codes);
  }
}
