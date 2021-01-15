::this batch file is used to assemble and link ASM code by xsro.masm-tasm
::%1 toolspath
::%2 masmortasm
::%3 the source code file's path
cd %~dp3
%~d3
set filename=%~n3
if "%filename%" == "" set filename=T
echo %0 %1 %2 %3
set "cdo=%CD%"
mkdir C:\.dosasm\
echo this folder is used by vscode extension xsro.masm-tasm to generate codes >C:\.dosasm\readme.txt
echo feel free to delete this folder for it will be create when you use the extension to run or debug your code via msdos >>C:\.dosasm\readme.txt

set path=%~f1\player\
if "%2" == "MASM" goto masm
if "%2" == "TASM" goto tasm
if "%2" == "run" goto RUN
if "%2" == "debug" goto DEBUG
goto end

:masm
    mkdir c:\.dosasm\masm\
    copy "%~f1\masm\*.*" c:\.dosasm\masm\
    set path=%PATH%;c:\.dosasm\masm\
    masm %filename%; >ASM.log
    if not exist %filename%.obj goto end
    msdos link %filename%; >>ASM.log
    goto end
:tasm
    mkdir c:\.dosasm\tasm\
    copy "%~f1\tasm\*.*" c:\.dosasm\tasm\
    set path=%PATH%;c:\.dosasm\tasm\
    msdos tasm /zi %filename% >ASM.log
    if not exist %filename%.obj goto end
    msdos -e tlink /v/3 %filename% >>ASM.log
:RUN

goto end
:DEBUG

goto end
:end

cd "%cdo%"