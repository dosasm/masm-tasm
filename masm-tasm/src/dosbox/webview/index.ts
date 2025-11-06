import * as load from "./loadJsdos";
import { loghtml } from "./util";
import { VscConnect } from "./connection";

declare const jsdosconfig: {
  bundlePath: string | undefined;
};

//auto load bundle when webview loaded
if (jsdosconfig.bundlePath) {
  loghtml("auto loading from " + jsdosconfig);
  load.start(jsdosconfig.bundlePath);
  loghtml("", false);
}

//load bundle from message
VscConnect.listen("start", async (message: any) => {
  console.log("===bundle received===");
  if (
    typeof message.bundlePath === "string" ||
    typeof message.bundle === "string"
  ) {
    const bundlePath =
      message.bundlePath === undefined ? message.bundle : message.bundlePath;
    loghtml("bundle url: " + bundlePath);
    load.start(message.bundlePath);
    loghtml("", false);
  } else {
    //since Uint8array is not works well in VSCode
    //try my best to make cold work will
    const _bundle = message.bundle;
    let bundleData: Uint8Array = Array.isArray(_bundle)
      ? Uint8Array.from(_bundle) //in nodejs env, the Uint8array is always received as an array {[id:number]:number}
      : Uint8Array.from(Object.values(_bundle)); //in browser env, always received as an Object {[id:string]:number}
    //some times received as an object with data
    if (bundleData.length === 0 && _bundle.data) {
      bundleData = Uint8Array.from(_bundle.data);
      loghtml("bundle type: " + _bundle.type);
    }
    loghtml("bundle Array received lenghth: " + bundleData.length);
    loghtml("", false);
    load.start(bundleData);
  }
});

loghtml("index.js loaded");
console.log("===loaded===");

VscConnect.post({
  command: "loaded",
});
