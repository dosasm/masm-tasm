import { webGl } from "./webgl"

const canvasEle=document.getElementById("display") as HTMLCanvasElement;
const frame=webGl(canvasEle,600,400);

window.addEventListener("message",(msg)=>{
    const show=document.getElementById("show")
    const data=msg.data;
    if(show){
        show.innerText="delay:"+(Date.now()-data.date).toString()+"ms\n"
    }
    frame.onFrameSize(data.width,data.height);
    frame.onFrame(data.rgb,null);
})