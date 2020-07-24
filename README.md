# <汇编语言环境>使用dosbox和msdos player模拟16位系统环境，运行MASM、TASM工具实现汇编运行调试等操作

这是一个插件是我借鉴"[masm-code](https://github.com/Woodykaixa/masm-code)"后在这个插件的基础上修改的。专注于编译运行（原插件的一些其他特性被我省略了，这样可以与其他插件更好地合作）。如果不想用插件可以选择参考[github](https://github.com/xsro/VSC-ASMtasks)自定义VSCode任务。

1. 支持*TASM*和*MASM*:
2. **编辑器右键菜单**：在汇编语言的编辑器添加了打开“dosbox，运行，调试”的三个选项
3. **无需手动安装**：已将相关工具与插件打包在一起。也因此*只适用于windows*
4. 提供diagnose问题输出功能
5. 调用[dosbox](dosbox.com)和[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)模拟16位系统环境，运行相关组件
十分感谢以上软件！

## Features主要功能

当工作区有`ASM(asm)`后缀的文件时插件会启动，当前编辑器为汇编文件时，在编辑器界面右键菜单中会提供三个选项（用来实现打开dosbox，运行代码，调试代码三种操作）。

1. 打开dosbox并配置环境(挂载)：将当前编辑器的文件（注意保存）复制到工作文件夹，启动dosbox 挂载相关目录，添加汇编工具集到path。这样就可以在dosbox窗口运行相关工具，包括：masm,tasm,link,tlink,td,debug
2. 运行当前程序(汇编+链接+运行)
3. 调试当前程序(汇编+链接+调试)

Note：如果设置中为使用msdos-player运行/调试结果在终端输出；如果使用dosbox，运行/调试结果在弹出的dosbox中输出

### demo1 使用MASM（via msdos-player）

![demo msdos-player masm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_msdos_masm.gif)

### demo2 使用TASM(via dosbox)

![demo dosbox tasm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_dosbox_tasm.gif)

### demo3 打开dosbox

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/master/pics/opendosbox.gif)

## Extension Settings拓展设置

要实现Demo中的功能需要在拓展中进行设置，同时设置中还有一些选项，以提供更大的灵活性

- 设置中可以修改使用dosbox还是msdos-player，使用MASM还是TASM
- 可以调整dosbox窗口大小，dosbox运行程序之后进行上面操作（是否直接退出程序，还是等待字符）
- 启动相关功能之前是否先保存文件（不保存的话，只能操作之前保存的版本，建议保存）
- 设置自定义工具路径,详见:[自定义汇编工具路径](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md#自定义汇编工具路径)

### docs & Thanks & Licenses

- this ext is [MIT license](https://github.com/xsro/masm-tasm/blob/master/LICENSE).
  - thank for [masm-code](https://github.com/Woodykaixa/masm-code),,[msdos player](http://takeda-toshiya.my.coocan.jp/msdos),[dosbox](dosbox.com)
  - their [info and licences](https://github.com/xsro/masm-tasm/blob/master/doc/liscence.md)
- [关于TASM/MASM汇编工具以及相关软件](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md)

<!-- ## Release Notes

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z. -->

Enjoy!
