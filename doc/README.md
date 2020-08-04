# run and debug TASM and MASM via dosbox(and msdos-player)

This extension is modified from "[masm-code](https://github.com/Woodykaixa/masm-code)", focusing on the interaction with DOS emulator (DOSBox and msdos-player). It is helpful for you to study MASM, TASM and also the course <*principles& peripheral technology of microprocessor*>.

- Support both **TASM and MASM**: you can choose MASM or TASM in the preference
- **Editor Menu**: run and debug with right click on the VSCode editor panel
- **Convenient**: related tools packaged in the extension. Just install and right click  (the extension *only supports windows* currently)
- **Diagnose**: process the output of ASM tools and ouput them in VSCode
- Welcome [issue](https://github.com/xsro/masm-tasm/issues) and PR to build a better extension with your help.
- Some interesting code your may need:[VSCtasks wiki](https://github.com/xsro/VSC-ASMtasks/wiki/dosbox),[cltasm](https://gitee.com/chenliucx/CLTASM/tree/code/)

## :clap:Features

when your are editing `.asm(.ASM)` files ,you can right click at the editor panel,then you will see several choices listed below:

1. "打开dosbox并配置环境(挂载)": Open the dosbox. Mount tools at disk C and current file at disk D as `T.asm`. You can use command l like like `tasm T.asm` .[more info](https://github.com/xsro/masm-tasm/blob/master/doc/在dosbox中手动操作.md)
2. "运行当前程序(汇编+链接+运行)": Compile and Run the program
3. "调试当前程序(汇编+链接+调试)": Compile and Debug the program

### Demo 1: using MASM（via msdos-player）

![demo msdos-player masm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_msdos_masm.gif)

### Demo 2: using TASM(via dosbox)

![demo dosbox tasm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_dosbox_tasm.gif)

### Demo 3: Open dosbox and type the command you need

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/master/pics/opendosbox.gif)

### Demo 4: diagnose and clean the diagnose information

![diagnose](https://github.com/xsro/masm-tasm/raw/master/pics/demo_diagnose_tasm.gif)

The extension do not contribute languages features, You may need some extension to support your language like:[MASM](https://marketplace.visualstudio.com/items?itemName=bltg-team.masm)、[TASM](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086)、[masm-code](https://marketplace.visualstudio.com/items?itemName=kaixa.masm-code)、[x86 and x86_64 Assembly](https://marketplace.visualstudio.com/items?itemName=13xforever.language-x86-64-assembly)

## :bulb:Extension Settings

- `masmtasm.ASM.MASMorTASM` use `MASM` or `TASM`
- `masmtasm.ASM.emulator` use dosbox or msdos-player
  - `DOSBox` more stable
  - `msdos-player`quiet, it runs in command prompt(CMD).  So it cannot support GUI like `TD.exe`
  - `auto` auto select
    1. use msdos-player to compile and link
    2. use DOSBox to run
    3. use msdos-player for MASM(debug)
    4. use DOSBox for TASM(TD)
- `masmtasm.ASM.savefirst`: boolean. whether save all file first before compile
- `masmtasm.ASM.toolspath` custom path of your ASM tools. [more info](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md#自定义汇编工具路径)
- `masmtasm.dosbox.CustomResolution`: size(resolution) of the dosbox window,for example `1024x960`

### :point_right:Docs & Thanks & Licenses

- this extension is [MIT license](https://github.com/xsro/masm-tasm/blob/master/LICENSE).
  - thanks for [masm-code](https://github.com/Woodykaixa/masm-code),[msdos player](http://takeda-toshiya.my.coocan.jp/msdos),[dosbox](https://www.dosbox.com)
  - their [info and licences](https://github.com/xsro/masm-tasm/blob/master/doc/liscence.md)
- [about the tools](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md)
- [some infomation :wiki](https://github.com/xsro/VSC-ASMtasks/wiki)

Enjoy!:smile:
