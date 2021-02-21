# Change Log

## A VSCode Extension for learning DOS assembly(MASM/TASM) via DOSBox

## 0.9.0

- 悬浮提示信息：增加从[felixcloutier(https://www.felixcloutier.com/x86/)、[msvc](https://docs.microsoft.com/cpp/assembler/masm/）中加载信息

## 0.8.0

- 重构代码，增加对jsdos的支持，可以在webview中查看程序运行效果，jsdos使用的wdosbox目前看来可能不稳定，插件对其适配也可能有不足之处。
- 美化输出面板格式，更新插件激活逻辑
- 优先不进行文件的复制过程，当插件认为文件的路径不符合DOSBox等模拟器的文件系统要求时，进行复制操作。
- (0.8.1)修复问题
- (0.8.2)
  - 修复*问题输出*相关的一些问题
  - jsdos模式下复制文件到webview时，使插件自动清除只有注释的行，因为不清除似乎会出现`非法指令`的报错
- (0.8.3)fix #15: 使用dosbox调试代码的时候误调用运行代码的指令

## 0.7.0

- 升级msdos player到 4/10/2020 i486 x86 version
- 为了避免一些路径上的问题，使用msdos player时会把相关工具复制到`c:\\.dosasm`，在无需使用该插件后，可以删除它（我想让插件能够自动删除，但是害怕误操作）

## 0.6.0/0.6.1/0.6.2

- 通过终端命令`open -a DOSBox --args <dosbox args>`支持在MAC（darwin）中打开dosbox
- 支持通过设置`masmtasm.dosbox.command`自定义用来打开DOSBox的命令
- 0.6.1
  - 修复[#10](https://github.com/xsro/masm-tasm/issues/10) 中`jle`和`jge`两条指令的悬浮提示错误
- 0.6.2
  - 废弃`masmtasm.dosbox.CustomResolution`设置选项，通过`masmtasm.dosbox.config`来支持更多的dosbox选项
  - 提供MASM的部分错误信息跳转到Microsoft docs页面的CodeAction
- 0.6.3 修复dosbox here不切换盘符的小问题
  - 假如使用dosbox here时没有打开的文件，那么就使用打开的文件夹来挂载

## 0.5.0-0.5.3

- MASM插件更新到 `6.11`，最近在想如何支持`masm6.x`语法
- 尝试用异步重写了一些代码，希望不要引入bug
- (0.5.2)修复由于masm无法脱离ml运行而引发的问题
- (0.5.3)修复有些情况会调用错误的dos模拟器的问题
- 如果仍然有问题，可以安装历史版本推荐`0.4.0`,`0.5.0-0.5.2`可能有致命问题不推荐

### 0.4.0

- fix [#6](https://github.com/xsro/masm-tasm/issues/6): 修复打开单个汇编文件插件不激活的问题
  - 假如文件languageID是assembly,masm,tasm时插件会激活
- 增加一个设置选项`masmtasm.language.Hover`以决定是否显示悬浮提示Hover

### 0.3.0

- windows下打开dosbox会弹出控制台窗口，可以在设置`masmtasm.dosbox.console`中选择显示，最小化还是不显示这个窗口。
- (0.3.1)dosbox更新到0.74-3
- (0.3.1)修复Dosbox无法挂载带有中文的路径的问题[#5](https://github.com/xsro/masm-tasm/issues/5)

### 0.2.2/0.2.3

- 经过测试(win10下测试的)需要的vscode版本在March 2020 (version 1.44)以上
- 优化代码格式化效果（最好先试试效果喜不喜欢再使用哈）
- 优化语言语法配置
- 0.2.3优化大纲视图与格式化

### 0.2.1

- [x] 增加了一个命令`dosbox here`在当前文件所在目录下打开dosbox，来提供更加自由的操作，见demo
- [x] 优化diagnose对fatal类错误的匹配,优化大纲视图
- [x] 提供代码格式化功能（不太完善）
- [x] 提供查找引用功能

鉴于这些功能目前可能不完善，你可以在设置中关闭他们（关闭后需要手动重启）

DEMO `dosbox here`:(代码来自[dpisdaniel/assembly-pacman](https://github.com/dpisdaniel/assembly-pacman))

1. 打开命令面板，win下为`ctrl+shift+p`
2. 在打开的dosbox窗口，输入汇编、链接、运行命令`tasm projf`,`tlink projf`,`projf`

![demo pacman](https://github.com/xsro/masm-tasm/raw/main/pics/demo_pacman.gif)

## 0.2.0

- [x] DOS 汇编基本的语法支持
- [x] vscode 界面的大纲视图的简单实现

汇编语言支持的symbol大概有以下几种，但是vscode的[SymbolKind](https://code.visualstudio.com/api/references/vscode-api#SymbolKind)却与它们不对应，我决定做一些[对应](doc/Notes.md#1)

### 0.1.4

- 使用[Roncho](https://marketplace.visualstudio.com/publishers/Roncho)'s extension [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086)来实现对汇编语法的支持
- hover等功能还有待完善，可以在设置中关闭
- 一些i18n支持（en和zh-cn)
- 由于我在同学的电脑上使用auto模式会出现问题 我决定暂时使用`dosbox`模式作为默认模式，这个bug目前还不知道怎么解决，但是感觉多数电脑不会出现这种情况，可以用`auto`或者`msdos`模式的可以在设置中修改

### 0.1.2/0.1.3

- 注意0.1.1以后在设置中有少许调整
- 将脚本部分与工具分离，使得可以更加方便地自定义工具集
- 更加快速反应用户变更
- 美化输出面板的展示
- （0.1.3）简单实现本地化

### 0.1.1

- 注意本次更新修改了一些配置选项
- 简单实现了dosbox下的输出问题匹配
- 简单增加上了对linux的支持
- 增加了对脚本的依赖

## 0.1.0 [2020/7/31]

基本实现了与dos模拟器交互的主要功能了，应该稳定了。渴求反馈哈

### 0.0.10/0.0.11

增加对带空格路径的优化，完善文档以及readme，修复某一次修改引起的masm错误信息显示不全的问题.0.0.11修复了文档中显示dosbox链接的问题

### 0.0.8/0.0.9

- [x] (0.0.8)diagnose 精准显示（目前是从非空格行首显示到分号处（或行末尾），还需要完善）
- [x] (0.0.9)TASM中宏语法的错误，将宏中错误的地方也显示出来

实现diagnose问题信息的相对精准地显示，提供一个命令，打开命令面板之后可以使用“清除MASM/TASM的所有问题信息”清除diagnose信息。

### 0.0.5/0.0.6/0.0.7 处理汇编器的输出信息

增加一个auto模式，在汇编链接时调用msdos-player，（比较安静）在运行时使用dosbox，在使用TASM TD调试时使用dosbox（msdos会显示异常），在使用masm debug的时候使用msdos，这样直接在终端中显示会比较舒服。

1. 0.0.6：修复检测错误不全的问题，应该没有大问题了
2. 0.0.7: 修复dosbox中调用失灵的问题

- [x] 增加问题匹配功能，*已经可以提供一个简单的匹配功能了*
- [x] 在运行和调试之前先diagnose

### 0.0.2/0.0.3/0.0.4

1. 0.0.2使用batch来简化msdos的调用，将需要的工具和插件一起打包，（基本失去支持除了windows系统以外系统的可能）。
2. 0.0.3修复了一个terminal.sendtext 传递的内容被吞掉了开头的一个字符的问题，简单地增加了一些空格，并没有根除问题。
3. 0.0.4使用child_process来替换掉一些vscode.terminal 应该解决了0.0.2中发现的问题了

### 0.0.1

初步完成一些对dosbox和msdos的简单调用还显得不是很完善

- [x] 实现在msdos之下运行调试MASM程序，运行TASM程序
- [x] 实现Dosbox来进行相关功能调用

### [Prereleased]

在学习南邮的《微机原理与接口技术》的时候，苦于没有比较好的汇编环境，一开始使用的dosbox里面的`edit.com` 后来使用的`notepad++`, 最近接触了`VSCode`，发现里面有`masm-code`这个插件可以基本很好地实现汇编操作，但是不支持TASM，下载相关组件有时会失败，于是决定在这个插件的基础上修改，并发布了这个插件，非常感谢。
