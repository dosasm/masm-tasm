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

.DATA?
loopVarA        DW ?
loopVarB        DW ?            
bitmapOffset    DW ?
vramOffset      DW ?

.FARDATA?
videoBuffer     DW  32000 dup (?)

.CODE
Main:
    MOV     AX,@DATA
    MOV     DS,AX
    
    CALL switchVGA

    CALL paintMap

    CALL waitRetrace
    CALL moveToVideoRam

    MOV     AH,0
    INT     16H

    call returnToDos

;end of the program

paintMap PROC NEAR
    MOV     BX,SEG videoBuffer
    MOV     ES,bx

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

    MOV     AH,4ch  
    INT     21h
returnToDos ENDP

END Main