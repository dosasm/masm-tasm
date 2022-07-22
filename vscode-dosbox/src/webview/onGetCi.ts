import { CommandInterface } from "emulators";
import { JsdosShell } from "../jsdos-ci-shell/main";
import { VscConnect } from "./connection";
import { emulatorFunction } from "./loadJsdos";

export let ci: CommandInterface | null = null;

export function onGetCi(_ci: CommandInterface) {
  if (ci) {
    ci.pause();
    ci.exit();
  }
  ci = _ci;

  if (ci) {
    renderUi(ci);
    const shell = new JsdosShell(ci);
    shell.onStdout((value) => {
      VscConnect.post({
        command: "stdout",
        value,
      });
    });
    VscConnect.listen("stdin", (message: any) => shell.shell(message.value));
  }
}

const copyDosMemory = false;
function renderUi(ci: CommandInterface) {
  const soundElement = document.getElementById(
    "sound"
  ) as HTMLInputElement | null;
  if (soundElement) {
    soundElement.checked = true;
    soundElement.addEventListener("input", (e) => {
      if ((e.target as any).checked) {
        ci.unmute();
      } else {
        ci.mute();
      }
    });
  }

  document.getElementById("debug")?.addEventListener("input", (e) => {
    if (e.target && (e.target as any).checked) {
      //access memory
      //https://js-dos.com/v7/build/docs/dosbox-direct#accessing-memory
      ci.pause();
      const text = document.getElementById("show");
      if (emulatorFunction === "dosboxDirect") {
        (ci as any).transport.module._dumpMemory(copyDosMemory);
        const cts = (ci as any).transport.module.memoryContents;
        if (text) {
          text.innerHTML = JSON.stringify(cts, undefined, "\t");
        }
        VscConnect.post({ command: "memoryContents", value: cts });
      }
    } else {
      ci.resume();
    }
  });
}
