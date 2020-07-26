# 64位计算机下运行调试16位/32位汇编语言

这是一个插件是我在"[masm-code](https://github.com/Woodykaixa/masm-code)"的基础上修改的。专注于编译运行环节（原插件的一些其他特性被我省略了，这样可以与其他插件更好地合作）。如果不想用插件可以选择参考[github](https://github.com/xsro/VSC-ASMtasks)自定义VSCode任务。

1. 同时支持调用*TASM*和*MASM*
2. **编辑器右键菜单**：在汇编语言的编辑器添加了“打开dosbox，运行，调试”的三个选项
3. **安装即用**：已将相关工具与插件打包在一起，无需额外配置，建议与TASM或者MASM的语法高亮插件配合使用。也因此*只适用于windows*
4. 提供diagnose问题输出功能
5. 调用[dosbox](dosbox.com)和[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)模拟16位系统环境，运行相关组件

十分感谢以上提到的软件！插件难免会有一些bug，欢迎到github发[issue](https://github.com/xsro/masm-tasm/issues)以及PR

## Features主要功能

当工作区有`ASM(asm)`后缀的文件时插件会启动，当前编辑器为汇编文件时，在编辑器界面右键菜单中会提供以下三个选项：

1. 打开dosbox并配置环境(挂载)：将当前编辑器的文件（注意保存）复制到工作文件夹，启动dosbox 挂载相关目录，添加汇编工具集到path。这样就可以在dosbox窗口运行相关工具，包括：masm,tasm,link,tlink,td,debug
2. 运行当前程序(汇编+链接+运行)：默认是生成exe，其他操作请使用选项一，手动完成
3. 调试当前程序(汇编+链接+调试)：

### Demo1 使用MASM（via msdos-player）

![demo msdos-player masm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_msdos_masm.gif)

### Demo2 使用TASM(via dosbox)

![demo dosbox tasm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_dosbox_tasm.gif)

### Demo3 打开dosbox，适合更多自定义操作

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/master/pics/opendosbox.gif)

## Extension Settings拓展设置

要实现Demo中的功能需要在拓展中进行设置，同时设置中还有一些选项，以提供更大的灵活性

- 汇编工具使用MASM还是TASM
- 16位模拟器使用dosbox还是msdos-player
  - DOSBox更加完善
  - msdos-player可以在cmd中运行，但对TD等图形化界面的处理效果不好
  - auto 根据情况选择：
    - 汇编链接使用msdos-player模拟，更加安静
    - 运行使用DOSBox，更加直观
    - 调试中MASM(debug)使用msdos-palyer在windows集成终端中显示（更加美观一些）
    - 调试中TASM(TD)在DOSBox中运行（目前只能这样）
- 可以调整dosbox窗口大小，dosbox运行程序之后进行上面操作（是否直接退出程序，还是等待字符）
- 启动相关功能之前是否先保存文件（不保存的话，只能操作之前保存的版本，建议保存）
- 设置自定义工具路径,详见:[自定义汇编工具路径](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md#自定义汇编工具路径)

### Docs & Thanks & Licenses

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
