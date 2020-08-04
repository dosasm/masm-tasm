# 16位/32位汇编语言开发环境

[English](https://github.com/xsro/masm-tasm/blob/master/doc/README.md)

在学习《微型计算机原理与接口技术》的**汇编语言**部分时，苦于没有比较顺手的编程环境，我在"[masm-code](https://github.com/Woodykaixa/masm-code)"的基础上编写了这个插件，实现了在VSCode中对DOSBox等汇编工具的快速调用。本插件主要功能特性如下：

1. 同时支持调用**TASM和MASM**: 可以在设置（首选项）中修改使用MASM还是TASM工具集
2. 提供编辑器**右键菜单**：在汇编语言的编辑器添加了“打开dosbox，运行，调试”的三个选项
3. **安装即用**：已将相关工具与插件打包在一起，无需配置或安装其他东西
4. 提供diagnose**问题输出**功能：假如汇编未通过，会标明错误信息与位置
5. 调用[dosbox](https://www.dosbox.com)和[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)模拟16位系统环境，运行相关组件

十分感谢以上软件！插件难免会有一些bug，欢迎到github发[issue](https://github.com/xsro/masm-tasm/issues)以及PR，大家一起交流和完善。

## 安装要求

- windows 无需其他操作，相关软件已打包在插件之中
- linux 请先安装dosbox [详情](https://github.com/xsro/masm-tasm/blob/master/doc/非windows下使用.md#linux)

## Features主要功能

当编辑器为汇编文件时，在编辑器界面右键菜单中会提供以下三个选项：

1. 打开dosbox并配置环境(挂载)：打开DOSBox，然后就可以手动在打开的DOSBox窗口进行[汇编相关操作](https://github.com/xsro/masm-tasm/blob/master/doc/在dosbox中手动操作.md)
2. 运行当前程序(汇编+链接+运行)：生成exe程序并运行
3. 调试当前程序(汇编+链接+调试)：生成exe程序并调试，使用MASM则会调用debug调试，使用TASM会调用td调试

### Demo 1: 使用MASM（via msdos-player）

![demo msdos-player masm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_msdos_masm.gif)

### Demo 2: 使用TASM(via dosbox)

![demo dosbox tasm](https://github.com/xsro/masm-tasm/raw/master/pics/demo_dosbox_tasm.gif)

### Demo 3: 打开dosbox，适合进行自定义操作，如生成.com程序文件等

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/master/pics/opendosbox.gif)

### Demo 4: 错误信息输出及清除

![diagnose](https://github.com/xsro/masm-tasm/raw/master/pics/demo_diagnose_tasm.gif)

## Some Tips 一些相关信息

- 这个插件专注于汇编的编译运行调试环节，推荐结合汇编语法支持（高亮、代码片段等）的插件一起使用，如：[MASM](https://marketplace.visualstudio.com/items?itemName=bltg-team.masm)、[TASM](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086)、[masm-code](https://marketplace.visualstudio.com/items?itemName=kaixa.masm-code)、[x86 and x86_64 Assembly](https://marketplace.visualstudio.com/items?itemName=13xforever.language-x86-64-assembly)等。
- 一些有趣的汇编代码: [dosbox codes]](https://github.com/xsro/masm-tasm/wiki/dosbox)
- 使用终端任务调用dosbox：[VSC-ASMtasks](https://github.com/xsro/VSC-ASMtasks)
- 通过msdos或者auto模式运行调试代码的时候，如果出错会在问题面板中显示错误信息，如果想要清除可以在命令面板输入`清除MASM/TASM的所有问题信息`来实现。

## Extension Settings拓展设置

要实现Demo中的功能有时会需要在拓展中进行设置，同时设置(首选项）中还有一些其他选项，以提供更大的灵活性。

- 汇编工具使用`MASM`还是`TASM`
- 16位模拟器使用`dosbox`还是`msdos-player`
  - DOSBox: 更加完善
  - msdos-player: 可以在cmd中运行，不会弹出窗口，但对TD等图形化界面的处理效果不好
  - auto 根据情况选择模拟工具：
    1. 汇编链接使用msdos-player模拟，会比较安静
    2. 运行使用DOSBox，更加直观稳定
    3. 调试中MASM(debug)使用msdos-palyer在windows集成终端中显示（更加美观一些）
    4. 调试中TASM(TD)在DOSBox中运行（目前只能这样）
- 调整dosbox窗口大小
- 规定dosbox运行程序之后进行什么操作（是否直接退出程序，还是等待）
- 启动相关功能之前是否先保存文件（不保存的话，只能操作之前保存的版本，建议保存）
- 设置自定义汇编工具路径,详见:[自定义汇编工具路径](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md#自定义汇编工具路径)

### 文档 & 感谢 & 许可

- 这个插件是[MIT license](https://github.com/xsro/masm-tasm/blob/master/LICENSE).
- 感谢[masm-code](https://github.com/Woodykaixa/masm-code),[msdos player](http://takeda-toshiya.my.coocan.jp/msdos),[dosbox](https://www.dosbox.com)
  - 他们的[相关信息](https://github.com/xsro/masm-tasm/blob/master/doc/license_and_info.md)
- [关于TASM/MASM汇编工具以及相关软件](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md)
- [一些相关资料:wiki](https://github.com/xsro/VSC-ASMtasks/wiki)

Enjoy!:smile:
