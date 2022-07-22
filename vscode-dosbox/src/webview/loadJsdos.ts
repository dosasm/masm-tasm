import { emulators } from "../emulators/emulators";
import { EmulatorsUi } from "emulators-ui";
import { CommandInterface } from "emulators";
import { onGetCi } from "./onGetCi";

declare const emulatorsUi: EmulatorsUi;
declare const jsdosconfig: {
  pathPrefix: string;
  bundlePath: string | undefined;
  lastBundle?: string | Uint8Array | undefined;
};

emulators.pathPrefix = jsdosconfig.pathPrefix;

let jsdosElement = document.getElementById("root");

type MyEmulatorFunction = "dosboxWorker" | "dosboxDirect";

export let emulatorFunction: MyEmulatorFunction = "dosboxWorker";
document.getElementById("emulatorFunction")?.addEventListener("input", (e) => {
  const func = (e.target as any).value as MyEmulatorFunction;
  emulatorFunction = func;
  const text = document.getElementById("show");
  if (text) {
    text.hidden = func !== "dosboxDirect";
  }
  if (jsdosconfig.lastBundle) {
    start(jsdosconfig.lastBundle);
  }
  if (jsdosElement) {
    const _canvas = jsdosElement.getElementsByClassName("emulator-canvas");
    _canvas[0].remove();
  }
  (e.target as any).blur();
});

async function fromUrl(bundle: string) {
  const ci = await emulatorsUi
    .dos(jsdosElement as HTMLDivElement, {
      emulatorFunction,
    })
    .run(bundle);
  return ci;
}

async function fromBundleData(bundleData: Uint8Array) {
  const layers = emulatorsUi.dom.layers(jsdosElement as HTMLDivElement);
  const ci = await emulators[emulatorFunction](bundleData);

  layers.hideLoadingLayer();
  emulatorsUi.graphics.webGl(layers, ci);
  emulatorsUi.controls.keyboard(layers, ci);
  emulatorsUi.controls.mouse(false, 1.0, layers, ci);

  emulatorsUi.sound.audioNode(ci);
  return ci;
}

export async function start(
  bundle: Uint8Array | string
): Promise<CommandInterface> {
  jsdosconfig.lastBundle = bundle;
  let ci;
  if (typeof bundle === "string") {
    ci = await fromUrl(bundle);
  } else {
    ci = await fromBundleData(bundle);
  }
  if (ci) {
    onGetCi(ci);
    return ci;
  } else {
    throw new Error("can't load from: " + bundle);
  }
}
