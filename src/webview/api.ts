import { CommandInterface, CommandInterfaceEvents, DosConfig, NetworkType} from "@xsro/emulators";
import { AsyncifyStats, FsNode } from "@xsro/emulators";

export type Api = { postMessage: (val: unknown) => undefined }

declare const acquireVsCodeApi:
  | undefined
  | (() => Api);

// Core type: wraps any type T in a Promise<T>
type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;

// Core mapped type: iterates over all properties of an interface, converting method return types to Promise
type PromisifyAllMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promisify<R> // Method: convert return type to Promise
    : Promise<T[K]>; // Non-method properties: wrap in Promise (async access via message passing)
};

export class VscodeApi implements PromisifyAllMethods<CommandInterface>{
  
  command_count = 0;
  resolvers: Record<number, {resolve:(result: unknown) => void,reject:(error: unknown) => void,}> = {};
  constructor(public api: Api) {
    window.addEventListener("message", (msg) => {
      const data = msg.data;
      const uid = msg.data.uid;
      if (this.resolvers[uid]) {
        if(data.error){
          this.resolvers[uid].resolve(data.error);
        }
        else if(data.value){
          this.resolvers[uid].resolve(data.value);
        }
      }
    });
  }
  async net(){
    return null;
  }

  get exited(): Promise<boolean> {
    return this._exec_ci_command<boolean>("exited", []);
  }

  getRunningProgram(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  
  config(): Promise<DosConfig> {
    return this._exec_ci_command<DosConfig>("config", []);
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
    return this._exec_ci_command<ImageData>("screenshot", []);
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
    return await this._exec_ci_command<void>("exit", []);
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

  async sendBackendEvent(event: unknown): Promise<void> {
    await this._exec_ci_command("sendBackendEvent", [event]);
  }
  
  async persist(onlyChanges?: boolean): Promise<Uint8Array |null> {
    const result=await this._exec_ci_command<Uint8Array | null>("persist",[onlyChanges]);
    return result;
  }
  
  events(): Promise<CommandInterfaceEvents> {
    throw new Error("Method not implemented.");
  }
  
  async networkConnect(networkType: NetworkType, address: string): Promise<void> {
    return await this._exec_ci_command<void>("networkConnect", [networkType, address]);
  }

  async networkDisconnect(networkType: NetworkType): Promise<void> {
    return await this._exec_ci_command<void>("networkDisconnect", [networkType]);
  }

  async asyncifyStats(): Promise<AsyncifyStats> {
    return await this._exec_ci_command<AsyncifyStats>("asyncifyStats", []);
  }

  async fsTree(): Promise<FsNode> {
    return await this._exec_ci_command<FsNode>("fsTree", []);
  }

  async fsReadFile(file: string): Promise<Uint8Array> {
    return await this._exec_ci_command<Uint8Array>("fsReadFile", [file]);
  }

  async fsWriteFile(file: string, contents: ReadableStream<Uint8Array> | Uint8Array): Promise<void> {
    return await this._exec_ci_command<void>("fsWriteFile", [file, contents]);
  }

  async fsDeleteFile(file: string): Promise<boolean> {
    return await this._exec_ci_command<boolean>("fsDeleteFile", [file]);
  }

  static create(): VscodeApi | undefined {
    let api: Api | undefined = undefined;
    if (typeof acquireVsCodeApi === "function") {
      api = acquireVsCodeApi();
      return new VscodeApi(api);
    } else {
      return undefined;
    }
  }

  exec<T = unknown>(command: string, args: unknown[]): Promise<T> {
    let uid = ++this.command_count;
    this.api.postMessage({ command, args, uid });
    return new Promise<T>((resolve,reject) => {
      this.resolvers[uid] = {
        resolve: (result: unknown) => resolve(result as T),
        reject: (error: unknown) => reject(error),
      };
    });
  }

  _exec_ci_command<T = unknown>(ciCommand: string, ciArgs: unknown[]): Promise<T> {
    let uid = ++this.command_count;
    this.api.postMessage({ command:"send-ci-command", ciArgs, uid,ciCommand });
    return new Promise<T>((resolve,reject) => {
      this.resolvers[uid] = {
        resolve: (result: unknown) => resolve(result as T),
        reject: (error: unknown) => reject(error),
      };
    });
  }
}