# 16位/32位DOS汇编语言支持

[中文](README.zh.md)|[English](README.md)|
[其他版本](https://github.com/xsro/masm-tasm/releases)

:raising_hand:实现对DOSBox等汇编工具的快速调用。主要针对DOS下的单文件汇编语言学习，可能适合学习《汇编语言》、《微机原理》等课程，主要功能特性如下：

- :bookmark_tabs:（**语法支持**）代码高亮，大纲信息，悬浮提示，代码格式化，错误信息标注功能
- :electric_plug:（**运行调试**）提供编辑器右键菜单选项：在汇编语言的编辑器添加了“打开dosbox，运行，调试”的三个选项
- :bar_chart:提供diagnose**错误信息标注**功能：假如汇编未通过，会根据汇编器输出来标明错误信息与位置，可以在命令面板输入`清除MASM/TASM的所有问题信息`清除本插件输出的diagnose问题信息
- :computer:使用JS-Dos在VSCode webview中运行程序，支持几乎所有VSCode版本和平台。此外：
  - 对于**windows**使用者，还可以使用DOSBox和[MSDOS player](http://takeda-toshiya.my.coocan.jp/msdos)，并且已将所需的工具打包在插件中，安装即用
  - [其他系统](#非windows使用者)还可以支持DOSBox，需要先手动安装[DOSBox](https://www.dosbox.com)

## :rocket:DEMO示例

### Demo 1: 运行调试代码

| 调用DOSBox运行TASM                                | 调用msdos-player运行MASM                               |
| ------------------------------------------------- | ------------------------------------------------------ |
| ![demo dosbox tasm](pics/demo_dosbox_tasm_zh.gif) | ![demo msdos-player masm](pics/demo_msdos_masm_zh.gif) |

当打开一个`ASM`后缀的汇编文件时，可以在编辑器右击，会出现以下三个选项：

1. 打开DOS环境：打开DOSBox，然后就可以手动在打开的DOSBox窗口输入指令进行操作
2. 运行当前程序(汇编+链接+运行)：生成exe程序并运行
3. 调试当前程序(汇编+链接+调试)：生成exe程序并调试，使用MASM则会调用debug调试，使用TASM会调用td调试

### 运行调试说明

- 如果文件路径对于DOS模拟器来说难以访问，那么插件会把此时编辑器里面的文件**复制**到独立的工作文件，并在这个文件夹中操作文件。如果文件中有相互依赖的关系，如使用了`include`或`extern`这将造成一些困扰
- 然后，插件会根据`首选项-设置`中的设置，调用DOS环境模拟器使用MASM/TASM来进行相应的操作，默认情况下插件使用 `DOSBox` 和 `TASM`，可以在设置中修改这些选项。

### Demo 2: 打开DOSBox手动输入命令

| `Open DOSBox`                          | `Dosbox here`                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| ![Open in Dosbox](pics/opendosbox.gif) | [![pacman](pics/demo_pacman.gif)](https://github.com/dpisdaniel/assembly-pacman) |

- "`Open Emulator`"编辑器命令：会在DOS模拟器中打开文件所在目录。如果文件路径对于dosbox来说难以访问，插件会将编辑器当前文件复制为`T.asm`(对于DOSBox，插件会复制文件到独立工作文件夹，并将该文件夹挂载到DOSBox中的`D:`盘)
- "`Doxbox here`"命令 会直接将当前文件所在文件夹挂载到DOSBox中的“D:"盘，与Open Emulator命令相似，但是默认只会打开DOSBox并且不会自动判断路径是否可以访问。**注意** 这时在DOSBox中的操作会直接影响电脑中该文件夹中的**文件**，而且通常都是不可逆的
- 汇编常用命令: [ASM_commands](https://github.com/xsro/masm-tasm/wiki/ASM_commands).
- 有些有趣的汇编代码: [DOSBox ASM codes](https://github.com/xsro/masm-tasm/wiki/dosbox)

### Demo 3: 代码格式化与错误输出

| 格式化代码                                                  | 错误信息输出                                |
| ----------------------------------------------------------- | ------------------------------------------- |
| ![programmatic lanaguage features](pics/demo_PLFeature.gif) | ![diagnose](pics/demo_diagnose_tasm_zh.gif) |

提供一些“编程语言特性”（悬浮提示，代码格式化，跳到定义，查看引用）来方便代码编写与阅读，如果不喜欢可以在设置`masmtasm.language.Hover`，`masmtasm.language.programmaticFeatures`中关闭，重启之后会生效。由于我学得不得行，所以对于插件对于多文件的支持不是很好，这些功能对多文件的汇编都支持得不是很好或者根本不支持。

## 非windows使用者

可以从[DOSBox](https://www.dosbox.com)官网下载安装dosbox，并设置环境变量，或者使用命令行工具，如ubuntu的`apt`

```bash
sudo apt install dosbox #安装dosbox
dosbox #打开dosbox，假如成功打开dosbox则安装成功，那么插件插件也能调用
```

- 对于MAC系统，安装DOSBox需要将下载的dmg文件双击打开，并把里面的文件DOSBox程序文件拖到mac的应用程序（application）文件夹中。插件将使用终端命令`open -a DOSBox --args`来启动DOSBox
- 对于其他系统，理论上说只要能在命令行执行`dosbox`命令打开DOSBox（nodejs 的child_process.exec('dosbox')命令），就可以使用本插件了
- 也可以设置`masmtasm.dosbox.command`来自定义打开DOSBox的命令

## :point_right:Extension Settings主要拓展设置

详见`首选项->设置`界面，这里罗列一些可能比较重要的设置选项

- `masmtasm.ASM.MASMorTASM`：汇编工具使用`MASM`还是`TASM`
- `masmtasm.ASM.emulator`：16位模拟器使用`dosbox`还是`msdos-player`
  - jsdos: （推荐，但是有时无法正常工作）在VSCode Webview中运行，可以跨平台
  - dosbox: （默认模式）最稳定
  - msdos player: 可以在cmd中运行，不会弹出窗口，但对TD等图形化界面的处理效果不好
  - auto: 使用dosbox和msdos
    1. 汇编链接使用msdos-player模拟，会比较安静
    2. 运行使用DOSBox，更加直观稳定
    3. 调试中MASM(debug)使用msdos-palyer在windows集成终端中显示（更加美观一些）
    4. 调试中TASM(TD)在DOSBox中运行（目前只能这样）
- `masmtasm.ASM.savefirst`：启动相关功能之前是否先保存文件（不保存的话，只能操作之前保存的版本，建议保存）
- `masmtasm.dosbox.run`：规定dosbox运行程序之后进行什么操作
- `masmtasm.ASM.toolspath`：(通常不需要)设置自定义汇编工具路径,详见:[插件如何使用汇编工具](#插件如何使用汇编工具)
- `masmtasm.dosbox.config`: 设置DOSBox的配置信息，信息会被写入dosbox的配置文件中，可以通过这个选项设置**DOSBox窗口大小**

```jsonc
{
  "masmtasm.dosbox.config": {
          "SDL.windowresolution": "1024x640",//通过这个选项可以调整屏幕的大小
          "SDL.output": "opengl"
      },
  "masmtasm.ASM.toolspath": "E:\\tools"//设置自定义的汇编工具地址，将读取此路径下的masm文件夹和tasm文件夹
}
```

## :cd:插件调用dosbox时会挂载哪些目录

| DOSBox | 电脑中的真实目录 |
| ------ | ---------------- |
| C:     | 汇编工具目录     |
| D:     | 插件汇编工作目录 |

### 待解决的问题

由于已经不学微机了，可能没有太多时间解决这些问题了

- [ ] 如何支持多文件，多模块汇编，优化相关的汇编语言语法支持与运行调试支持
- [ ] 优化代码格式化的方式，使之更美观，并适配对于制表符和空格符号的区分
- [ ] 提供LSP

## 汇编工具相关信息

### 插件如何使用汇编工具

默认使用打包在插件中的汇编和DOS模拟工具，他们位于[插件安装目录](#插件安装路径一般在哪里)下的tools文件夹
自带的汇编工具版本信息：[tools/README](tools/README.md)。

如果需要使用不同版本的软件，可以自定义汇编工具路径。将文件路径复制到设置中即可。插件会从对应的文件夹中寻找相关组件,注意windows下如果通过json设置需要使用`\\`，首选项中设置直接使用`\`即可。

如果设置了`masmtasm.ASM.toolspath`插件会直接使用这个路径下的工具，由于插件不会检查文件结构，这很可能造成问题。因此自定义汇编工具集地址时，需要与[内置的工具tools/](tools/)文件结构相同，至少包含这些文件及它们的依赖才能使用。

### 插件安装路径一般在哪里

VSCode文档中关于插件安装路径的说明[VSCode-doc](https://code.visualstudio.com/docs/editor/extension-gallery#_where-are-extensions-installed)，摘录如下

- Windows `%USERPROFILE%\.vscode\extensions`
- macOS `~/.vscode/extensions`
- Linux `~/.vscode/extensions`

### :clap:文档 & 感谢 & 许可

- 感谢南邮韩老师的《微型计算机原理与接口技术》课程
- 该插件受[Woodykaixa](https://github.com/Woodykaixa)的 [masm-code](https://github.com/Woodykaixa/masm-code)启发
- 插件通过[DOSBox](https://www.dosbox.com)、[caiiiycuk](https://github.com/caiiiycuk)的[JS DOS](https://js-dos.com/) 和[MSDOS player](http://takeda-toshiya.my.coocan.jp/msdos)和模拟DOS环境
- 插件使用了[Roncho](https://marketplace.visualstudio.com/publishers/Roncho)的[Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086)中的汇编语法信息
- 一些[相关信息](doc/license_and_info.md)和[鸣谢](doc/Thanks.md)
- gitee 上的一些笔记和代码: [笔记](https://dosasm.gitee.io/),[代码](https://gitee.com/dosasm/asmcodes)
- 一些相关资料：[wiki](https://github.com/xsro/masm-tasm/wiki)
- 插件难免会有一些bug，欢迎到github发[issue](https://github.com/xsro/masm-tasm/issues)或者邮件`xsro@foxmail.com`，一起交流和完善。

Enjoy!:smile:
