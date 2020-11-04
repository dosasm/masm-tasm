# 16位/32位汇编语言开发工具

[中文](https://github.com/xsro/masm-tasm/blob/main/doc/README_zh.md)|[English](https://github.com/xsro/masm-tasm/blob/main/README.md)|[其他版本](https://github.com/xsro/masm-tasm/releases)

:raising_hand:在学习《微型计算机原理与接口技术》的**汇编语言**部分时，苦于没有比较顺手的编程环境，此插件实现了在VSCode中对DOSBox等汇编工具的快速调用。主要功能特性如下：

- （**语法支持**）代码高亮，大纲信息，悬浮提示，代码格式化，错误信息标注功能
- （**运行调试**）提供编辑器右键菜单选项：在汇编语言的编辑器添加了“打开dosbox，运行，调试”的三个选项
-  提供diagnose**错误信息标注**功能：假如汇编未通过，会根据汇编器输出来标明错误信息与位置，可以在命令面板输入`清除MASM/TASM的所有问题信息`清除本插件输出的diagnose问题信息
- 对于**windows**使用者，已将所需的工具打包在插件中，安装即用
- [其他系统](#非windows使用者)的使用者需要先手动安装[DOSBox](https://www.dosbox.com)

## :wave:Features主要功能

当编辑器为汇编文件时，在编辑器界面右键菜单中会提供以下三个选项，插件会将编辑器当前文件复制到一个“相对安全”的位置作为`T.ASM`，此时DOSBox中的`D:\T.ASM`即为编辑器文件的副本。插件会根据`首选项-设置`中的设置，调用DOSBox或者msdos使用MASM/TASM来进行下列操作：

1. 打开dosbox并配置环境(挂载)：打开DOSBox，然后就可以手动在打开的DOSBox窗口输入指令进行操作
2. 运行当前程序(汇编+链接+运行)：生成exe程序并运行
3. 调试当前程序(汇编+链接+调试)：生成exe程序并调试，使用MASM则会调用debug调试，使用TASM会调用td调试

## DEMO示例

### Demo 1: 运行调试代码

| 调用DOSBox运行TASM                                   | 调用msdos-player运行MASM                                  |
| ---------------------------------------------------- | --------------------------------------------------------- |
| ![demo dosbox tasm](../pics/demo_dosbox_tasm_zh.gif) | ![demo msdos-player masm](../pics/demo_msdos_masm_zh.gif) |

当打开一个`ASM`后缀的汇编文件时，可以在编辑器右击，会出现三个选项来运行或者调试代码。默认使用 `DOSBox` 和 `TASM`。可以在设置中修改

### Demo 2: 代码格式化与错误输出

| 格式化代码                                                     | 错误信息输出                                   |
| -------------------------------------------------------------- | ---------------------------------------------- |
| ![programmatic lanaguage features](../pics/demo_PLFeature.gif) | ![diagnose](../pics/demo_diagnose_tasm_zh.gif) |

提供一些“编程语言特性”（悬浮提示，代码格式化，跳到定义，查看引用）来方便代码编写与阅读，如果不喜欢可以在设置中关闭，重启之后会生效

### Demo 3: 打开DOSBox手动输入命令

| `Open DOSBox`适合单个文件的情况           | `Dosbox here`适合多个文件的情况                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| ![Open in Dosbox](../pics/opendosbox.gif) | [![pacman](../pics/demo_pacman.gif)](https://github.com/dpisdaniel/assembly-pacman) |

- "`Open DOSBox`"命令 会将编辑器当前文件复制到临时文件夹，并将该文件夹挂载到DOSBox中的“D:”盘，也就是说这时DOSBox中的D盘文件T.ASM就是VSCode当前文件的副本
- "`Doxbox here`"命令 会直接将当前文件所在文件夹挂载到DOSBox中的“E:"盘，也就是说这时DOSBox中的E盘内容就是当前编辑器文件所在文件夹里的内容，**注意** 在DOSBox中的操作会直接影响电脑中该文件夹中的**文件**，而且通常都是不可逆的
- 汇编常用命令: [ASM_commands](https://github.com/xsro/masm-tasm/wiki/ASM_commands).
- 有些有趣的汇编代码: [DOSBox ASM codes](https://github.com/xsro/masm-tasm/wiki/dosbox)

# 非windows使用者

可以从[DOSBox](https://www.dosbox.com)官网下载安装dosbox，并设置环境变量，或者使用命令行工具，如ubuntu的`apt`

```bash
sudo apt install dosbox #安装dosbox
dosbox #打开dosbox，假如成功打开dosbox则安装成功，那么插件插件也能调用
```

- 对于MAC系统，安装DOSBox需要将下载的dmg文件双击打开，并把里面的文件DOSBox程序文件拖到mac的应用程序（application）文件夹中。插件将使用终端命令`open -a DOSBox --args`来启动DOSBox
- 对于其他系统，理论上说只要能在命令行执行`dosbox`命令打开DOSBox（nodejs 的child_process.exec(dosbox)命令），就可以使用本插件了
- 也可以设置`masmtasm.dosbox.command`来自定义打开DOSBox的命令

## :point_right:Extension Settings主要拓展设置

详见`首选项->设置`界面，这里罗列一些可能比较重要的设置选项

- `masmtasm.ASM.MASMorTASM`：汇编工具使用`MASM`还是`TASM`
- `masmtasm.ASM.emulator`：16位模拟器使用`dosbox`还是`msdos-player`
  - DOSBox: （默认模式）更加完善
  - msdos-player: 可以在cmd中运行，不会弹出窗口，但对TD等图形化界面的处理效果不好
  - auto: （推荐，但是有时无法工作）根据情况选择模拟工具：
    1. 汇编链接使用msdos-player模拟，会比较安静
    2. 运行使用DOSBox，更加直观稳定
    3. 调试中MASM(debug)使用msdos-palyer在windows集成终端中显示（更加美观一些）
    4. 调试中TASM(TD)在DOSBox中运行（目前只能这样）
- `masmtasm.ASM.savefirst`：启动相关功能之前是否先保存文件（不保存的话，只能操作之前保存的版本，建议保存）
- `masmtasm.dosbox.run`：规定dosbox运行程序之后进行什么操作（是否直接退出程序，还是等待）
- `masmtasm.dosbox.CustomResolution`：调整dosbox窗口大小
- `masmtasm.ASM.toolspath`：设置自定义汇编工具路径,详见:[自定义汇编工具路径](./Toolspath.md#自定义汇编工具路径)

### :clap:文档 & 感谢 & 许可

- 该插件受[Woodykaixa](https://github.com/Woodykaixa)的 [masm-code](https://github.com/Woodykaixa/masm-code)启发
- 非常感谢[Roncho](https://marketplace.visualstudio.com/publishers/Roncho)的[Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086)中的汇编语法信息
- 插件通过[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)和[dosbox](https://www.dosbox.com)模拟DOS环境
- 一些[相关信息](doc/license_and_info.md)
- 关于插件对汇编工具的使用：[Toolspath](./Toolspath.md)
- 一些相关资料：[wiki](https://github.com/xsro/masm-tasm/wiki)
- 插件难免会有一些bug，欢迎到github发[issue](https://github.com/xsro/masm-tasm/issues)或者邮件`xsro@foxmail.com`，一起交流和完善。

Enjoy!:smile:
