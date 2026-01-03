import { VscodeApi } from "./api";
import { webGl } from "./webgl"
import { audioNode } from "./audio-node"
import { bindKeyboard, bindSmallSoftKeyboard } from "./keyboard";

const eles={
    ciPause:document.getElementById("ci-pause") as HTMLInputElement,
    uiMute:document.getElementById("ui-mute") as HTMLInputElement,
    canvas: document.getElementById("display") as HTMLCanvasElement,
    ciSelect: document.getElementById("ci-list") as HTMLSelectElement,
}

const frame = webGl(eles.canvas, 600, 400);
let soundPush:ReturnType<typeof audioNode>|undefined = undefined

window.addEventListener("message", (msg) => {
    const show = document.getElementById("show")
    const data = msg.data;
    if (data.name === "frame") {
        if (show) {
            show.innerText = "delay:" + (Date.now() - data.date).toString() + "ms\n"
        }
        frame.onFrameSize(data.width, data.height);
        frame.onFrame(data.rgb, null);
        eles.ciSelect.selectedIndex = data.ciIdx;
    }
    if (data.name === "soundPush"){
        soundPush?.onSoundPush(data.samples)
    }
})


console.log("masm-tasm webview debugger")
let vapi = VscodeApi.create()

if (vapi) {
    // init the sound push
    setTimeout(async () => {
        let soundFrequency=await vapi.soundFrequency();
        soundPush=audioNode(soundFrequency);
    }, 100);
    // init the keyboard
    bindKeyboard(vapi,eles.canvas);
    document.addEventListener("DOMContentLoaded",()=>bindSmallSoftKeyboard(vapi))
    
    // init the ci select
    setInterval(async () => {
        const cis: { id: number, time: string, lastFrameTimeMs: number }[] = await vapi.exec("get-ci-list", [])
        for (let i = 0; i < cis.length; i++) {
            if (i < eles.ciSelect.options.length) {
                const optionEle = eles.ciSelect.options[i];
                let alive = Date.now() - cis[i].lastFrameTimeMs < 2000 // assume the emulator is working if last frame data is transfered within 2s
                optionEle.innerText = `${cis[i].id} ${alive ? "running" : "stopped"}`
            } else {
                const o = document.createElement("option")
                let alive = Date.now() - cis[i].lastFrameTimeMs < 2000 // assume the emulator is working if last frame data is transfered within 2s
                o.innerText = `${cis[i].id} ${alive ? "running" : "stopped"}`
                eles.ciSelect.appendChild(o)
            }
        }
    }, 1000);
    eles.ciSelect.addEventListener("input", () => {
        vapi.exec("change-viewing-id", [eles.ciSelect.selectedIndex])
    })

    //pause or resume the program
    eles.ciPause.addEventListener("input",()=>{
        if (eles.ciPause.checked){
            vapi.pause()
        }else{
            vapi.resume()
        }
    })

    //mute or unmute the program
    eles.uiMute.addEventListener("input",()=>{
        vapi.exec("mute-sound",[eles.uiMute.checked])
    })

    //display the data
    let intervalStartedAt = Date.now();
    let prevNonSkippableSleepCount = 0;
    let prevSleepCount = 0;
    let prevCycles = 0;
    setInterval(() => {
        vapi.asyncifyStats().then((stats) => {
            const dt = Date.now() - intervalStartedAt;
            const nonSkippableSleep = stats.nonSkippableSleepCount - prevNonSkippableSleepCount;
            const avgSleep = (stats.sleepCount - prevSleepCount) * 1000 / dt;
            const avgNonSkippableSleep = (stats.nonSkippableSleepCount - prevNonSkippableSleepCount) * 1000 / dt;
            const avgCycles = (stats.cycles - prevCycles) / dt;
            intervalStartedAt = Date.now();
            prevNonSkippableSleepCount = stats.nonSkippableSleepCount;
            prevSleepCount = stats.sleepCount;
            prevCycles = stats.cycles;

            const statEle = document.getElementById("ci-stat") as HTMLSpanElement;
            statEle.innerText = "Avg sleep p/sec: " + Math.round(avgSleep) +
                ", avg non skippable sleep p/sec: " + Math.round(avgNonSkippableSleep) +
                ", cycles p/ms: " + Math.round(avgCycles);
        });
    }, 3000);
}

