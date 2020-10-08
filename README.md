# DOS assembly (MASM/TASM) via DOSBox(and msdos-player)

[中文](https://github.com/xsro/masm-tasm/blob/main/doc/README_zh.md)|[English](https://github.com/xsro/masm-tasm/blob/main/README.md)

Language support for DOS assembly,may be suitable for studying MASM/TASM and the course <*principles& peripheral technology of microprocessor*>.

- Offer *grammar*,basic *outline* view,*hover*,*code formate* support for DOS assembly language
- Support both **TASM and MASM** assembler tools: you can choose MASM or TASM in the preference
- In **Editor Menu**: run and debug assembly with right click on the VSCode editor panel
- **Diagnose**: process the output of ASM tools and display them in VSCode
- **For windows**, all needed tools have been packaged in the extension.Just install and enjoy!
- [For other systems](#for-linux): you need to install [DOSBox](https://www.dosbox.com) first

Thanks to [Roncho](https://marketplace.visualstudio.com/publishers/Roncho) 's extension [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086),[blindtiger](https://github.com/9176324)'s [masm](https://github.com/9176324/bltg-team.masm) and [Woodykaixa](https://github.com/Woodykaixa)'s [masm-code](https://github.com/Woodykaixa/masm-code). Welcome [issue](https://github.com/xsro/masm-tasm/issues) and PR to build a better extension with your help.

## Features

when you are editing `assembly` files ,you can right click at the editor panel,then you will see several choices listed below:

1. **Open dosbox**: Open the dosbox, prepare the environment(copy file to dosbox's D:\ and add tools to path)
2. **Run ASM code**: Assemble,link and Run the program
3. **Debug ASM code**: Assemble,link and Debug the program

## Demo

### Demo 1: Run and Debug Assembly

| using TASM via DOSBox                                                                     | using MASM via msdos-player                                                                    |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| ![demo dosbox tasm](https://github.com/xsro/masm-tasm/raw/main/pics/demo_dosbox_tasm.gif) | ![demo msdos-player masm](https://github.com/xsro/masm-tasm/raw/main/pics/demo_msdos_masm.gif) |

When opened a ASM file in Editor, Right click on the Editor, then run or debug the code. Default mode is using `DOSBox` and `TASM`, you can change them in `preference->settings` like the second gif(using MASM via msdos-palyer).

### Demo 2: code Formate,Diagnose and more

| Formate Codes                                                                                          | Diagnose                                                                            |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| ![programmatic lanaguage features](https://github.com/xsro/masm-tasm/raw/main/pics/demo_PLFeature.gif) | ![diagnose](https://github.com/xsro/masm-tasm/raw/main/pics/demo_diagnose_tasm.gif) |

The extension offer some programmatic features like "hover","formate","jump to definition",you can close them in the `preferece->settings`

### Demo 3: Open dosbox and type the command you need

| Single-File (command `Open DOSBox`)                                               | Multi-Files (command `Dosbox here`)                                                                                         |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/main/pics/opendosbox.gif) | [![pacman](https://github.com/xsro/masm-tasm/raw/main/pics/demo_pacman.gif)](https://github.com/dpisdaniel/assembly-pacman) |

- Command "`Open DOSBox`": Your file will be copied as `D:\T.ASM` in DOSBox. (The extension will copy your file to work space and mount this space to DOSbox disk `D:`)
- Command "`Doxbox here`": The extension will mount your active editor file's folder directly to dosbox's disk `E:`.
- some ASM commands you may need: [ASM_commands](https://github.com/xsro/masm-tasm/wiki/ASM_commands).
- Some interesting assembly codes you may need: [DOSBox ASM codes](https://github.com/xsro/masm-tasm/wiki/dosbox)

## For linux and other system

The extension is packaged with all needed [tools](#about-tools) inside,but some of these tools are for windows. So **Linux and other OS** users *should* make sure DOSBox can be opened by shell command `dosbox` (node: child_process.exec("dosbox")). Use command like

```sh
sudo apt install dosbox  #install dosbox
dosbox #if successfully opened the dosbox, it is largely possible for the extension to use dosbox
```

## Extension Settings

for more,please see the `preference->settings`

- `masmtasm.ASM.MASMorTASM` use *MASM* or *TASM* assembler in DOS emulator to run and debug assembly
- `masmtasm.ASM.emulator` use dosbox or msdos-player as DOS emulator
  - `DOSBox` (default) more stable
  - `msdos-player`quiet, it runs in command prompt(CMD).  So it cannot support GUI like `TD.exe`
  - `auto` auto select
    1. use msdos-player to compile and link
    2. use DOSBox to run
    3. use msdos-player for MASM(debug)
    4. use DOSBox for TASM(TD)
- `masmtasm.ASM.savefirst`  save file first before using
- `masmtasm.dosbox.run`：what to do after run your code in DOSBox
- `masmtasm.dosbox.CustomResolution`: size(resolution) of the dosbox window,for example `1024x960`
- `masmtasm.ASM.toolspath` custom path of your ASM tools. [#about-tools](#about-tools)

### About Tools

the extension has built in tools for windows. But if you need to use assembler or emulator of different version. You can organize your tools following the structure bellow and add your folder's path to  `masmtasm.ASM.toolspath`, see [about ASM tools](https://github.com/xsro/masm-tasm/blob/main/doc/Toolspath.md)

- tools:your tools folder name, you can add the path of it to settings `masmtasm.ASM.toolspath`
  1. `TASM`: TASM tools including `tasm.exe`,`tlink.exe`,`td.exe`
  2. `MASM`: MASM tools including `masm.exe`,`link.exe`,`debug.exe`
  3. `dosbox`: dosbox.exe and related files
  4. `player`: msdos.exe

Folder dosbox and player are emulator for windows and this extension will not use them in other systems

### About use of DOSBox

The extension will mount some folder to DOSBox 's disk. Please don't modify them.

| in DOSBox | real path in the computor                                              |
| --------- | ---------------------------------------------------------------------- |
| C:        | the path of tools folder                                               |
| D:        | the path of the work space                                             |
| E:        | the path of the editor file's folder(when using command `dosbox here`) |

## Docs & Thanks & Licenses

- This extension is [MIT license](https://github.com/xsro/masm-tasm/blob/main/LICENSE).
- Thanks for [Roncho](https://marketplace.visualstudio.com/publishers/Roncho)'s [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086),[Woodykaixa](https://github.com/Woodykaixa)'s [masm-code](https://github.com/Woodykaixa/masm-code),[blindtiger](https://github.com/9176324)'s [masm](https://github.com/9176324/bltg-team.masm),[msdos player](http://takeda-toshiya.my.coocan.jp/msdos),[dosbox](https://www.dosbox.com)
- [some infomation :wiki](https://github.com/xsro/masm-tasm/wiki)

Enjoy!:smile:
