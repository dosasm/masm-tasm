::this batch file will be used in dosbox by xsro.masm-tasm
@echo off
if exist T.exe del T.exe
if exist T.OBJ del T.OBJ
if exist T.lst del T.lst
if "%1"=="MASM" goto MASM
if "%1"=="TASM" goto TASM
echo %1 is not MASM or TASM
goto end

:MASM
set path=%path%;c:\masm
echo ...masm T.asm;
masm T.ASM;>T.txt
echo ...link T.obj;
if  exist T.obj link T.OBJ;>>T.txt
if  exist T.exe goto MASMNEXT
goto ERR
:TASM
set path=%path%;c:\tasm
echo ...tasm T.ASM
tasm /zi T.ASM>T.txt
echo ...tlink T.OBJ
if  exist T.obj tlink /v/3 T.OBJ>>T.txt
if  exist T.exe goto TASMNEXT
goto ERR

:MASMNEXT
if "%2"=="run" goto run
if "%2"=="debug" goto MASMdebug
echo %2 is not run or debug
goto end
:TASMNEXT
if "%2"=="run" goto run
if "%2"=="debug" goto TASMdebug
echo %2 is not run or debug
goto end

:MASMdebug
echo ...debug T.EXE
debug T.EXE
goto end
:TASMdebug
if exist c:\tasm\TDC2.TD copy c:\tasm\TDC2.TD TDCONFIG.TD
echo ...TD T.EXE
TD T.EXE
goto end

:ERR
echo assemble FAILED, Output has been redireted to VSCODE's output pannel
exit
:run
echo ...T.EXE
T.EXE
echo (END)
echo ----------------------------------------------------------
echo The symbol "(END)" means there is the END of your program's output
:end
if "%3"=="p" pause
if "%3"=="k" goto final
exit
:final
