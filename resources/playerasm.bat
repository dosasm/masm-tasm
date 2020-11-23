::this batch file is used to assemble and link ASM code by xsro.masm-tasm
::%1 toolspath
::%2 masmortasm
::%3 workpath
@echo off
set "cdo=%CD%"
::echo ASMfile:%~f3
set path=%~f1\player\;%~f1\masm\;%~f1\tasm\
cd %~f3
%~d3
if "%2" == "MASM" goto masm
if "%2" == "TASM" goto tasm
goto end
:masm
    masm T.ASM;
    if not exist T.obj goto end
    msdos link T.OBJ;
    goto end
:tasm
    msdos tasm /zi T.ASM
    if not exist T.obj goto end
    msdos tlink /v/3 T.OBJ
:end
cd "%cdo%"
exit



