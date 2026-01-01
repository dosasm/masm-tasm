import * as vscode from "vscode";
import { createBundle } from "./utils/bundle";
export{ createBundle } from "./utils/bundle";
export { createTerminal } from "./utils/terminal";
import { Jsdos } from "../jsdos/Jsdos";
export { Jsdos } from "../jsdos/Jsdos";

const input = "Input your url";
const empty = "empty (only load jsdos)";

const webresources = [
  {
    name: "digger.com (jsdos demo)",
    url: "https://doszone-uploads.s3.dualstack.eu-central-1.amazonaws.com/original/2X/2/24b00b14f118580763440ecaddcc948f8cb94f14.jsdos",
  },
];

export function activateJSdos(context: vscode.ExtensionContext) {
  const jsdos = new Jsdos(context);

  let disposable = vscode.commands.registerCommand(
    "dosbox.openJsdos",
    async (bundle?: vscode.Uri) => {
      if (bundle) {
        jsdos.setBundle(bundle);
        jsdos.runInHost(undefined);
      } else {
        const items = webresources.map((val) => val.name);
        items.unshift(input, empty);
        const pickedName = await vscode.window.showQuickPick(items);
        let picked: vscode.Uri | null | undefined = undefined;
        if (pickedName === empty) {
          picked = null;
        } else if (pickedName === input) {
          const _uri = await vscode.window.showInputBox({ placeHolder: input });
          if (_uri) {
            picked = vscode.Uri.parse(_uri);
          }
        } else {
          const res = webresources.find((val) => val.name === pickedName);
          if (res) {
            picked = vscode.Uri.parse(res.url);
          }
        }
        if (picked !== undefined) {
          jsdos.runInHost(picked);
        }
      }
    }
  );

  let disposable2 = vscode.commands.registerCommand(
    "dosbox.startJsdos",
    async (_bundle?: vscode.Uri) => {
      let bundle: vscode.Uri | null | undefined = _bundle;
      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders[0]
      ) {
        const workspaceBundle = await createBundle({
          mount: [
            {
              dir: vscode.workspace.workspaceFolders[0].uri,
              disk: "d",
            },
          ],
        }).catch(console.warn);
        if (workspaceBundle) {
          jsdos.jszip = workspaceBundle;
          jsdos.updateAutoexec(["@mount c .", "@mount d ./d", "d:"]);
          bundle = undefined;
        }
      }
      const ci = await jsdos.runInHost(bundle);
    }
  );

  context.subscriptions.push(disposable, disposable2);

  return jsdos;
}
