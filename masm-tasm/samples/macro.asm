.MODEL SMALL
.STACK 100h

.DATA
    message DB "The sum is: ", "$"
    sumValue DW 0

.CODE
main PROC
    MOV AX, @DATA
    MOV DS, AX

    ; Example usage of the ADD_AND_STORE macro
    MOV AX, 5
    MOV BX, 10
    ADD_AND_STORE AX, BX, sumValue

    ; Print the message
    MOV AH, 09h
    MOV DX, OFFSET message
    INT 21h

    ; Print the sum (converted to ASCII)
    MOV AX, sumValue
    CALL PrintDecimal

    ; Exit program
    MOV AH, 4Ch
    INT 21h
main ENDP

; Macro Definition: ADD_AND_STORE
ADD_AND_STORE MACRO reg1, reg2, dest
    MOV AX, reg1
    ADD AX, reg2
    MOV dest, AX
ENDM

; Procedure to print a decimal value in AX
PrintDecimal PROC
    PUSH BX
    PUSH CX
    PUSH DX
    PUSH SI

    MOV BX, 10 ; Divisor
    MOV CX, 0  ; Digit counter
    MOV SI, 0  ; Buffer index

PrintLoop:
    MOV DX, 0  ; Clear remainder
    DIV BX     ; AX = AX / BX, DX = remainder
    PUSH DX    ; Store digit on stack
    INC CX     ; Increment digit counter
    CMP AX, 0  ; Check if quotient is zero
    JNE PrintLoop

PrintDigits:
    POP DX     ; Retrieve digit from stack
    ADD DL, '0' ; Convert to ASCII
    MOV [SI + Buffer], DL ; Store digit in buffer
    INC SI
    LOOP PrintDigits

    MOV AH, 09h ; Print string function
    MOV DX, OFFSET Buffer
    INT 21h

    POP SI
    POP DX
    POP CX
    POP BX
    RET
PrintDecimal ENDP

.DATA
Buffer DB 10 DUP('$') ; Buffer to store decimal digits

END main