# Change Log

All notable changes to the "masm-tasm" extension will be documented in this file. Welcome [issue](https://github.com/xsro/masm-tasm/issues) and PR

## welcome any feedback

## 0.2.1

- [x] `dosbox here`增加了一个命令以在当前文件所在目录下打开dosbox，来提供更加自由的操作，见demo
- [x] 优化diagnose对fatal类错误的匹配,优化大纲视图

DEMO `dosbox here`示例: 代码来自[dpisdaniel/assembly-pacman](https://github.com/dpisdaniel/assembly-pacman)

![demo pacman](https://github.com/xsro/masm-tasm/raw/next/pics/demo_pacman.gif)

## 0.2.0

- [x] DOS 汇编基本的语法支持
- [x] vscode 界面的大纲视图的简单实现

汇编语言支持的symbol大概有以下几种，但是vscode的[SymbolKind](https://code.visualstudio.com/api/references/vscode-api#SymbolKind)却与它们不对应，我决定做以下对应

|assembly symbol|vscode symbol|汇编关键字|vscode关键字|
|---|---|---|----|
|macro|Module|宏|模块|
|segment|Class|段|类|
|procedure|Function|子程序|函数|
|struct|Struct|结构体|结构体|
|label|Key|标号|键|
|variable|Variable|变量|变量|

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

### 0.0.5/0.0.6/0.0.7

增加一个auto模式，在汇编链接时调用msdos-player，（比较安静）在运行时使用dosbox，在使用TASM TD调试时使用dosbox（msdos会显示异常），在使用masm debug的时候使用msdos，这样直接在终端中显示会比较舒服。（变动有点大，可能会不稳定，欢迎issue和PR呀,估计最近几个版本都是修bug了）

1. 0.0.6：修复检测错误不全的问题，应该没有大问题了
2. 0.0.7: 修复dosbox中调用失灵的问题

- [x] 增加问题匹配功能，*已经可以提供一个简单的匹配功能了*
- [x] 在运行和调试之前先diagnose，即mixed模块

### 0.0.2/0.0.3/0.0.4

1. 0.0.2使用batch来简化msdos的调用，将需要的工具和插件一起打包，（基本失去支持除了windows系统以外系统的可能）。
2. 0.0.3修复了一个terminal.sendtext 传递的内容被吞掉了开头的一个字符的问题，简单地增加了一些空格，并没有根除问题。
3. 0.0.4使用child_process来替换掉一些vscode.terminal 应该解决了0.0.2中发现的问题了

- [ ] 实现根据情况自动下载相关组件 *废弃,已经直接打包在插件里面了*

### 0.0.1

初步完成一些对dosbox和msdos的简单调用还显得不是很完善

- [x] 实现在msdos之下运行调试MASM程序，运行TASM程序
- [x] 实现Dosbox来进行相关功能调用

### [Unreleased]

在学习南邮的《微机原理与接口技术》的时候，苦于没有比较好的汇编环境，一开始使用的dosbox里面的`edit.com` 后来使用的`notepad++`, 最近接触了`VSCode`，发现里面有`masm-code`这个插件可以基本很好地实现汇编操作，但是不支持TASM，下载相关组件有时会失败，于是决定在这个插件的基础上修改，并发布了这个插件，非常感谢。
