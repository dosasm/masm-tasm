import * as adapted from "emulators";
import * as vscode from "vscode";
import { Conf } from "../dosbox/conf";
import * as Jszip from "jszip";
import { isNode} from "browser-or-node";
import { createTerminal } from "./utils/terminal";

export const fs = vscode.workspace.fs;


export class Jsdos {
  emulators: adapted.Emulators;
  public set pathPrefix(pathPrefix: string) {
    this.emulators = adapted.getEmulators(pathPrefix);
  }
  public conf: Conf = new Conf("");
  public jszip: Jszip = new Jszip();

  constructor(private context: vscode.ExtensionContext) {
    const dist = vscode.Uri.joinPath(context.extensionUri, "resources/node_modules/emulators/build/wasm/");
    this.pathPrefix = isNode ? dist.fsPath : dist.toString();
    this.emulators = adapted.getEmulators(this.pathPrefix)
  }



  createTerminal = createTerminal;

  async setBundle(
    bundle: vscode.Uri | Uint8Array,
    updateConf?: boolean
  ): Promise<void> {
    if ((bundle as vscode.Uri).fsPath) {
      const data = await fs.readFile(bundle as vscode.Uri);
      await this.jszip.loadAsync(data);
    } else {
      const data = new Uint8Array(bundle as Uint8Array);
      await this.jszip.loadAsync(data);
    }

    if (updateConf) {
      const text = await this.jszip.file(".jsdos/dosbox.conf")?.async("string");
      if (text) {
        this.conf = new Conf(text);
      }
    }
  }

  updateConf(
    section: string,
    key: string,
    value: string | number | boolean
  ): boolean {
    const r = this.conf.update(section, key, value);
    return Boolean(r);
  }

  updateAutoexec(context: string[]): void {
    this.conf.updateAutoexec(context);
  }

  run = this.runInHost;

  async getBundleData(): Promise<Uint8Array> {
    const s = this.jszip.file(".jsdos/dosbox.conf", this.conf.toString());
    const bundleData = await this.jszip.generateAsync({ type: "uint8array" });
    return bundleData;
  }

  public async runInHost(useX:boolean,
    bundle?: vscode.Uri | null | undefined,
  ): Promise<adapted.CommandInterface> {

    let func=this.emulators.dosboxWorker;
    if(useX){
      func=this.emulators.dosboxXWorker;
    }

    if (bundle === undefined) {
      const bundleData = await this.getBundleData();
      const ci = await func(bundleData);
      return ci;
    } else if (bundle === null) {
      const bundleData = await new Jszip()
        .file(".jsdos/dosbox.conf", "")
        .generateAsync({ type: "uint8array" });
      return await func(bundleData);
    } else if (bundle.scheme === "file") {
      const bundleData = await fs.readFile(bundle);
      return await func(bundleData);
    }
    throw new Error(
      "bundle uri is not a uri with schema file or undefined/null"
    );
  }
}
