import * as vscode from "vscode";
import * as db from "./dosbox";
import * as cp from "child_process";
import { Conf } from "./conf";
import { logger } from "../util/logger";
import * as nodefs from "fs";

const fs = vscode.workspace.fs;

function updateDosboxConf(box: db.DOSBox, confSting: string) {
  const settings = vscode.workspace.getConfiguration("vscode-dosbox");
  const dosboxConf: { [id: string]: string } | undefined =
    settings.get(confSting);
  if (dosboxConf) {
    for (const id in dosboxConf) {
      const [section, key] = id.toLowerCase().split(".");
      const value = dosboxConf[id];
      box.updateConf(section, key, value);
    }
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const dosboxConfigurationFile = {
    box: vscode.Uri.joinPath(
      context.extensionUri,
      "emu/dosbox/dosbox-0.74.conf"
    ),
    boxX: vscode.Uri.joinPath(
      context.extensionUri,
      "emu/dosbox_x/dosbox-x.reference.full.conf"
    ),
    boxXzh: vscode.Uri.joinPath(
      context.extensionUri,
      "emu/dosbox_x/zh-CN/dosbox-x.conf"
    ),
  };

  const text = await fs.readFile(dosboxConfigurationFile.boxX);
  const conf = new Conf(text.toString());
  conf.update("sdl", "output", "ttf");
  conf.update("log", "logfile", "dosbox-x_zh.log");
  conf.update("config", "country", "86,936");
  conf.update(
    "ttf",
    "font",
    context.asAbsolutePath("emu/dosbox_x/zh-CN/simkai.ttf")
  );
  conf.update(
    "dosbox",
    "language",
    context.asAbsolutePath("emu/dosbox_x/zh-CN/zh_CN.lng")
  );
  conf.update("dosbox", "working directory option", "noprompt");
  const newText = new TextEncoder().encode(conf.toString());
  await fs.writeFile(dosboxConfigurationFile.boxXzh, newText);

  const _cmd: string | undefined = vscode.workspace
    .getConfiguration("vscode-dosbox")
    .get("command.dosbox");
  const cmd = _cmd ? _cmd : "dosbox";
  const confpath = vscode.Uri.joinPath(context.globalStorageUri, "dosbox.conf");
  const cwd =
    process.platform === "win32"
      ? context.asAbsolutePath("emu/dosbox/win")
      : undefined;
  const dosbox = new db.DOSBox(cmd, confpath, cwd);

  await dosbox.setConf(dosboxConfigurationFile.box);

  const _xcmd: string | undefined = vscode.workspace
    .getConfiguration("vscode-dosbox")
    .get("command.dosboxX");
  const xcmd = _xcmd ? _xcmd : "dosbox-x";
  const xconfpath = vscode.Uri.joinPath(
    context.globalStorageUri,
    "dosbox-x.conf"
  );
  const xcwd =
    process.platform === "win32"
      ? context.asAbsolutePath(
          "emu/dosbox_x/" + process.platform + "-" + process.arch
        )
      : undefined;
  const dosboxX = new db.DOSBox(xcmd, xconfpath, xcwd);

  let confPath = dosboxConfigurationFile.boxX;
  const _lang: string | undefined = vscode.workspace
    .getConfiguration("vscode-dosbox")
    .get("dosboxX.lang");
  const lang = _lang === "follow" ? vscode.env.language : _lang;
  switch (lang) {
    case "zh-cn":
      confPath = dosboxConfigurationFile.boxXzh;
  }
  await dosboxX.setConf(confPath);
  nodefs.mkdirSync(context.logUri.fsPath,{recursive:true});
  const dosboxXlog = vscode.Uri.joinPath(context.logUri, "dosbox-x.log");
  dosboxX.updateConf("log", "logfile", dosboxXlog.fsPath);
  logger.channel("dosbox-x log at: " + dosboxXlog.fsPath + "\n");

  updateDosboxConf(dosbox, "dosbox.config");
  updateDosboxConf(dosboxX, "dosboxX.config");
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("vscode-dosbox.dosbox.config")) {
      updateDosboxConf(dosbox, "dosbox.config");
    }
    if (e.affectsConfiguration("vscode-dosbox.dosboxX.config")) {
      updateDosboxConf(dosboxX, "dosboxX.config");
    }
  });

  let disposable1 = vscode.commands.registerCommand(
    "dosbox.openDosbox",
    (params?: string[], cpHandler?: (p: cp.ChildProcess) => void) => {
      return dosbox.run(params, cpHandler);
    }
  );
  let disposable2 = vscode.commands.registerCommand(
    "dosbox.openDosboxX",
    (params?: string[], cpHandler?: (p: cp.ChildProcess) => void) => {
      return dosboxX.run(params, cpHandler);
    }
  );

  context.subscriptions.push(disposable1, disposable2);

  return {
    dosboxConfigurationFile,
    dosbox,
    dosboxX,
  };
}
