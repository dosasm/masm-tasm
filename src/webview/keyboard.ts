// modified from https://github.com/caiiiycuk/js-dos/blob/b3e751cd8c77502b936a867426b6306f12fc7ace/src/window/dos/controls/keyboard.ts

import { VscodeApi } from "./api";
import { domToKeyCode } from "./keys";

export function bindKeyboardMouse(ci: VscodeApi,el:HTMLCanvasElement) {
    const pressedKeys = new Set<number>();

    function releaseKeys() {
        pressedKeys.forEach((keyCode) => {
            ci.sendKeyEvent(keyCode, false);
        });
        pressedKeys.clear();
    }

    function onKeyDown(e: KeyboardEvent) {
        if ((e.target as any).type === "text") {
            return;
        }

        const keyCode = domToKeyCode(e.keyCode, e.location);
        ci.sendKeyEvent(keyCode, true);
        pressedKeys.add(keyCode);
        e.stopPropagation();
        e.preventDefault();
    }

    function onKeyUp(e: KeyboardEvent) {
        if ((e.target as any).type === "text") {
            return;
        }
        const keyCode = domToKeyCode(e.keyCode, e.location);
        ci.sendKeyEvent(keyCode, false);
        pressedKeys.delete(keyCode);
        e.stopPropagation();
        e.preventDefault();
    }

    function onBlur() {
        releaseKeys();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    // el.addEventListener("blur", onBlur);

    return () => {
        releaseKeys();
        el.removeEventListener("keydown", onKeyDown);
        el.removeEventListener("keyup", onKeyUp);
        el.removeEventListener("blur", onBlur);
    };
}
