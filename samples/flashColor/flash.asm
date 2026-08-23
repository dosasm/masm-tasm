.model small
.STACK 1024
.data
    ; Attribute bytes: white foreground on different backgrounds
    ; Bit 7: blink | Bits 6-4: background | Bits 3-0: foreground
    colors db 0Fh, 1Fh, 2Fh, 3Fh, 4Fh, 5Fh, 6Fh, 7Fh
    color_count equ ($ - colors)
.code
main:
    mov ax, @data
    mov ds, ax

    ; Set 80x25 text mode (mode 3)
    mov ah, 00h
    mov al, 03h
    int 10h

flash_loop:
    lea si, colors
    mov cx, color_count

color_cycle:
    lodsb                   ; AL = attribute byte

    ; Fill entire screen with spaces having attribute AL
    ; Video memory at B800:0000, 80*25*2 = 4000 bytes
    push ax
    push cx
    push di
    push es

    mov ax, 0B800h
    mov es, ax
    xor di, di
    mov cx, 2000            ; 80 * 25 characters
    mov ah, al              ; AH = attribute, AL = space char
    mov al, ' '
    rep stosw               ; fill screen

    pop es
    pop di
    pop cx
    pop ax

    ; Check for key press to exit
    mov ah, 01h
    int 16h
    jz no_key
    mov ah, 00h
    int 16h                 ; consume key
    jmp exit

no_key:
    ; Short delay between color changes
    push cx
    mov cx, 0FFFFh
delay_outer:
    push cx
    mov cx, 0FFFh
delay_inner:
    loop delay_inner
    pop cx
    loop delay_outer
    pop cx

    loop color_cycle
    jmp flash_loop

exit:
    ; Restore to normal text mode and return to DOS
    mov ah, 00h
    mov al, 03h
    int 10h
    mov ah, 4Ch
    int 21h

    end main