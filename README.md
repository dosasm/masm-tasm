# 64位计算机下运行调试16位/32位汇编语言

[English](https://github.com/xsro/masm-tasm/blob/master/doc/README.md)

在学习《微型计算机原理与接口技术》的汇编语言部分的时候，想提升一下编程体验，我在插件"[masm-code](https://github.com/Woodykaixa/masm-code)"的基础上进行了一些修改。专注于汇编的编译运行调试环节，原插件的语法支持功能被我暂时省略了，推荐结合相关插件一起使用，如：[MASM](https://marketplace.visualstudio.com/items?itemName=bltg-team.masm)、[TASM](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086)、[masm-code](https://marketplace.visualstudio.com/items?itemName=kaixa.masm-code)、[x86 and x86_64 Assembly](https://marketplace.visualstudio.com/items?itemName=13xforever.language-x86-64-assembly)等。本插件主要功能如下：

1. 同时支持调用**TASM和MASM**: 可以在设置（首选项）中修改使用MASM还是TASM
2. 编辑器**右键菜单**：在汇编语言的编辑器添加了“打开dosbox，运行，调试”的三个选项
3. **安装即用**：已将相关工具与插件打包在一起，无需额外配置，建议与TASM或者MASM的语法高亮插件配合使用。也因此*本插件只适用于windows*
4. 提供diagnose**问题输出**功能
5. 调用[dosbox](https://www.dosbox.com)和[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)模拟16位系统环境，运行相关组件

十分感谢以上提到的软件！插件难免会有一些bug，欢迎到github发[issue](https://github.com/xsro/masm-tasm/issues)以及PR，大家一起交流和完善。如果不想用插件可以选择参考[VSC-ASMtasks](https://github.com/xsro/VSC-ASMtasks)通过自定义VSCode任务的方式实现部分功能，如果需要测试用的代码可以到[VSCtasks wiki](https://github.com/xsro/VSC-ASMtasks/wiki/dosbox)、[cltasm](https://gitee.com/chenliucx/CLTASM/tree/code/)中找到一些有意思的代码。

## Features主要功能

当目前编辑器为汇编文件时，在编辑器界面右键菜单中会提供以下三个选项：

1. 打开dosbox并配置环境(挂载)：手动在打开的dosbox窗口进行[汇编相关操作](https://github.com/xsro/masm-tasm/blob/master/doc/在dosbox中手动操作.md)
2. 运行当前程序(汇编+链接+运行)：默认是生成exe
3. 调试当前程序(汇编+链接+调试)：使用masm则会调用debug调试，使用tasm会调用td调试

### Demo1 使用MASM（via msdos-player）

![demo msdos-player masm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_msdos_masm.gif)

### Demo2 使用TASM(via dosbox)

![demo dosbox tasm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_dosbox_tasm.gif)

### Demo3 打开dosbox，适合进行更多自定义操作

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/master/pics/opendosbox.gif)

### Demo4 错误信息输出及清除

![diagnose](https://github.com/xsro/masm-tasm/raw/master/pics/demo_diagnose_tasm.gif)

插件工作时会将VSCode当前编辑器的文件（注意保存）复制到工作文件夹，启动dosbox 挂载相关目录，添加汇编工具集到path。这样就可以在dosbox窗口运行相关工具。此时d盘的T.ASM文件即为VSCode编辑器当前文件，你可以对他进行汇编、链接、运行、调试等操作。当使用2、3功能并且通过msdos或者auto模式运行调试代码的时候，如果出错会在问题面板中显示错误信息，如果想要清除可以在命令面板输入“清除MASM/TASM的所有问题信息”来实现。

## Extension Settings拓展设置

要实现Demo中的功能需要在拓展中进行设置，同时设置中还有一些选项，以提供更大的灵活性

- 汇编工具使用`MASM`还是`TASM`
- 16位模拟器使用dosbox还是msdos-player
  - DOSBox更加完善
  - msdos-player可以在cmd中运行，但对TD等图形化界面的处理效果不好
  - auto 根据情况选择：
    1. 汇编链接使用msdos-player模拟，更加安静
    2. 运行使用DOSBox，更加直观
    3. 调试中MASM(debug)使用msdos-palyer在windows集成终端中显示（更加美观一些）
    4. 调试中TASM(TD)在DOSBox中运行（目前只能这样）
- 可以调整dosbox窗口大小，dosbox运行程序之后进行上面操作（是否直接退出程序，还是等待字符）
- 启动相关功能之前是否先保存文件（不保存的话，只能操作之前保存的版本，建议保存）
- 设置自定义工具路径,详见:[自定义汇编工具路径](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md#自定义汇编工具路径)

### :point_right:Docs & Thanks & Licenses

- this ext is [MIT license](https://github.com/xsro/masm-tasm/blob/master/LICENSE).
  - thank for [masm-code](https://github.com/Woodykaixa/masm-code),,[msdos player](http://takeda-toshiya.my.coocan.jp/msdos),[dosbox](https://www.dosbox.com)
  - their [info and licences](https://github.com/xsro/masm-tasm/blob/master/doc/liscence.md)
- [关于TASM/MASM汇编工具以及相关软件](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md)
- [一些相关资料:wiki](https://github.com/xsro/VSC-ASMtasks/wiki)

Enjoy!:smile:
