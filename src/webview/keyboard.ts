// modified from https://github.com/caiiiycuk/js-dos/blob/b3e751cd8c77502b936a867426b6306f12fc7ace/src/window/dos/controls/keyboard.ts

import { VscodeApi } from "./api";
import * as keys from "./keys";


export function bindKeyboard(ci: VscodeApi,el:HTMLCanvasElement) {

    const pressedKeys = new Set<number>();

    el.addEventListener('click', () => {
            el.focus();
        });

    function releaseKeys() {
        pressedKeys.forEach((keyCode) => {
            ci.sendKeyEvent(keyCode, false);
        });
        pressedKeys.clear();
    }

    function onKeyDown(e: KeyboardEvent) {
        e.stopPropagation();
        e.preventDefault();
        if ((e.target as any).type === "text") {
            return;
        }

        const keyCode = keys.domToKeyCode(e.keyCode, e.location);
        ci.sendKeyEvent(keyCode, true);
        pressedKeys.add(keyCode);
        
    }

    function onKeyUp(e: KeyboardEvent) {
        e.stopPropagation();
        e.preventDefault();
        if ((e.target as any).type === "text") {
            return;
        }
        const keyCode = keys.domToKeyCode(e.keyCode, e.location);
        ci.sendKeyEvent(keyCode, false);
        pressedKeys.delete(keyCode);
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


// Array of all virtual keyboard button IDs
const virtualKeyButtonIds = [
    {
        name:'key-esc',
        code: keys.KBD_esc,
        pressed: false
    },
    {
        name:'key-tab', 
        code: keys.KBD_tab,
        pressed: false
    }, 
    {
        name:'key-capslock', // CapsLock button
        code: keys.KBD_capslock,
        pressed: false
    }, 
    {
        name:'key-shift',    // Shift button
        code: keys.KBD_leftshift,
        pressed: false
    }, 
    {
        name:'key-ctrl',     // Ctrl button
        code: keys.KBD_leftctrl,
        pressed: false
    }, 
    {
        name:'key-alt',      // Alt button
        code: keys.KBD_leftalt,
        pressed: false
    }, 
]


export function bindSmallSoftKeyboard(ci:VscodeApi){
     for (const k of virtualKeyButtonIds){
        const btn=document.getElementById(k.name) as HTMLButtonElement;
        btn.addEventListener("click",()=>{
            k.pressed=!k.pressed;
            ci.sendKeyEvent(k.code,k.pressed)
            btn.classList.toggle('grayed', k.pressed);
        })
    }
}

