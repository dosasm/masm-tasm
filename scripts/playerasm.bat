::a small batch to reduce ts code when using msdos
::%1 toolspath
::%2 masmortasm
::%3 file path
::%4 workpath
:: exit 9 copy dailed
@echo off
set "cdo=%CD%">nul
::echo ASMfile:%~f3
set path=%~f1\player\;%~f1\masm\;%~f1\tasm\
cd %~f4
%~d4
del T*.*
copy %3 T.ASM>nul
if "%2" == "MASM" goto masm
if "%2" == "TASM" goto tasm
goto end
:masm
    echo (msdos-player)masm T.ASM;
    msdos masm T.ASM;
    echo (msdos-player)link T.OBJ;
    msdos link T.OBJ;
    goto end
:tasm
    echo (msdos-player)tasm/zi T.ASM
    msdos tasm /zi T.ASM
    echo (msdos-player)tlink/v/3 T.OBJ
    msdos tlink /v/3 T.OBJ
:end
cd "%cdo%"


