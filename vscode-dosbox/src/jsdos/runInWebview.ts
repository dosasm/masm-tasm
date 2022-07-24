import * as vscode from "vscode";
import { logger } from "../util/logger";

export function runInWebview(
  context: vscode.ExtensionContext,
  bundle: Uint8Array | string
): vscode.WebviewPanel {
  const viewColumn: vscode.ViewColumn | undefined = vscode.workspace
    .getConfiguration("vscode-dosbox")
    .get("jsdosWeb.viewColumn");
  const panel = vscode.window.createWebviewPanel(
    "jsdos pannel",
    "jsdos" + new Date().toLocaleTimeString(),
    viewColumn ?? vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      //hint: the below settings should be folder's uri
      localResourceRoots: [
        vscode.Uri.joinPath(
          context.extensionUri,
          "node_modules/emulators/dist"
        ),
        vscode.Uri.joinPath(
          context.extensionUri,
          "node_modules/emulators-ui/dist"
        ),
        vscode.Uri.joinPath(context.extensionUri, "dist"),
        vscode.Uri.joinPath(context.extensionUri, "src"),
      ],
    }
  );

  const asWeb = (str: string): string => {
    const fullpath = vscode.Uri.joinPath(context.extensionUri, str);
    const uri = panel.webview.asWebviewUri(fullpath);
    const link = uri.toString(true);
    return link;
  };

  const prefix="/dist/emulators/";
  const jsdosScript = (process as any).browser
    ? {
        emu: "https://js-dos.com/v7/build/releases/latest/emulators/emulators.js",
        emuDist: "https://js-dos.com/v7/build/releases/latest/js-dos/",
        ui: "https://js-dos.com/v7/build/releases/latest/emulators-ui/emulators-ui.js",
        uiCss:
          "https://js-dos.com/v7/build/releases/latest/emulators-ui/emulators-ui.css",
      }
    : {
        emu: asWeb(prefix+"emulators.js"),
        emuDist: asWeb(prefix+""),
        ui: asWeb(prefix+"emulators-ui.js"),
        uiCss: asWeb(prefix+"/emulators-ui.css"),
      };

  panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        html,
        body,
        #jsdos {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
        }
    </style>
    <script src="${jsdosScript.ui}"></script>
    <link rel="stylesheet" href="${jsdosScript.uiCss}">
</head>
    
<body>
<input type="checkbox" id="debug">pause</input>
<input type="checkbox" id="sound">sound</input>
<select id="emulatorFunction">
    <option value="dosboxWorker">Worker</option>
    <option value="dosboxDirect">Direct</option>
</select>
<div class="layout">
    <div id="root" style="width: 100%; height: 100%;"></div>
</div>
<script>
    window.jsdosconfig = {
        pathPrefix: "${jsdosScript.emuDist}",
        bundlePath: undefined
    }
</script>
<p id='loadingInfo'>loading</p>

<textarea id="show"></textarea>
    <script src='${asWeb("dist/index.js")}'></script>
</body>
</html>`;

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    (message) => {
      const { command, value } = message;
      switch (command) {
        case "loaded":
          const bundlePath = typeof bundle === "string" ? bundle : undefined;
          panel.webview.postMessage({
            command: "start",
            bundle,
            bundlePath,
          });
          return;
        case "memoryContents":
          let str = "\n";
          for (const key in value) {
            if (typeof value[key] === "object") {
              str += key + ":\t" + JSON.stringify(value[key]) + "\n";
            } else {
              str = key + ":" + value[key] + "\t" + str;
            }
          }
          logger
            .channel("[debug]" + new Date().toLocaleTimeString() + "\n" + str)
            .show();
      }
    },
    undefined,
    context.subscriptions
  );

  return panel;
}
