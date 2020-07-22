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
    echo 文件%4% 使用%2%汇编未通过,结果如下
    FOR /F "skip=3 eol=   tokens=1* delims=(" %%i in (T.txt) do @echo   %4%(%%j
    :masmNext
    echo MASM succuess.Start link
    msdos ../masm/link T.OBJ;
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
    echo 文件%4% 使用%2%汇编未通过,结果如下
    ::TODO
    FOR /F "skip=3 tokens=1* delims=T.ASM" %%i in (T.txt) do @echo   %%ithis.file%%j
    :tasmNext
    echo TASM success Start tlink
    msdos ../tasm/tlink /v/3 T.OBJ;
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