# DOS assembly (MASM/TASM) via DOSBox(and msdos-player)

[中文](https://github.com/xsro/masm-tasm/blob/master/doc/README_zh.md)|[English](https://github.com/xsro/masm-tasm/blob/master/README.md)

Language support for DOS assembly,maybe suitable for studying MASM/TASM and the course <*principles& peripheral technology of microprocessor*>.

- Offer *grammar*,basic *outline* view and *hover* support for DOS assembly language
- Support both **TASM and MASM** assembler tools: choose MASM or TASM in the preference
- In **Editor Menu**: run and debug assembly with right click on the VSCode editor panel
- **Convenient**: related tools packaged in the extension. Just install and right click
- **Diagnose**: process the output of ASM tools and ouput them in VSCode
- **Note**: Currently not support multi files assembly

Thanks to [Roncho](https://marketplace.visualstudio.com/publishers/Roncho) 's extension [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086) and [Woodykaixa](https://github.com/Woodykaixa)'s [masm-code](https://github.com/Woodykaixa/masm-code). Welcome [issue](https://github.com/xsro/masm-tasm/issues) and PR to build a better extension with your help.Here are some interesting code I use:[masm-tasm wiki](https://github.com/xsro/masm-tasm/wiki/dosbox)

## Features

when you are editing `assembly` files ,you can right click at the editor panel,then you will see several choices listed below:

1. "Open dosbox": Open the dosbox, prepare the environment(copy file to dosbox's D:\ and add tools to path),[more info](https://github.com/xsro/masm-tasm/blob/master/doc/ASM_commands.md)
2. "Run ASM code": Compile and Run the program
3. "Debug ASM code": Compile and Debug the program

### Demo 1: using TASM(via dosbox, default mode)

![demo dosbox tasm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_dosbox_tasm.gif)

### Demo 2: using MASM（via msdos-player）

![demo msdos-player masm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_msdos_masm.gif)

### Demo 3: Open dosbox and type the command you need

your file will be copied as `D:\T.ASM` in DOSBox. (The extension will copy your file to work space and mount the space as disk D)

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/master/pics/opendosbox.gif)

### Demo 4: diagnose and clean the diagnose information

![diagnose](https://github.com/xsro/masm-tasm/raw/master/pics/demo_diagnose_tasm.gif)

## Extension Settings

for more,please see the `preference->settings`

- `masmtasm.ASM.MASMorTASM` use `MASM` or `TASM` assembler in DOS emulator to run and debug assembly
- `masmtasm.ASM.emulator` use dosbox or msdos-player as DOS emulator,defalut is DOSBox
  - `DOSBox` more stable
  - `msdos-player`quiet, it runs in command prompt(CMD).  So it cannot support GUI like `TD.exe`
  - `auto` auto select
    1. use msdos-player to compile and link
    2. use DOSBox to run
    3. use msdos-player for MASM(debug)
    4. use DOSBox for TASM(TD)
- `masmtasm.ASM.savefirst`  save file first before using
- `masmtasm.ASM.toolspath` custom path of your ASM tools. [more info](#about-tools)
- `masmtasm.dosbox.CustomResolution`: size(resolution) of the dosbox window,for example `1024x960`

### About Tools

The assembler MASM and TASM can only run in 16-bit environment. So the extension use DOSBox and MSDOS-player to emulate the 16-bit environment.
the extension has built in tools for windows. But if you need to use assembler or emulator of different version. You can oragnize your tools follow the structure bellow and add the you folder's path to  `masmtasm.ASM.toolspath`

- tools:your tools folder name, you can add the path of it to settings `masmtasm.ASM.toolspath`
  1. `TASM`: TASM tools including `tasm.exe`,`tlink.exe`,`td.exe`
  2. `MASM`: MASM tools including `masm.exe`,`link.exe`,`debug.exe`
  3. `dosbox`: dosbox.exe and related files
  4. `player`: msdos.exe

Linux and other OS user do not need folder dosbox and player. Instead, we should make sure DOSBox can be opened by shell command `dosbox` (node: child_process.exec("dosbox")). Use command like

```sh
sudo apt install dosbox  #install dosbox
dosbox #if successfully opened the dosbox, this means the extension can work 
```

### About use of DOSBox

The extension will mount some folder to DOSBox 's disk. Please don't modify them. There are:

|in DOSBox|real path in the computor|
|---|---|
|C:|the path of tools folder|
|D:|the path of the work space|
|X:|the path of some scripts for the extension to use|

## Docs & Thanks & Licenses

- this extension is [MIT license](https://github.com/xsro/masm-tasm/blob/master/LICENSE).
- thanks for [Roncho](https://marketplace.visualstudio.com/publishers/Roncho)'s [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086),[Woodykaixa](https://github.com/Woodykaixa)'s [masm-code](https://github.com/Woodykaixa/masm-code),[msdos player](http://takeda-toshiya.my.coocan.jp/msdos),[dosbox](https://www.dosbox.com)
- [about the assembly and emulator tools](https://github.com/xsro/masm-tasm/blob/master/doc/Toolspath.md)
- [some infomation :wiki](https://github.com/xsro/masm-tasm/wiki)

Enjoy!:smile:
