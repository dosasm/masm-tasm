import { VscodeApi } from "./api";
import { webGl } from "./webgl"

const canvasEle = document.getElementById("display") as HTMLCanvasElement;
const frame = webGl(canvasEle, 600, 400);

window.addEventListener("message", (msg) => {
    const show = document.getElementById("show")
    const data = msg.data;
    if (data.name === "frame") {
        if (show) {
            show.innerText = "delay:" + (Date.now() - data.date).toString() + "ms\n"
        }
        frame.onFrameSize(data.width, data.height);
        frame.onFrame(data.rgb, null);
    }

})


console.log("masm-tasm webview debugger")
let vapi=VscodeApi.create()

if (vapi) {
    const ciEle = document.getElementById("ci-list") as HTMLSelectElement;
    setInterval(async () => {
        const cis:{id:number,time:string}[]=await vapi.exec("get-ci-list",[])
        ciEle.innerHTML=cis.map(o=>`<option>${o.id}</option>`).join("\n")
    }, 10000);
}

