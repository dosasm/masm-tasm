import { VscodeApi } from "./api";
import { webGl } from "./webgl"
import { audioNode } from "./audio-node"
import { bindKeyboard, bindSmallSoftKeyboard } from "./keyboard";
import { bindMouse } from "./mouse";

const eles={
    ciPause:document.getElementById("ci-pause") as HTMLInputElement,
    uiMute:document.getElementById("ui-mute") as HTMLInputElement,
    canvas: document.getElementById("display") as HTMLCanvasElement,
    ciSelect: document.getElementById("ci-list") as HTMLSelectElement,
    canvasOverlay: document.getElementById("canvas-overlay") as HTMLDivElement,
}

const frame = webGl(eles.canvas, 600, 400);
let soundPush:ReturnType<typeof audioNode>|undefined = undefined

window.addEventListener("message", (msg) => {
    const show = document.getElementById("show")
    const data = msg.data;
    if (data.name === "frame") {
        if (data.ciIdx !== eles.ciSelect.selectedIndex) return;
        eles.canvasOverlay.style.display = "none";
        if (show) {
            show.innerText = "delay:" + (Date.now() - data.date).toString() + "ms\n"
        }
        frame.onFrameSize(data.width, data.height);
        frame.onFrame(data.rgb, null);
    }
    if (data.name === "switch-ci") {
        eles.ciSelect.selectedIndex = data.ciIdx;
        eles.canvasOverlay.style.display = "";
    }
    if (data.name === "soundPush"){
        soundPush?.onSoundPush(data.samples)
    }
    // 事件驱动：CI 列表变更时自动更新下拉框（替代轮询）
    if (data.name === "ci-list-updated") {
        const cis = data.value
        for (let i = 0; i < cis.length; i++) {
            if (i < eles.ciSelect.options.length) {
                const optionEle = eles.ciSelect.options[i];
                let alive = Date.now() - cis[i].lastFrameTimeMs < 2000
                optionEle.innerText = `${cis[i].id} ${alive ? "running" : "stopped"}`
            } else {
                const o = document.createElement("option")
                let alive = Date.now() - cis[i].lastFrameTimeMs < 2000
                o.innerText = `${cis[i].id} ${alive ? "running" : "stopped"}`
                eles.ciSelect.appendChild(o)
            }
        }
        // 同步选中状态
        if (eles.ciSelect.options.length > 0 && eles.ciSelect.selectedIndex < 0) {
            eles.ciSelect.selectedIndex = 0
        }
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
    // init the keyboard and mouse
    bindKeyboard(vapi,eles.canvas);
    document.addEventListener("DOMContentLoaded",()=>bindSmallSoftKeyboard(vapi))
    bindMouse(eles.canvas,vapi);
    
    // init the ci select
    // CI 列表不再轮询，改为扩展宿主在 CI 添加/移除时主动推送 (ci-list-updated)
    // 首次加载时请求一次完整列表
    vapi.exec("get-ci-list", []).then((cis: any) => {
        for (let i = 0; i < cis.length; i++) {
            const o = document.createElement("option")
            let alive = Date.now() - cis[i].lastFrameTimeMs < 2000
            o.innerText = `${cis[i].id} ${alive ? "running" : "stopped"}`
            eles.ciSelect.appendChild(o)
        }
    })
    eles.ciSelect.addEventListener("input", () => {
        eles.canvasOverlay.style.display = "";
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

