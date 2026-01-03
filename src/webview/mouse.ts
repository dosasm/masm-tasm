import { VscodeApi } from "./api";

export function bindMouse(canvas: HTMLCanvasElement, ci: VscodeApi) {
    canvas.addEventListener("mousemove", (e: MouseEvent) => {
        ci.sendMouseMotion(
            (e.clientX - canvas.offsetLeft) / canvas.clientWidth,
            (e.clientY - canvas.offsetTop) / canvas.clientHeight
        );
        e.stopPropagation();
        e.preventDefault();
    });

    canvas.addEventListener("mousedown", (e: MouseEvent) => {
        ci.sendMouseButton(0, true);
        e.stopPropagation();
        e.preventDefault();
    });

    canvas.addEventListener("mouseup", (e: MouseEvent) => {
        ci.sendMouseButton(0, false);
        e.stopPropagation();
        e.preventDefault();
    });
}