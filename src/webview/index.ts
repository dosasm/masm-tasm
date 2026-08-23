import { VscodeApi } from "./api";
import { webGl } from "./webgl";
import { audioNode } from "./audio-node";
import { bindKeyboard, bindSmallSoftKeyboard } from "./keyboard";
import { bindMouse } from "./mouse";

const eles={
    ciPause:document.getElementById("ci-pause") as HTMLInputElement,
    uiMute:document.getElementById("ui-mute") as HTMLInputElement,
    canvas: document.getElementById("display") as HTMLCanvasElement,
    ciSelect: document.getElementById("ci-list") as HTMLSelectElement,
    canvasOverlay: document.getElementById("canvas-overlay") as HTMLDivElement,
};

const frame = webGl(eles.canvas, 600, 400);
let soundPush:ReturnType<typeof audioNode>|undefined = undefined;

window.addEventListener("message", (msg) => {
    const show = document.getElementById("show");
    const data = msg.data;
    if (data.name === "frame") {
        if (data.ciIdx !== eles.ciSelect.selectedIndex) return;
        eles.canvasOverlay.style.display = "none";
        if (show) {
            show.innerText = "delay:" + (Date.now() - data.date).toString() + "ms\n";
        }
        frame.onFrameSize(data.width, data.height);
        frame.onFrame(data.rgb, null);
    }
    if (data.name === "switch-ci") {
        eles.ciSelect.selectedIndex = data.ciIdx;
    }
    if (data.name === "soundPush"){
        soundPush?.onSoundPush(data.samples);
    }
    // Event-driven: automatically update the CI dropdown when the CI list changes (replaces polling)
    if (data.name === "ci-list-updated") {
        const cis = data.value;
        // Full option replacement to avoid count mismatches
        const prevSelected = eles.ciSelect.selectedIndex;
        eles.ciSelect.innerHTML = cis.map((ci: any, idx: number) =>
            `<option ${idx === prevSelected ? "selected" : ""}>${ci.id} ${ci.exited ? "exited" : "running"}</option>`
        ).join("");
        // Restore selection state (lost after innerHTML rebuild)
        if (cis.length > 0) {
            eles.ciSelect.selectedIndex = prevSelected < cis.length ? prevSelected : 0;
        }
        // Check if the currently selected CI has exited and update the overlay
        const currentCI = cis[eles.ciSelect.selectedIndex];
        if (currentCI && currentCI.exited) {
            eles.canvasOverlay.style.display = "flex";
            eles.canvasOverlay.innerText = "emulator exited";
        }
    }
});


console.log("masm-tasm webview debugger");
let vapi = VscodeApi.create();

if (vapi) {
    // init the sound push
    setTimeout(async () => {
        let soundFrequency=await vapi.soundFrequency();
        soundPush=audioNode(soundFrequency);
    }, 100);
    // init the keyboard and mouse
    bindKeyboard(vapi,eles.canvas);
    document.addEventListener("DOMContentLoaded",()=>bindSmallSoftKeyboard(vapi));
    bindMouse(eles.canvas,vapi);
    
    // init the ci select
    // CI list is no longer polled; the extension host now actively pushes updates when CIs are added/removed (ci-list-updated)
    // Request the full list once on initial load
    vapi.exec("get-ci-list", []).then((cis: any) => {
        eles.ciSelect.innerHTML = cis.map((ci: any, idx: number) =>
            `<option>${ci.id} ${ci.exited ? "exited" : "running"}</option>`
        ).join("");
    });
    eles.ciSelect.addEventListener("input", () => {
        eles.canvasOverlay.style.display = "";
        vapi.exec("change-viewing-id", [eles.ciSelect.selectedIndex]);
    });

    //pause or resume the program
    eles.ciPause.addEventListener("input",()=>{
        if (eles.ciPause.checked){
            vapi.pause();
        }else{
            vapi.resume();
        }
    });

    //mute or unmute the program
    eles.uiMute.addEventListener("input",()=>{
        vapi.exec("mute-sound",[eles.uiMute.checked]);
    });

    //display the data
    let intervalStartedAt = Date.now();
    let prevNonSkippableSleepCount = 0;
    let prevSleepCount = 0;
    setInterval(() => {
        vapi.asyncifyStats().then((stats) => {
            const dt = Date.now() - intervalStartedAt;
            const nonSkippableSleep = stats.nonSkippableSleepCount - prevNonSkippableSleepCount;
            const avgSleep = (stats.sleepCount - prevSleepCount) * 1000 / dt;
            const avgNonSkippableSleep = (stats.nonSkippableSleepCount - prevNonSkippableSleepCount) * 1000 / dt;
            intervalStartedAt = Date.now();
            prevNonSkippableSleepCount = stats.nonSkippableSleepCount;
            prevSleepCount = stats.sleepCount;

            const statEle = document.getElementById("ci-stat") as HTMLSpanElement;
            statEle.innerText = "Avg sleep p/sec: " + Math.round(avgSleep) +
                ", avg non skippable sleep p/sec: " + Math.round(avgNonSkippableSleep);
        });
    }, 3000);
}

