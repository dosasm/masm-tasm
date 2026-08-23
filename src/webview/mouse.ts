import { VscodeApi } from "./api";

export function bindMouse(canvas: HTMLCanvasElement, ci: VscodeApi) {
    canvas.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        ci.sendMouseMotion(
            (e.clientX - rect.left) / rect.width,
            (e.clientY - rect.top) / rect.height
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