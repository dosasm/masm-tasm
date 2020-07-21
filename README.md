# masm-tasm README

这是一个插件是我fork[masm-code](https://github.com/Woodykaixa/masm-code)后在这个插件的基础上修改的,受益于[dosbox](dosbox.com)和[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)两个16位系统模拟软件的插件，实现了快速调用相关汇编组件来编译运行。十分感谢以上软件！

这个插件在windows上开发的目前也就只支持windows系统。如果只是想要快速编译运行的话，这个插件还是很适合你的，如果不想用插件可以选择参考[github](https://github.com/xsro/VSC-ASMtasks)实现大部分功能。`masm-code`也很好，我还没有深度体验。

## Features主要功能

`.ASM`汇编文件时，在编辑器界面右键会提供三个选项（用来实现打开dosbox，运行代码，调试代码三种操作）。

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/dev/pics/opendosbox.gif)

- 打开dosbox并配置环境(挂载)：将当前编辑器的文件（注意保存）复制到工作文件夹，启动dosbox 挂载相关目录，添加汇编工具集到path。这样就可以在dosbox窗口运行相关工具
- 运行当前程序(汇编+链接+运行)：
- 调试当前程序(汇编+链接+调试)：

## Requirements首先需要做的事情

首先需要下载需要使用的16位环境模拟工具和汇编工具
首先需要下载汇编工具集，下载地址：[github](https://github.com/xsro/VSC-ASMtasks/releases)、[gitee](https://gitee.com/chenliucx/VSC-ASMtasks/releases)。
下载完成之后解压文件夹，将文件路径复制到设置中即可。

![set the tool path](https://github.com/xsro/masm-tasm/raw/dev/pics/settools.gif)

## Extension Settings拓展设置

可以在设置中修改相关配置来决定dosbox窗口大小，使用TASM还是MASM，是否使用msdos等。

<!-- ## Release Notes

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z. -->
