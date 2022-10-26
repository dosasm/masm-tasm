.model small
.STACK 1024
.data
	message db 8 dup(?),0dh,0ah,"$"
.code
	main:    mov  ax,@data         	;主程序开始
	         mov  ds,ax
	         mov  al,"A"           	;子程序参数1
	         mov  si,offset message	;子程序参数2
	         call BinToAsc         	;调用子程序BinToAsc
	         mov  ah,9
	         mov  dx,offset message
	         int  21h              	;显示字符串
	         mov  ax,4c00h
	         int  21h              	;主程序结束

BinToAsc PROC                  		;子程序开始
	         push cx
	         push si
	         mov  cx,8
	L1:      shl  al,1             	;逻辑左移
	         mov  BYTE PTR [si],"0"
	         jnc  L2               	;CF＝0则跳转
	         mov  BYTE PTR [si],"1"
	L2:      inc  si
	         loop L1
	         pop  si
	         pop  cx
	         ret
BinToAsc ENDP                  		;子程序结束
		 end main