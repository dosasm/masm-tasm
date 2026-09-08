VGA256          EQU 13h
TEXTMODE        EQU 3h
VIDEOMEMORY     EQU 0a000h
RETRACE         EQU 3dah

TILEWIDTH       EQU 8
TILEHEIGHT      EQU 8
TILEMAPWIDTH    EQU 600
MAPWIDTH        EQU 40
MAPHEIGHT       EQU 25
SCREENWIDTH     EQU 320
TIMERRATE       EQU 9b5ch 

pushRegisters MACRO
	PUSH	AX
	PUSH	CX
	PUSH	DX
	PUSH	BX
	PUSH	BP
	PUSH	SI
 	PUSH	DI
ENDM

popRegisters MACRO
   POP 		DI
   POP 		SI
   POP 		BP
   POP 		BX
   POP 		DX
   POP 		CX
   POP 		AX
ENDM

.MODEL COMPACT

LOCALS @@

.STACK 100h

.DATA 
map          DB 65,58,59,62,62,65,59,62,57,73,59,71,59,62,60,49,50,50,50,50,50,50,50,50,50,50,51,49,50,50,50,50,50,50,51,62,65,58,59,65
             DB 62,57,66,60,60,61,49,50,50,50,50,50,50,51,61,52,37,21,18,23,14,28,36,37,37,37,53,52,37,37,37,37,37,37,53,60,62,65,59,61
             DB 58,59,61,61,61,62,52,10,36,29,34,25,14,53,61,54,55,55,55,55,55,55,55,55,55,55,56,52,29,24,25,37,37,37,53,61,57,72,60,62
             DB 57,64,62,61,69,59,54,55,55,55,55,55,55,56,62,41,42,42,42,42,42,42,42,42,42,42,43,52,37,37,37,37,37,37,53,61,57,58,72,60
             DB 60,69,59,62,57,58,58,59,60,63,64,60,57,58,66,44,37,37,37,37,37,37,37,37,37,37,45,52,37,37,37,37,37,37,53,62,63,64,57,74
             DB 61,60,57,58,58,59,57,58,72,69,70,71,58,59,62,44,37,37,37,37,37,37,37,37,37,37,45,52,28,12,24,27,14,37,53,60,69,70,60,62
             DB 61,67,59,57,66,49,50,50,50,50,50,50,50,50,51,44,37,37,37,37,37,37,37,37,37,37,45,52,37,37,37,37,37,37,53,71,58,59,71,58
             DB 62,62,63,64,61,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,52,37,37,37,37,37,37,53,60,65,59,57,58
             DB 65,59,69,70,62,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,54,55,55,55,55,55,55,56,61,61,65,58,59
             DB 61,57,58,58,59,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,57,58,58,59,57,58,66,57,72,62,62,57,68
             DB 62,63,64,57,59,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,41,42,42,42,42,43,62,60,57,58,58,59,62
             DB 59,69,70,65,59,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,44,23,14,33,29,45,65,72,57,66,60,57,66
             DB 65,58,59,61,60,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,44,37,37,37,37,45,62,65,59,61,67,59,61
             DB 62,57,64,62,61,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,44,37,37,37,37,45,57,72,60,62,62,60,62
             DB 65,59,69,59,61,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,44,37,37,37,37,45,65,59,69,58,59,71,58
             DB 72,60,65,59,62,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,44,37,37,37,37,45,61,57,66,65,58,59,60
             DB 57,74,61,63,64,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,46,47,47,47,47,48,62,60,61,62,57,58,72
             DB 59,62,62,69,70,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,49,50,50,50,50,50,51,61,62,57,58,58,59
             DB 57,64,57,58,59,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,52,21,14,31,14,21,53,61,57,68,59,65,58
             DB 60,69,59,65,59,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,52,37,37,37,37,37,53,62,60,62,60,62,60
             DB 61,60,57,72,60,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,54,55,55,55,55,55,56,57,74,65,72,57,74
             DB 61,61,57,58,72,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,60,57,68,59,60,60,58,59,62,62,63,64,62
             DB 62,69,59,57,66,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,67,59,62,57,74,62,60,57,58,66,69,70,60
             DB 57,68,59,60,61,52,37,37,37,37,37,37,37,37,53,44,37,37,37,37,37,37,37,37,37,37,45,62,57,58,66,62,65,72,65,59,62,60,65,72
             DB 59,62,60,61,62,54,55,55,55,55,55,55,55,55,56,46,47,47,47,47,47,47,47,47,47,47,48,60,63,64,62,60,62,57,72,60,57,74,62,57

tilesData    DB 0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h
             DB 0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h
             DB 0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0fh,37h,37h,37h,37h,37h,37h,0h,0fh,35h,35h,35h,35h,35h,35h,0h,0fh,37h,37h,37h,37h,37h,37h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,0h,0h,0h,0h,0h,0h,0h,0h
             DB 4ch,4ch,4ch,0h,17h,17h,0h,0h,17h,17h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,17h,17h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch
             DB 4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,4ch,17h,17h,17h,17h,17h,17h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,4ch,4ch,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,0h,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h
             DB 0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h
             DB 0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0fh,0h,0fh,0fh,0fh,0h,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0h,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h
             DB 0h,0h,0h,0h,0h,0h,0h,0h,37h,0fh,0fh,0fh,0fh,0fh,37h,0h,35h,0fh,0fh,35h,35h,35h,35h,0h,37h,0fh,0fh,37h,37h,37h,37h,0h,0h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,4ch,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,4ch,4ch,0h,17h,17h,0h,0h,17h,17h,0h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,0h,17h,17h,0h,17h,17h,0h,4ch,0h,0h,0h
             DB 0h,0h,0h,4ch,0h,17h,17h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h
             DB 4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h
             DB 0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h
             DB 0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,37h,0fh,0fh,0fh,0fh,0fh,37h,0h,35h,0fh,35h,35h,35h,35h,35h,0h,37h,0fh,37h,37h,37h,37h,37h,0h,0h,17h,17h,17h,0h,17h,17h,17h
             DB 17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,4ch,0h,17h,17h,0h,0h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h
             DB 17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h
             DB 17h,17h,17h,17h,17h,17h,17h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h
             DB 0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h
             DB 0fh,0fh,0fh,0h,0fh,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,37h,0fh,0fh,0fh,0fh,0fh,37h,0h,35h,35h,35h,35h,35h,35h,35h,0h,37h,37h,37h,37h,37h,37h,37h,0h,0h,0h,17h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,17h,0h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h,0h,17h,0h,17h,0h,4ch,4ch,4ch
             DB 4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,17h,0h,17h,0h,0h,17h,0h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,0h,17h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,0h,17h,17h,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h
             DB 4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h
             DB 0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h
             DB 0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0fh,0h,0fh,0fh,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h
             DB 0h,0h,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,37h,0fh,0fh,0fh,0fh,0fh,37h,0h,35h,35h,35h,35h,35h,35h,35h,0h,37h,37h,37h,37h,37h,37h,37h,0h,0h,17h,0h,17h,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,17h,0h,17h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h,0h,0h,17h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,17h,0h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,17h,17h,0h
             DB 0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,17h,0h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,0h,17h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h
             DB 17h,17h,17h,17h,17h,17h,17h,17h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,0h,0fh,0fh,0h,0h,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h
             DB 0h,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h
             DB 0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0h,0fh,0fh,0fh,0h,0fh,0fh,0fh,0h,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,37h,0fh,0fh,0fh,0fh,0fh,37h,0h,35h,35h,35h,35h,35h,35h,35h,0h,37h,37h,37h,37h,37h,37h,37h,0h
             DB 0h,17h,17h,0h,4ch,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,4ch,0h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h,0h,17h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h
             DB 4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h
             DB 17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,0h,0h,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h
             DB 0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0fh,0fh,0fh,0fh,0h,0fh,0h,0fh,0fh,0h,0h,0fh,0fh,0fh,0h,0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0fh,0h,0h,0h
             DB 0h,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0h,0h,0h,0h,0fh,0fh,0h,0h,0h,0fh,0fh,0fh,0fh,0fh,0fh,0fh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,37h,37h,37h,37h,37h,37h,37h,0h,35h,35h,35h,35h,35h,35h,35h,0h,37h,37h,37h,37h,37h,37h,37h,0h,0h,17h,17h,0h,4ch,4ch,0h,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,4ch,0h,4ch,4ch,0h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h
             DB 0h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,17h,17h,0h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,0h,17h,17h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h
             DB 4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
             DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
             DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
             DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h,0h,17h,17h,0h,4ch,4ch,4ch,0h,4ch,4ch,4ch,0h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
             DB 0h,0h,0h,4ch,0h,17h,17h,0h,0h,17h,17h,0h,4ch,0h,0h,0h,0h,0h,0h,4ch,0h,17h,17h,0h,17h,17h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,17h,17h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h,4ch,17h,17h,17h,17h,17h,17h,0h
             DB 4ch,17h,17h,17h,17h,17h,17h,0h,17h,17h,17h,17h,17h,17h,17h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4ch,17h,17h,17h,17h,17h,17h,0h

frequencyTable 	DB 0ah,0bh,0ch,0dh,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
				DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
				DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
				DB 056h,21h,06bh,21h,081h,21h,098h,21h,0b0h,21h,0cah,21h,0e5h,21h,002h,22h,020h,22h,041h,22h,063h,22h,087h,22h
				DB 056h,25h,06bh,25h,081h,25h,098h,25h,0b0h,25h,0cah,25h,0e5h,25h,002h,26h,020h,26h,041h,26h,063h,26h,087h,26h
				DB 056h,29h,06bh,29h,081h,29h,098h,29h,0b0h,29h,0cah,29h,0e5h,29h,002h,2ah,020h,2ah,041h,2ah,063h,2ah,087h,2ah
				DB 056h,2dh,06bh,2dh,081h,2dh,098h,2dh,0b0h,2dh,0cah,2dh,0e5h,2dh,002h,2eh,020h,2eh,041h,2eh,063h,2eh,087h,2eh
				DB 056h,31h,06bh,31h,081h,31h,098h,31h,0b0h,31h,0cah,31h,0e5h,31h,002h,32h,020h,32h,041h,32h,063h,32h,087h,32h
				DB 056h,35h,06bh,35h,081h,35h,098h,35h,0b0h,35h,0cah,35h,0e5h,35h,002h,36h,020h,36h,041h,36h,063h,36h,087h,36h
				DB 056h,39h,06bh,39h,081h,39h,098h,39h,0b0h,39h,0cah,39h,0e5h,39h,002h,3ah,020h,3ah,041h,3ah,063h,3ah,087h,3ah
				DB 056h,3dh,06bh,3dh,081h,3dh,098h,3dh,0b0h,3dh,0cah,3dh,0e5h,3dh,002h,3eh,020h,3eh,041h,3eh,063h,3eh,087h,3eh

channel1 	   	DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
				DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
				DB 56h,0h,80h,0h,0h,0h,5dh,0h,80h,0h,0h,0h,62h,0h,80h,0h,0h,0h,61h,0h,80h,0h,0h,0h,62h,0h,80h,0h,0h,0h,5dh,0h,80h,5dh,0h,80h,5eh,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h
				DB 5dh,0h,80h,0h,0h,0h,59h,0h,80h,59h,0h,80h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,58h,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h
				DB 56h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,52h,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,52h,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h
				DB 56h,0h,80h,0h,0h,0h,5dh,0h,80h,0h,0h,0h,62h,0h,80h,0h,0h,0h,61h,0h,80h,0h,0h,0h,62h,0h,80h,0h,0h,0h,5dh,0h,80h,5dh,0h,80h,5eh,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h
				DB 5dh,0h,80h,0h,0h,0h,59h,0h,80h,59h,0h,80h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,58h,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h
				DB 56h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,52h,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,52h,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h
				DB 56h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,58h,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h
				DB 56h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,58h,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h
				DB 59h,0h,80h,0h,0h,0h,59h,0h,80h,59h,0h,80h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,59h,0h,80h,59h,0h,80h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h
				DB 59h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,5bh,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h
				DB 5dh,0h,80h,0h,0h,0h,5dh,0h,80h,5dh,0h,80h,5eh,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h,5dh,0h,80h,0h,0h,0h,5dh,0h,80h,5dh,0h,80h,5eh,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h
				DB 5dh,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,5fh,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h
				DB 60h,0h,80h,0h,0h,0h,60h,0h,80h,60h,0h,80h,60h,0h,80h,0h,0h,0h,60h,0h,80h,0h,0h,0h,62h,0h,80h,0h,0h,0h,60h,0h,80h,0h,0h,0h,60h,0h,80h,0h,0h,0h,5fh,0h,80h,0h,0h,0h
				DB 60h,0h,80h,0h,0h,0h,60h,0h,80h,60h,0h,80h,60h,0h,80h,0h,0h,0h,60h,0h,80h,0h,0h,0h,62h,0h,80h,0h,0h,0h,60h,0h,80h,0h,0h,0h,60h,0h,80h,0h,0h,0h,5fh,0h,80h,0h,0h,0h
				DB 60h,0h,80h,0h,0h,0h,60h,0h,80h,60h,0h,80h,60h,0h,80h,0h,0h,0h,60h,0h,80h,0h,0h,0h,5fh,0h,80h,0h,0h,0h,5fh,0h,80h,5fh,0h,80h,5fh,0h,80h,0h,0h,0h,5fh,0h,80h,0h,0h,0h
				DB 5eh,0h,80h,0h,0h,0h,5eh,0h,80h,5eh,0h,80h,5eh,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,5bh,0h,0h,0h,80h,0h,54h,0h,0h,0h,80h,0h
				DB 5bh,0h,80h,0h,0h,0h,59h,0h,80h,59h,0h,80h,54h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,54h,0h,80h,56h,0h,80h,54h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
				DB 5bh,0h,80h,0h,0h,0h,59h,0h,80h,59h,0h,80h,54h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,54h,0h,80h,56h,0h,80h,54h,0h,80h,0h,0h,0h,50h,0h,80h,0h,0h,0h
				DB 54h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
				DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,55h,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h

channel2  		DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
				DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
				DB 51h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,58h,0h,80h,59h,0h,80h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h
				DB 59h,0h,80h,0h,0h,0h,55h,0h,80h,56h,0h,80h,58h,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,50h,0h,80h,51h,0h,80h,55h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
				DB 51h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h
				DB 51h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,58h,0h,80h,59h,0h,80h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h
				DB 59h,0h,80h,0h,0h,0h,55h,0h,80h,56h,0h,80h,58h,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,50h,0h,80h,51h,0h,80h,55h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
				DB 51h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,55h,0h,80h,0h,0h,0h
				DB 51h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
				DB 51h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,54h,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h
				DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
				DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,58h,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h
				DB 59h,0h,80h,0h,0h,0h,59h,0h,80h,59h,0h,80h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h,59h,0h,80h,59h,0h,80h,5bh,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h
				DB 59h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,56h,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h
				DB 58h,0h,80h,0h,0h,0h,59h,0h,80h,5bh,0h,80h,58h,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h,5dh,0h,80h,0h,0h,0h,5dh,0h,80h,0h,0h,0h,5dh,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h
				DB 58h,0h,80h,0h,0h,0h,59h,0h,80h,5bh,0h,80h,58h,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h,5ch,0h,80h,0h,0h,0h,5ch,0h,80h,0h,0h,0h,5ch,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h
				DB 58h,0h,80h,0h,0h,0h,59h,0h,80h,5bh,0h,80h,58h,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,58h,0h,80h,59h,0h,80h,56h,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h
				DB 56h,0h,80h,0h,0h,0h,58h,0h,80h,59h,0h,80h,58h,0h,80h,0h,0h,0h,58h,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,58h,0h,0h,0h,80h,0h,4ch,0h,0h,0h,80h,0h
				DB 51h,0h,80h,0h,0h,0h,51h,0h,80h,51h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,51h,0h,80h,53h,0h,80h,51h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h
				DB 50h,0h,80h,0h,0h,0h,50h,0h,80h,50h,0h,80h,50h,0h,80h,0h,0h,0h,50h,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,50h,0h,80h,52h,0h,80h,50h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h
				DB 4ch,0h,80h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h
				DB 0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,0h,4fh,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h

channel3 		DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,55h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,55h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,51h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,55h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,55h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,52h,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,55h,0h,80h,0h,0h,0h,51h,0h,80h,0h,0h,0h
                DB 56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,52h,0h,80h,0h,0h,0h,4fh,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,56h,0h,80h,56h,0h,80h,4fh,0h,80h,0h,0h,0h,48h,0h,80h,0h,0h,0h
                DB 4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h
                DB 4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h
                DB 4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h
                DB 4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,4fh,0h,80h,0h,0h,0h,5bh,0h,80h,0h,0h,0h
                DB 48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,4dh,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h
                DB 48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,4dh,0h,80h,0h,0h,0h,59h,0h,80h,4dh,0h,80h,4dh,0h,80h,0h,0h,0h,59h,0h,80h,0h,0h,0h
                DB 48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h
                DB 48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h
                DB 4ah,0h,80h,0h,0h,0h,56h,0h,80h,4ah,0h,80h,4ah,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,4ah,0h,80h,0h,0h,0h,56h,0h,80h,4ah,0h,80h,4ah,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h
                DB 4ah,0h,80h,0h,0h,0h,56h,0h,80h,4ah,0h,80h,4ah,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h,4ah,0h,80h,0h,0h,0h,56h,0h,80h,4ah,0h,80h,4ah,0h,80h,0h,0h,0h,56h,0h,80h,0h,0h,0h
                DB 48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h
                DB 48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,48h,0h,80h,0h,0h,0h,54h,0h,80h,0h,0h,0h,48h,0h,80h,0h,0h,0h,54h,0h,80h,48h,0h,80h,58h,0h,0h,0h,0h,0h,0h,0h,80h,0h,0h,0h

songLength          DW 1056
instrumentRegisters DB 20h,23h,40h,43h,60h,63h,80h,83h,0e0h,0e3h,0ch
leadSquare          DB 22h,20h,40h,0h,0ffh,0ffh,3h,0fh,3h,2h,0h
triangle            DB 21h,80h,0c7h,02h,0f4h,0f2h,1ch,2ch,00h,00h,08    

.DATA?
selectedInstru 	    DW ?
songPos             DW ?
loopVarA            DW ?
loopVarB            DW ?
bitmapOffset        DW ?
vramOffset          DW ?

.FARDATA?
videoBuffer         DW  32000 dup (?)

.CODE
int8OldOffset       DW ?           
int8OldSeg          DW ? 
timerCount          DW ?

Main:
    MOV     AX,@DATA
    MOV     DS,AX
    
    CALL setupAdlib

    CALL switchVGA

    CALL paintMap

 	MOV     WORD PTR [cs:timerCount],0
	CALL installISR
   
	MOV 	BX,TIMERRATE
	CALL setPIT

    CALL waitRetrace
    CALL moveToVideoRam

    MOV     AH,0
    INT     16H

    CALL    returnToDos

;end of the program

paintMap PROC NEAR
    MOV     BX,SEG videoBuffer
    MOV     ES, BX

    MOV     loopVarA,0
    LEA     SI,map
@@ForLoopA:
    MOV     loopVarB,0
@@ForLoopB:
    XOR     AX,AX
    MOV     AL,BYTE PTR DS:[SI]
    MOV     BX,TILEWIDTH
    MUL     BX
    MOV     bitmapOffset,AX

    MOV     AX,loopVarA
    MOV     BX,SCREENWIDTH
    MUL     BX
    MOV     BX,TILEHEIGHT
    MUL     BX
    MOV     CX,AX

    MOV     AX,loopVarB
    MOV     BX,TILEWIDTH
    MUL     BX
    ADD     AX,CX
    MOV     vramOffset,AX

    PUSH    SI
    CALL drawTile
    POP     SI

    INC     SI
    INC     loopVarB
    CMP     loopVarB,MAPWIDTH
    JNE @@ForLoopB
    INC     loopVarA
    CMP     loopVarA,MAPHEIGHT  
    JNE @@ForLoopA   
    RET
paintMap ENDP

drawTile PROC NEAR
    XOR     CX,CX

@@Loop:
    LEA     SI,tilesData
    MOV     AX,CX
    MOV     BX,TILEMAPWIDTH
    MUL     BX
    ADD     AX,bitmapOffset
    ADD     AX,SI
    MOV     SI,AX

    MOV     AX,CX
    MOV     BX,SCREENWIDTH
    MUL     BX
    ADD     AX,vramOffset
    MOV     DI,AX

    PUSH    CX
    MOV     CX,4
    REP     MOVSW
    POP     CX
  
    INC     CX
    CMP     CX,TILEHEIGHT
    JNE @@Loop

    RET
drawTile ENDP

switchVGA PROC NEAR
    MOV     AH,0
    MOV     AL,VGA256
    INT     10h

    RET
switchVGA ENDP

waitRetrace PROC NEAR
    MOV     DX,RETRACE
@@Vsync1:
    IN      AL,DX
    TEST    AL,8
    JZ @@Vsync1
@@Vsync2:
    IN      AL,DX
    TEST    AL,8
    JNZ @@Vsync2
    RET
waitRetrace ENDP

moveToVideoRam PROC NEAR
    PUSH    ES
    PUSH    DS

    mov     BX,SEG videoBuffer
    MOV     DS,BX
    MOV     CX,320*200/2

    MOV     BX,VIDEOMEMORY
    MOV     ES,BX

    XOR     SI,SI  
    XOR     DI,DI
    REP     MOVSW

    POP     DS
    POP     ES

    RET
moveToVideoRam ENDP

returnToDos PROC NEAR
    mov     AH,0
    mov     AL,TEXTMODE
    int     10h 

	CALL 	resetAdlib

    MOV     AH,4ch  
    INT     21h
returnToDos ENDP

setupAdlib PROC NEAR
	CALL 	resetAdlib

	MOV 	AL,01h
	MOV 	AH,20h
	CALL sendAdlib

    MOV     songPos,0

	MOV 	CL,0
	LEA 	SI,leadSquare
	CALL setInstrument
	MOV 	CL,1
	LEA 	SI,leadSquare
	CALL setInstrument
	MOV 	CL,2
	LEA 	SI,triangle
	CALL setInstrument

    RET
setupAdlib ENDP

setInstrument PROC NEAR
	MOV 	DI,0
			
@@ForLoop:
	MOV 	AL,[instrumentRegisters + DI]
	ADD 	AL,CL
	MOV 	BX,SI
	MOV 	AH,[BX + DI]
	CALL sendAdlib

	INC 	DI
	CMP 	DI,11
	JB @@ForLoop
	
	RET
setInstrument ENDP

resetAdlib PROC NEAR
	MOV 	AL,0h
	MOV 	AH,0
@@ForLoop:
	CALL sendAdlib
	INC 	AL
	CMP 	AL,0f5h
	JBE @@ForLoop
		
	RET
resetAdlib ENDP

sendAdlib PROC NEAR
	PUSH AX
	PUSH DX
	PUSH CX

	MOV 	DX,388h
	OUT 	DX,AL

	MOV 	DX,389h
	MOV 	CX,6
@@Delay1:
	IN 		AL,DX
	LOOP @@Delay1

	MOV 	AL,AH
	OUT 	DX,AL

	MOV 	CX,35
@@Delay2:
	IN 		AL,DX
	LOOP @@Delay2

	POP CX
	POP DX	
	POP AX					
	RET
sendAdlib ENDP	

updateMusic PROC NEAR
	MOV 	DI,songPos

	MOV 	CL,0
	LEA 	BX,channel1
	CALL playChannel
	
	MOV 	CL,1
	LEA 	BX,channel2
	CALL playChannel

	MOV 	CL,2
	LEA 	BX,channel3
	CALL playChannel			

	INC 	songPos
	MOV 	AX,songPos
	CMP 	AX,songLength
	JE	@@ResetSong

	JMP	@@Finish

@@ResetSong:
	MOV 	songPos,0		

@@Finish:

	RET
updateMusic ENDP

playChannel PROC NEAR
	PUSH 	DI
	ADD 	DI,BX
	MOV 	BH,0
	MOV 	BL,[DI]
	POP 	DI

	CMP 	BL,0h
	JZ @@Finish
	CMP 	BL,80h
	JZ @@NoteOff
			
@@NoteOn:
	MOV 	SI,BX
	SHL 	SI,1

	MOV 	DX,DS:[offset frequencyTable + SI]
						
	MOV 	AL,0a0h
	ADD 	AL,CL
	MOV 	AH,DL
	CALL sendAdlib

	MOV 	AL,0b0h
	ADD 	AL,CL
	MOV 	AH,DH
	CALL sendAdlib

	JMP @@Finish
			
@@NoteOff:
	MOV 	AL,0b0h
	ADD 	AL,CL
	MOV 	AH,0h
	CALL sendAdlib
@@Finish:
	RET
playChannel ENDP

installISR PROC NEAR
    PUSH    DS
    CLI
    MOV     AH,035h
    MOV     AL,08h
    INT     21h
    MOV 	[CS:int8OldOffset], BX
    MOV 	AX, ES
    MOV 	[CS:int8OldSeg], AX

    MOV 	AH,25h
    MOV     AL,08h           
    MOV 	BX,seg timerInterrupt    
    MOV 	DS,BX

    MOV 	DX,offset timerInterrupt
    INT 	21h
    STI
    POP 	DS
    RET
installISR ENDP

removeISR PROC NEAR
    PUSH DS

    MOV     AH,025h
    MOV     AL,08h

    mov 	DX,[CS:int8OldOffset]
    mov 	CX,[CS:int8OldSeg]
    mov 	DS,CX
    INT 	21h

    POP DS
    RET
removeISR ENDP

timerInterrupt PROC FAR
    pushRegisters
    ADD     WORD PTR [CS:timerCount],TIMERRATE
    JNC @@EOI
    PUSHF  
    CALL    DWORD PTR [CS:int8OldOffset]
 
@@EOI:
    CALL updateMusic

    MOV     AL,20h
    OUT     20h,AL

    popRegisters
  
    IRET
timerInterrupt ENDP

setPIT PROC NEAR
	CLI
	MOV 	AL,36h
	OUT 	43h,AL
	MOV 	AL,BL
	OUT 	40h,AL
	MOV 	AL,BH
	OUT 	40h,AL
	STI
	RET
setPIT ENDP

END Main