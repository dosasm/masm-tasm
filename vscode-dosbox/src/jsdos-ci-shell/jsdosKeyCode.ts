/**
 * Map strings to jsdos emulators keyCode
 *
 * see discussion in
 *
 * - https://github.com/caiiiycuk/js-dos/issues/120
 * - https://github.com/caiiiycuk/js-dos/issues/141
 */

import { EmulatorKeyCode } from "./jsdosKey";

export type KeyInfo = [string, ...EmulatorKeyCode[]];

const charKeyCodeMap: Map<string, EmulatorKeyCode | EmulatorKeyCode[]> =
  new Map();
charKeyCodeMap.set("0", EmulatorKeyCode.KBD_0);
charKeyCodeMap.set("1", EmulatorKeyCode.KBD_1);
charKeyCodeMap.set("2", EmulatorKeyCode.KBD_2);
charKeyCodeMap.set("3", EmulatorKeyCode.KBD_3);
charKeyCodeMap.set("4", EmulatorKeyCode.KBD_4);
charKeyCodeMap.set("5", EmulatorKeyCode.KBD_5);
charKeyCodeMap.set("6", EmulatorKeyCode.KBD_6);
charKeyCodeMap.set("7", EmulatorKeyCode.KBD_7);
charKeyCodeMap.set("8", EmulatorKeyCode.KBD_8);
charKeyCodeMap.set("9", EmulatorKeyCode.KBD_9);
charKeyCodeMap.set("a", EmulatorKeyCode.KBD_a);
charKeyCodeMap.set("b", EmulatorKeyCode.KBD_b);
charKeyCodeMap.set("c", EmulatorKeyCode.KBD_c);
charKeyCodeMap.set("d", EmulatorKeyCode.KBD_d);
charKeyCodeMap.set("e", EmulatorKeyCode.KBD_e);
charKeyCodeMap.set("f", EmulatorKeyCode.KBD_f);
charKeyCodeMap.set("g", EmulatorKeyCode.KBD_g);
charKeyCodeMap.set("h", EmulatorKeyCode.KBD_h);
charKeyCodeMap.set("i", EmulatorKeyCode.KBD_i);
charKeyCodeMap.set("j", EmulatorKeyCode.KBD_j);
charKeyCodeMap.set("k", EmulatorKeyCode.KBD_k);
charKeyCodeMap.set("l", EmulatorKeyCode.KBD_l);
charKeyCodeMap.set("m", EmulatorKeyCode.KBD_m);
charKeyCodeMap.set("n", EmulatorKeyCode.KBD_n);
charKeyCodeMap.set("o", EmulatorKeyCode.KBD_o);
charKeyCodeMap.set("p", EmulatorKeyCode.KBD_p);
charKeyCodeMap.set("q", EmulatorKeyCode.KBD_q);
charKeyCodeMap.set("r", EmulatorKeyCode.KBD_r);
charKeyCodeMap.set("s", EmulatorKeyCode.KBD_s);
charKeyCodeMap.set("t", EmulatorKeyCode.KBD_t);
charKeyCodeMap.set("u", EmulatorKeyCode.KBD_u);
charKeyCodeMap.set("v", EmulatorKeyCode.KBD_v);
charKeyCodeMap.set("w", EmulatorKeyCode.KBD_w);
charKeyCodeMap.set("x", EmulatorKeyCode.KBD_x);
charKeyCodeMap.set("y", EmulatorKeyCode.KBD_y);
charKeyCodeMap.set("z", EmulatorKeyCode.KBD_z);
charKeyCodeMap.set("\t", EmulatorKeyCode.KBD_tab);
charKeyCodeMap.set("\r", EmulatorKeyCode.KBD_enter);
charKeyCodeMap.set(" ", EmulatorKeyCode.KBD_space);
charKeyCodeMap.set("-", EmulatorKeyCode.KBD_minus);
charKeyCodeMap.set("=", EmulatorKeyCode.KBD_equals);
charKeyCodeMap.set("\\", EmulatorKeyCode.KBD_backslash);
charKeyCodeMap.set("[", EmulatorKeyCode.KBD_leftbracket);
charKeyCodeMap.set("]", EmulatorKeyCode.KBD_rightbracket);
charKeyCodeMap.set(";", EmulatorKeyCode.KBD_semicolon);
charKeyCodeMap.set(":", [
  EmulatorKeyCode.KBD_semicolon,
  EmulatorKeyCode.KBD_leftshift,
]);
charKeyCodeMap.set("'", EmulatorKeyCode.KBD_quote);
charKeyCodeMap.set(".", EmulatorKeyCode.KBD_period);
charKeyCodeMap.set(",", EmulatorKeyCode.KBD_comma);
charKeyCodeMap.set("/", EmulatorKeyCode.KBD_slash);
charKeyCodeMap.set(String.fromCharCode(127), EmulatorKeyCode.KBD_backspace);

export enum KeyPressType {
  pressup,
  pressdown,
  press,
}

export class KeyPress {
  type: KeyPressType = KeyPressType.press;
  constructor(public keyCode: number, type?: KeyPressType) {
    if (type) {
      this.type = type;
    }
  }
}

function char2code(char: string, ignoreCase = true): KeyPress[] {
  const output: KeyPress[] = [];
  if (char.length > 1) {
    throw new Error("char should be string with length 1");
  }
  const key = ignoreCase ? char.toLowerCase() : char;
  const val = charKeyCodeMap.get(key);
  if (Array.isArray(val)) {
    for (const keyCode of val) {
      output.unshift(new KeyPress(keyCode, KeyPressType.pressdown));
      output.push(new KeyPress(keyCode, KeyPressType.pressup));
    }
  } else if (val) {
    output.push(new KeyPress(val));
  }
  return output;
}

/**map char to js-dos keyCode [link](https://github.com/caiiiycuk/js-dos/issues/120) */
export default function str2code(str: string) {
  const output: KeyPress[] = [];
  for (const char of str.split("")) {
    const code = char2code(char);
    if (code) {
      output.push(...code);
    }
  }
  return output;
}
