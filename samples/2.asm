include mac.inc
.model small
.stack 64
.data
	msg  db "hello","$"
.code
main proc far
	     mov ax,@DaTa
	     mov ds,ax
	     mov ah,9
	     mov dx,offset msg
	     int 21h
	     hlt
	     MOV AH,4CH
	     INT 21H          	;BACK TO DOS
main endp
end main