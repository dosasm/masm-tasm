# run and debug TASM and MASM via dosbox(and msdos-player)

[中文](https://github.com/xsro/masm-tasm/blob/master/doc/README_zh.md)

This extension is modified from "[masm-code](https://github.com/Woodykaixa/masm-code)", focusing on the interaction with DOS emulator (DOSBox and msdos-player). It is helpful for you to study MASM, TASM and also the course <*principles& peripheral technology of microprocessor*>.

- Support both **TASM and MASM**: you can choose MASM or TASM in the preference
- **Editor Menu**: run and debug with right click on the VSCode editor panel
- **Convenient**: related tools packaged in the extension. Just install and right click (recommand to use this ext in windows otherwise you should install dosbox first)
- **Diagnose**: process the output of ASM tools and ouput them in VSCode
- Welcome [issue](https://github.com/xsro/masm-tasm/issues) and PR to build a better extension with your help.
- Some interesting code your may need:[masm-tasm wiki](https://github.com/xsro/masm-tasm/wiki/dosbox)

Thanks to [Roncho](https://marketplace.visualstudio.com/publishers/Roncho)'s extension [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086). This extension now support assembly language using codes from  it.
Also, this extension may also work with extensions like: [MASM](https://marketplace.visualstudio.com/items?itemName=bltg-team.masm)、[masm-code](https://marketplace.visualstudio.com/items?itemName=kaixa.masm-code)、[x86 and x86_64 Assembly](https://marketplace.visualstudio.com/items?itemName=13xforever.language-x86-64-assembly)

## Features

when your are editing `.asm(.ASM)` files ,you can right click at the editor panel,then you will see several choices listed below:

1. "Open dosbox": Open the dosbox. Copy current file to workspace as `D:\T.asm` in DOSBox. You can use command like `tasm T.asm` .[more info](https://github.com/xsro/masm-tasm/blob/master/doc/ASM_commands.md)
2. "Run ASM code": Compile and Run the program
3. "Debug ASM code": Compile and Debug the program

### Demo 1: using MASM（via msdos-player）

![demo msdos-player masm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_msdos_masm.gif)

### Demo 2: using TASM(via dosbox)

![demo dosbox tasm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_dosbox_tasm.gif)

### Demo 3: Open dosbox and type the command you need

your file will be copied as `D:\T.ASM` in DOSBox. (The extension will copy your file to work space and mount the space as disk D)

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/master/pics/opendosbox.gif)

### Demo 4: diagnose and clean the diagnose information

![diagnose](https://github.com/xsro/masm-tasm/raw/master/pics/demo_diagnose_tasm.gif)

## Docs & Thanks & Licenses

- this extension is [MIT license](https://github.com/xsro/masm-tasm/blob/master/LICENSE).
  - thanks for [masm-code](https://github.com/Woodykaixa/masm-code),[msdos player](http://takeda-toshiya.my.coocan.jp/msdos),[dosbox](https://www.dosbox.com)
  - their [info and licences](https://github.com/xsro/masm-tasm/blob/master/doc/license_and_info.md)
- [about the tools](https://github.com/xsro/masm-tasm/blob/master/doc/Toolspath.md)
- [some infomation :wiki](https://github.com/xsro/masm-tasm/wiki)

Enjoy!:smile:
