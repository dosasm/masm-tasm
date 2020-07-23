::a small batch to reduce ts code when using msdos
::%1 cwd
::%2 masmortasm
::%3 asm run debug
::%4 file path
@echo off
echo %4%
set "cdo=%CD%"
cd "%1%\work"
del T.*
copy %4 T.asm
if "%2" == "MASM" goto masm
if "%2" == "TASM" goto tasm
goto end
:masm
    msdos ../masm/masm T.ASM>T.txt;
    if exist T.OBJ goto masmNext
    if "%3" == "asm" goto end
    echo ASMfilefrom %4% with %2% failed
    FOR /F "skip=3 eol=   tokens=1* delims=(" %%i in (T.txt) do @echo   %~pf4(%%j
    goto end
    :masmNext
    echo MASM succuess.Start link
    msdos ../masm/link T.OBJ;
    if "%3" == "link" goto end
    if "%3" == "debug" goto masmDebug
    if "%3" == "run" goto masmRun
    :masmRun
    echo run
    msdos T.exe
    goto end
    :masmDebug
    echo debug using debug.exe
    msdos -v5.0 ../masm/debug T.exe
    goto end
:tasm
    msdos ../tasm/tasm /zi T.ASM>T.txt;
    if exist T.OBJ goto tasmNext
     if "%3" == "asm" goto end
    echo ASMfilefrom %4% with %2% failed
    FOR /F "skip=3 tokens=1,2* delims=T(" %%i in (T.txt) do @if %%j==.ASM echo   %%i%~pf4(%%k
    goto end
    ::TODO
    :tasmNext
    echo TASM success Start tlink
    msdos ../tasm/tlink /v/3 T.OBJ;
    if "%3" == "link" goto end
    if "%3" == "debug" goto tasmDebug
    if "%3" == "run" goto tasmRun
    :tasmRun
    echo run
    msdos T.exe
    goto end
    :tasmDebug
    echo debug using td.exe
    msdos -v5.0 ../tasm/td T.exe
    goto end
:end
cd "%cdo%"