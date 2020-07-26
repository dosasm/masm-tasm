::a small batch to reduce ts code when using msdos
::%1 cwd
::%2 masmortasm
::%3 asm run debug
::%4 file path
:: exit 9 copy dailed
@echo off
set "cdo=%CD%"
cd "%1%\work"
del T.*
copy %4 T.ASM>nul 
if "%2" == "MASM" goto masm
if "%2" == "TASM" goto tasm
goto end
:masm
    msdos ../masm/masm T.ASM>T.txt;
    if exist T.OBJ goto masmNext
    echo Fail! ASMfilefrom %4 with %2%
    type T.txt
    ::FOR /F "skip=3 eol=   tokens=1* delims=(" %%i in (T.txt) do @echo   %~pf4(%%j
    goto end
    :masmNext
    FOR /F "skip=3 eol=   tokens=1* delims=(" %%i in (T.txt) do @echo warning: T.ASM(%%j
    echo Succeed! ASMfilefrom %4 with %2%
    
    if "%3" == "asm" goto end with %2%
    echo Start link
    msdos ../masm/link T.OBJ;
    if "%3" == "link" goto end
    if "%3" == "debug" goto masmDebug
    if "%3" == "run" goto masmRun
    :masmRun
    echo run
    msdos T.EXE
    goto end
    :masmDebug
    echo debug using debug.exe
    msdos -v5.0 ../masm/debug T.EXE
    goto end
:tasm
    msdos ../tasm/tasm /zi T.ASM>T.txt;
    if exist T.OBJ goto tasmNext
    echo Fail! ASMfilefrom %4 with %2%
    type T.txt
    ::FOR /F "skip=3 tokens=1,2* delims=T(" %%i in (T.txt) do @if %%j==.ASM echo   %%i%~pf4(%%k
    goto end
    ::TODO
    :tasmNext
    FOR /F "skip=3 tokens=1,2* delims=T(" %%i in (T.txt) do @if %%j==.ASM echo warnings: %%iT.ASM(%%k
    echo Succeed! ASMfilefrom %4 with %2%
    type T.txt
    if "%3" == "asm" goto end
    echo Start link
    msdos ../tasm/tlink /v/3 T.OBJ;
    if "%3" == "link" goto end
    if "%3" == "debug" goto tasmDebug
    if "%3" == "run" goto tasmRun
    :tasmRun
    echo run
    msdos T.EXE
    goto end
    :tasmDebug
    echo debug using td.exe
    msdos -v5.0 ../tasm/td T.EXE
    goto end
:end
cd "%cdo%"


