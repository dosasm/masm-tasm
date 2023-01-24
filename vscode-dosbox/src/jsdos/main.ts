import * as vscode from "vscode";
import { createBundle } from "../jsdos-bundle/bundle";
import { Jsdos } from "../jsdos/Jsdos";

const input = "Input your url";
const empty = "empty (only load jsdos)";

const webresources = [
  {
    name: "digger.com (jsdos demo)",
    url: "https://cdn.dos.zone/original/2X/2/24b00b14f118580763440ecaddcc948f8cb94f14.jsdos",
  },
];

export function activate(context: vscode.ExtensionContext) {
  const jsdos = new Jsdos(context);

  let disposable = vscode.commands.registerCommand(
    "dosbox.openJsdos",
    async (bundle?: vscode.Uri) => {
      if (bundle) {
        jsdos.setBundle(bundle);
        jsdos.runInWebview(undefined);
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
          jsdos.runInWebview(picked);
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
      const t = ci.terminal();
      t.show();
    }
  );

  context.subscriptions.push(disposable, disposable2);

  return { jsdos, createBundle };
}
