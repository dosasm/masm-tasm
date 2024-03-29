import * as adapted from "../emulators/main";
import { CommandInterface } from "emulators";
import * as vscode from "vscode";
import * as api from "../api";
import { Conf } from "../dosbox/conf";
import * as Jszip from "jszip";
import { createTerminal } from "./runInHost";
import { runInWebview } from "./runInWebview";
import { EmulatorFunction } from "emulators-ui/dist/types/js-dos";
import { logger } from "../util/logger";
import { JsdosShell } from "../jsdos-ci-shell/main";
import { isNode } from "browser-or-node";
import { loadWasmModule } from "./hooks";

const fs = vscode.workspace.fs;

export class Jsdos implements api.Jsdos {
  public set pathPrefix(pathPrefix: string) {
    adapted.emulators.pathPrefix = pathPrefix;
  }
  public conf: Conf = new Conf("");
  public jszip: Jszip = new Jszip();

  constructor(private context: vscode.ExtensionContext) {
    const dist = vscode.Uri.joinPath(context.extensionUri, "/dist/emulators/");
    this.pathPrefix = isNode ? dist.fsPath : dist.toString();

    //take over path resolve method for file in extension has different schema
    // - in Browser has a schema of http
    // - in Machine has a schema of file
    // adaptedEmulatorsImpl.pathResolver = function (filename: string) {
    //   const uri = vscode.Uri.joinPath(dist, filename);
    //   return dist.scheme === "file" ? uri.fsPath : uri.toString(true);
    // };

    //take over HTTP request for running as web extension
    const request: adapted.ReadContent = async function (
      url: string,
      options: any
    ): Promise<string | ArrayBuffer | undefined> {
      const uri = vscode.Uri.parse(url);
      const fileArr = await fs.readFile(uri);
      console.log(url, options);
      if (uri.path.includes(context.extensionUri.path)) {
        if (options.responseType === "arraybuffer") {
          return fileArr;
        }
        return new TextDecoder().decode(fileArr);
      }
      return undefined;
    };
    adapted.setReadContent(request);
    adapted.setLoadWasmModule(loadWasmModule);
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
  ): Promise<api.CI> {
    const ci = await this._runInHost(bundle, useWorker);
    const shell = new JsdosShell(ci as CommandInterface);
    (ci as api.CI).shell = shell;
    (ci as api.CI).terminal = () => createTerminal(shell);
    return ci as api.CI;
  }
  private async _runInHost(
    bundle?: vscode.Uri | null | undefined,
    useWorker?: boolean
  ): Promise<adapted.CommandInterface> {
    let func: EmulatorFunction = (process as any).browser
      ? "dosboxWorker"
      : "dosboxDirect";
    if (useWorker === true) {
      func = "dosboxWorker";
    } else if (useWorker === false) {
      func = "dosboxDirect";
    }
    if (bundle === undefined) {
      const bundleData = await this.getBundleData();
      const ci = await adapted.emulators[func](bundleData);
      return ci;
    } else if (bundle === null) {
      const bundleData = await new Jszip()
        .file(".jsdos/dosbox.conf", "")
        .generateAsync({ type: "uint8array" });
      return adapted.emulators[func](bundleData);
    } else if (bundle.scheme === "file") {
      const bundleData = await fs.readFile(bundle);
      return adapted.emulators[func](bundleData);
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
