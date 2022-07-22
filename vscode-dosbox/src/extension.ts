import * as vscode from "vscode";
import * as dosbox from "./dosbox/main";
import * as player from "./msdos-player/main";
import * as jsdos from "./jsdos/main";
import * as adapted  from "./emulators/main";
export { API } from "./api";
import * as D from "./api";
import { logger } from "./util/logger";

export async function activate(
  context: vscode.ExtensionContext
): Promise<D.API> {
  console.log("run in nonweb mode:" + context.extensionMode.toString());
  logger.logExtensionInfo(context);

  const api = {
    ...(await dosbox.activate(context)),
    ...player.activate(context),
    ...jsdos.activate(context),
    emulators:adapted.emulators,
  };

  return api;
}

export function deactivate() {}
