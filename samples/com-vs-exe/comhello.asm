; ============================================================
;  comhello.asm — Minimal .COM program
;
;  Prints "Hello from .COM!" to the console and exits.
;
;  Build with TASM:
;    tasm comhello.asm
;    tlink comhello.obj
;  Or directly:
;    tasm /j comhello.asm
;
;  Output: comhello.com  (raw binary, no header, ≤ 65,280 bytes)
; ============================================================

.model tiny              ; single segment, all near — required for .COM
.code

; The PSP (Program Segment Prefix) occupies 0x0000–0x00FF.
; Execution begins at CS:0100, so we must set ORG to 100h.
    org 100h

main:
    ; --- Print the greeting ---
    mov  ah, 09h          ; DOS function: print string
    mov  dx, OFFSET msg   ; DS:DX → message
    int  21h

    ; --- Exit to DOS ---
    mov  ah, 4Ch          ; DOS function: terminate process
    mov  al, 00           ; return code 0
    int  21h

; ─── Data section ────────────────────────────────────────────
; In .model tiny, data lives in the same segment as code.
; We place it after the code so it does not interfere with execution.
msg db 0Dh, 0Ah, 'Hello from .COM!', 0Dh, 0Ah, '$'

    end main