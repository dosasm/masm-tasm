/**
 * Manage DOSBox's configuration file
 */
export class Conf {
  private _target: string[] = [];
  private eol = "\n";
  constructor(confStr: string = "") {
    if (confStr.includes("\r\n")) {
      this.eol = "\r\n";
    }
    this._target = confStr.split(this.eol);
    if (!Array.isArray(this._target)) {
      throw new Error("error target");
    }
  }

  /**check whether the config file has the item or not
   * @returns line number of the section or key
   */
  has(section: string, key?: string): number | undefined {
    let sectionIdx = this._target.findIndex((val) => {
      return val.trim().toLowerCase() === `[${section.trim().toLowerCase()}]`;
    });
    if (key === undefined && sectionIdx >= 0) {
      return sectionIdx;
    }
    for (let i = sectionIdx + 1; i < this._target.length; i++) {
      const line = this._target[i];
      if (typeof line !== "string") {
        continue;
      }
      if (line.trimLeft().startsWith("[")) {
        break;
      }
      const kv = line.replace(/#.*/g, "");
      const [_key, _value] = kv.split("=");
      if (key && key.trim().toLowerCase() === _key.trim().toLowerCase()) {
        return i;
      }
    }
    return undefined;
  }

  get(section: string, key: string) {
    const idx = this.has(section, key);
    if (idx !== undefined) {
      const [name, value] = this._target[idx]
        .replace(/#.*/g, "")
        .trim()
        .split("=");
      if (value) {
        return value.trim();
      }
    }
  }

  update(section: string, key: string, value: boolean | number | string) {
    let idx = this.has(section, key);
    if (idx !== undefined) {
      this._target[idx] = `${key} = ${value.toString()}`;
      return;
    }
    idx = this.has(section);
    if (idx !== undefined) {
      this._target.splice(idx + 1, 0, `${key}=${value}`);
      return;
    } else {
      this._target.push(`[${section}]`);
      this._target.push(`${key}=${value}`);
      return;
    }
  }

  updateAutoexec(context: string[]) {
    const section = "[autoexec]";
    const idx = this._target.findIndex((val) => val === section);
    if (idx >= 0) {
      for (let i = idx + 1; i < this._target.length; i++) {
        if (!this._target[i].trim().startsWith("#")) {
          this._target[i] = "#" + this._target[i];
        }
        if (this._target[i].trim().startsWith("[")) {
          break;
        }
      }
      this._target.splice(idx + 1, 0, ...context);
    } else {
      this._target.push("[autoexec]", ...context);
    }
  }
  toString() {
    return this._target.join(this.eol);
  }
}
