import * as adapted from "emulators";
import * as vscode from "vscode";
import * as api from "../api";
import { Conf } from "../dosbox/conf";
import * as Jszip from "jszip";
import { createTerminal } from "./runInHost";
import { runInWebview } from "./runInWebview";
import { isNode } from "browser-or-node";
import { loadWasmModule } from "./hooks";

const fs = vscode.workspace.fs;

export class Jsdos implements api.Jsdos {
  emulators:adapted.Emulators|undefined
  public set pathPrefix(pathPrefix: string) {
    this.emulators=adapted.getEmulators(pathPrefix)
  }
  public conf: Conf = new Conf("");
  public jszip: Jszip = new Jszip();

  constructor(private context: vscode.ExtensionContext) {
    const dist = vscode.Uri.joinPath(context.extensionUri, "/dist/emulators/");
    this.pathPrefix = isNode ? dist.fsPath : dist.toString();

    const oldhttp=adapted.platform.current.httpRequest
    adapted.platform.current.httpRequest=function (url: string, options: adapted.XhrOptions) {
      return oldhttp(url,options)
    }
  }

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

  public async runInHost(
    bundle?: vscode.Uri | null | undefined,
    useWorker?: boolean
  ): Promise<adapted.CommandInterface> {
    const ci = await this._runInHost(bundle, useWorker);
    const shell = new adapted.utils.Shell(ci);
    return ci;
  }
  private async _runInHost(
    bundle?: vscode.Uri | null | undefined,
    useWorker?: boolean
  ): Promise<adapted.CommandInterface> {
    if (typeof this.emulators ==="undefined"){
      throw new Error("emulators not initialized")
    }
    let func:keyof adapted.Emulators = (process as any).browser
      ? "dosboxWorker"
      : "dosboxDirect";
    if (useWorker === true) {
      func = "dosboxWorker";
    } else if (useWorker === false) {
      func = "dosboxDirect";
    }

    if (bundle === undefined) {
      const bundleData = await this.getBundleData();
      const ci = await this.emulators[func](bundleData);
      return ci;
    } else if (bundle === null) {
      const bundleData = await new Jszip()
        .file(".jsdos/dosbox.conf", "")
        .generateAsync({ type: "uint8array" });
      return this.emulators[func](bundleData);
    } else if (bundle.scheme === "file") {
      const bundleData = await fs.readFile(bundle);
      return this.emulators[func](bundleData);
    }
    throw new Error(
      "bundle uri is not a uri with schema file or undefined/null"
    );
  }

  async runInWebview(
    bundle?: vscode.Uri | null | undefined
  ): Promise<vscode.Webview> {
    const panel = await this.runInWebviewPanel(bundle);
    return panel.webview;
  }
  async runInWebviewPanel(
    bundle?: vscode.Uri | null | undefined
  ): Promise<vscode.WebviewPanel> {
    if (bundle === undefined) {
      const bundleData = await this.getBundleData();
      return runInWebview(this.context, bundleData);
    } else if (bundle === null) {
      const bundleData = await new Jszip()
        .file(".jsdos/dosbox.conf", "")
        .generateAsync({ type: "uint8array" });
      return runInWebview(this.context, bundleData);
    } else if (bundle.scheme === "file") {
      const bundleData = await fs.readFile(bundle);
      return runInWebview(this.context, bundleData);
    } else if (bundle.scheme === "http" || bundle.scheme === "https") {
      return runInWebview(this.context, bundle.toString());
    }
    throw new Error(
      "bundle uri is not a uri with schema file/http/https or undefined/null"
    );
  }
}
