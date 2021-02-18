::this batch file is used to assemble and link ASM code by xsro.masm-tasm
@REM echo %0 %1 %2 %3
set "cdo=%CD%"
::%1 toolspath
set TOOLS=%1
::%2 masmortasm
::%3 the source code file's path
set filename=%~n3

::switch to the source code file's folder
cd %~dp3
%~d3
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
    mkdir c:\.dosasm\masm\                    >%TOOLS%\msdos.log
    copy "%~f1\masm\*.*" c:\.dosasm\masm\     >%TOOLS%\msdos.log
    set path=%PATH%;c:\.dosasm\masm\;         >%TOOLS%\msdos.log
    masm %filename%;                          >%TOOLS%\ASM.LOG       
    if not exist %filename%.obj goto end      >%TOOLS%\msdos.log
    msdos link %filename%;                    >%TOOLS%\LINK.LOG 
    goto end
:tasm
    mkdir c:\.dosasm\tasm\                    >%TOOLS%\msdos.log
    copy "%~f1\tasm\*.*" c:\.dosasm\tasm\     >%TOOLS%\msdos.log
    set path=%PATH%;c:\.dosasm\tasm\;         >%TOOLS%\msdos.log
    msdos -e tasm /zi %filename%              >%TOOLS%\ASM.LOG
    if not exist %filename%.obj goto end      >%TOOLS%\msdos.log
    msdos -e tlink /v/3 %filename%            >%TOOLS%\LINK.LOG
:RUN

goto end
:DEBUG

goto end
:end
::print message use this form to help extension to process
::currently only process ASM message
@echo ===ASM message===
@type %TOOLS%\ASM.LOG
@echo ===ASM END===

@echo ===LINK message===
@type %TOOLS%\LINK.LOG
@echo ===LINK END===