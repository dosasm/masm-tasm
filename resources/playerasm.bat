::this batch file is used to assemble and link ASM code by xsro.masm-tasm
::%1 toolspath
::%2 masmortasm
::%3 workpath
cd %~f3
%~d3
echo %0 %1 %2 %3
set "cdo=%CD%"
mkdir C:\.dosasm\
echo this folder is used by vscode extension xsro.masm-tasm to generate codes >C:\.dosasm\readme.txt
echo feel free to delete this folder for it will be create when you use the extension to run or debug your code via msdos >>C:\.dosasm\readme.txt

set path=%~f1\player\
if "%2" == "MASM" goto masm
if "%2" == "TASM" goto tasm
goto end

:masm
    mkdir c:\.dosasm\masm\
    copy "%~f1\masm\*.*" c:\.dosasm\masm\
    set path=%PATH%;c:\.dosasm\masm\
    masm T.ASM; >ASMlog.txt
    if not exist T.obj goto end
    msdos link T.OBJ; >>ASMlog.txt
    goto end
:tasm
    mkdir c:\.dosasm\tasm\
    copy "%~f1\tasm\*.*" c:\.dosasm\tasm\
    set path=%PATH%;c:\.dosasm\tasm\
    msdos tasm /zi T.ASM >ASMlog.txt
    if not exist T.obj goto end
    msdos -e tlink /v/3 T.OBJ >>ASMlog.txt
:end
cd "%cdo%"
