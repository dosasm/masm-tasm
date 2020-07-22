# A solution to run 16-bit ASM code in windows

这是一个插件本来是我fork"[masm-code](https://github.com/Woodykaixa/masm-code)"后在这个插件的基础上修改的,使用[dosbox](dosbox.com)和[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)模拟16位系统环境，实现了快速调用相关汇编组件来编译运行以及调试功能。十分感谢以上软件！

**只适用于windows系统**。已将相关工具与插件打包在一起，无需手动安装。如果不想用插件可以选择参考[github](https://github.com/xsro/VSC-ASMtasks)自定义VSCode任务。

- [关于TASM/MASM汇编工具以及相关软件](https://github.com/xsro/masm-tasm/blob/master/doc/关于汇编工具路径.md)

## Features主要功能

当工作区有asm后缀的文件时插件会启动，当前编辑器为`.ASM`汇编文件时，在编辑器界面右键会提供三个选项（用来实现打开dosbox，运行代码，调试代码三种操作）。

1. 打开dosbox并配置环境(挂载)：将当前编辑器的文件（注意保存）复制到工作文件夹，启动dosbox 挂载相关目录，添加汇编工具集到path。这样就可以在dosbox窗口运行相关工具
2. 运行当前程序(汇编+链接+运行)
3. 调试当前程序(汇编+链接+调试)

![Open in Dosbox](https://github.com/xsro/masm-tasm/raw/dev/pics/opendosbox.gif)

## Extension Settings拓展设置

可以在设置中修改相关配置来决定dosbox窗口大小，使用TASM还是MASM，是否使用msdos替代dosbox等选项。

### 自定义汇编工具路径

将文件路径复制到设置中即可。

![set the tool path](https://github.com/xsro/masm-tasm/raw/dev/pics/settools.gif)

需要使用的16位环境模拟工具和汇编工具可以参考：[github](https://github.com/xsro/VSC-ASMtasks/releases)

<!-- ## Release Notes

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z. -->
