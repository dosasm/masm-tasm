::a small batch to reduce ts code when using msdos
::%1 toolspath %1%\work is where the file %4 will be copied to
::%2 masmortasm
::%3 file path
:: exit 9 copy dailed
@echo off
set "cdo=%CD%">nul 
set path=%path%;%~dp0;>nul 
cd "%1%"
if not exist work mkdir work
cd work
del T*.*
copy %3 T.ASM>nul
if "%2" == "MASM" goto masm
if "%2" == "TASM" goto tasm
goto end
:masm
    echo (msdos-player)masm T.ASM;
    msdos ../masm/masm T.ASM;
    echo (msdos-player)link T.OBJ;
    msdos ../masm/link T.OBJ;
    goto end
:tasm
    echo (msdos-player)tasm/zi T.ASM
    msdos ../tasm/tasm /zi T.ASM
    echo (msdos-player)tlink/v/3 T.OBJ
    msdos ../tasm/tlink /v/3 T.OBJ
:end
cd "%cdo%"


