import { loghtml } from "./util";

declare const acquireVsCodeApi:
  | undefined
  | (() => { postMessage: (val: unknown) => undefined });

let postMessage = (val: unknown) => console.log(val);

if (acquireVsCodeApi) {
  const vscode = acquireVsCodeApi();
  postMessage = vscode.postMessage;
}

function listenMessage(command: string, listener: (message: unknown) => any) {
  // Handle the message inside the webview
  window.addEventListener("message", async (event) => {
    const message = event.data; // The JSON data our extension sent
    loghtml(message.command);
    if (message.command === command) {
      await listener(message);
    }
  });
}

export class VscConnect {
  static post = postMessage;
  static listen = listenMessage;
}
