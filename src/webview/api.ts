export type Api = { postMessage: (val: unknown) => undefined }

declare const acquireVsCodeApi:
  | undefined
  | (() => Api);

export class VscodeApi {
  command_count = 0
  resolvers: Record<number, (result: any) => void> = {};
  constructor(public api: Api) {
    window.addEventListener("message", (msg) => {
      const data = msg.data;
      const uid = msg.data.uid;
      if (this.resolvers[uid]) {
        this.resolvers[uid](data.value)
      }
    })

  }

  static create(): VscodeApi | undefined {
    let api: Api | undefined = undefined;
    if (typeof acquireVsCodeApi === "function") {
      api = acquireVsCodeApi()
      return new VscodeApi(api)
    } else {
      return undefined
    }
  }

  exec(command: string, args: any[]): Promise<any> {
    let uid = ++this.command_count;
    this.api.postMessage({ command, args, uid })
    return new Promise(resolve => {
      this.resolvers[uid] = resolve
    })
  }
}