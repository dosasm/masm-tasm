import { CommandInterface, CommandInterfaceEvents, DosConfig, NetworkType, PersistedSockdrives } from "emulators";
import { AsyncifyStats, FsNode } from "emulators/build/src/protocol/protocol";

export type Api = { postMessage: (val: unknown) => undefined }

declare const acquireVsCodeApi:
  | undefined
  | (() => Api);

// 核心类型：把任意类型 T 包装成 Promise<T>
type Promisify<T> = T extends Promise<any> ? T : Promise<T>;

// 核心映射类型：遍历接口的所有属性，将方法的返回值转为 Promise
type PromisifyAllMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promisify<R> // 方法：返回值转 Promise
    : T[K]; // 非方法属性：保持原类型
};

export class VscodeApi implements PromisifyAllMethods<CommandInterface>{
  command_count = 0
  resolvers: Record<number, {resolve:(result: any) => void,reject:(error: any) => void,}> = {};
  constructor(public api: Api) {
    window.addEventListener("message", (msg) => {
      const data = msg.data;
      const uid = msg.data.uid;
      if (this.resolvers[uid]) {
        if(data.error){
          this.resolvers[uid].resolve(data.error)
        }
        else if(data.value){
          this.resolvers[uid].resolve(data.value)
        }
      }
    })
  }
  
  config(): Promise<DosConfig> {
    return this._exec_ci_command("config", []);
  }

  async height(): Promise<number> {
    const result = await this._exec_ci_command("height", []);
    return result as number;
  }

  async width(): Promise<number> {
    const result = await this._exec_ci_command("width", []);
    return result as number;
  }

  async soundFrequency(): Promise<number> {
    const result = await this._exec_ci_command("soundFrequency", []);
    return result as number;
  }

  screenshot(): Promise<ImageData> {
    return this._exec_ci_command("screenshot", []);
  }

  async pause(): Promise<void> {
    await this._exec_ci_command("pause", []);
  }

  async resume(): Promise<void> {
    await this._exec_ci_command("resume", []);
  }

  async mute(): Promise<void> {
    await this._exec_ci_command("mute", []);
  }

  async unmute(): Promise<void> {
    await this._exec_ci_command("unmute", []);
  }

  async exit(): Promise<void> {
    return await this._exec_ci_command("exit", []);
  }

  async simulateKeyPress(...keyCodes: number[]): Promise<void> {
    await this._exec_ci_command("simulateKeyPress", keyCodes);
  }

  async sendKeyEvent(keyCode: number, pressed: boolean): Promise<void> {
    await this._exec_ci_command("sendKeyEvent", [keyCode, pressed]);
  }

  async sendMouseMotion(x: number, y: number): Promise<void> {
    await this._exec_ci_command("sendMouseMotion", [x, y]);
  }

  async sendMouseRelativeMotion(x: number, y: number): Promise<void> {
    await this._exec_ci_command("sendMouseRelativeMotion", [x, y]);
  }

  async sendMouseButton(button: number, pressed: boolean): Promise<void> {
    await this._exec_ci_command("sendMouseButton", [button, pressed]);
  }

  async sendMouseSync(): Promise<void> {
    await this._exec_ci_command("sendMouseSync", []);
  }

  async sendBackendEvent(event: any): Promise<void> {
    await this._exec_ci_command("sendBackendEvent", [event]);
  }
  
  async persist(onlyChanges?: boolean): Promise<Uint8Array | PersistedSockdrives | null> {
    const result=await this._exec_ci_command("persist",[onlyChanges])
    return result
  }
  
  events(): Promise<CommandInterfaceEvents> {
    throw new Error("Method not implemented.");
  }
  
  async networkConnect(networkType: NetworkType, address: string): Promise<void> {
    return await this._exec_ci_command("networkConnect", [networkType, address]);
  }

  async networkDisconnect(networkType: NetworkType): Promise<void> {
    return await this._exec_ci_command("networkDisconnect", [networkType]);
  }

  async asyncifyStats(): Promise<AsyncifyStats> {
    return await this._exec_ci_command("asyncifyStats", []);
  }

  async fsTree(): Promise<FsNode> {
    return await this._exec_ci_command("fsTree", []);
  }

  async fsReadFile(file: string): Promise<Uint8Array> {
    return await this._exec_ci_command("fsReadFile", [file]);
  }

  async fsWriteFile(file: string, contents: ReadableStream<Uint8Array> | Uint8Array): Promise<void> {
    return await this._exec_ci_command("fsWriteFile", [file, contents]);
  }

  async fsDeleteFile(file: string): Promise<boolean> {
    return await this._exec_ci_command("fsDeleteFile", [file]);
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
    return new Promise((resolve,reject) => {
      this.resolvers[uid] = {resolve,reject}
    })
  }

  _exec_ci_command(ciCommand: string, ciArgs: any[]): Promise<any> {
    let uid = ++this.command_count;
    this.api.postMessage({ command:"send-ci-command", ciArgs, uid,ciCommand })
    return new Promise((resolve,reject) => {
      this.resolvers[uid] = {resolve,reject}
    })
  }
}