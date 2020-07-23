# Change Log

All notable changes to the "masm-tasm" extension will be documented in this file.

## 近期目标

- [ ] daignose 精准显示（目前固定显示在0-10 2-12 上，最好可以定位到行首到行尾显示
- [ ] 提供tasks来实现调试工作
- [ ] bug：每次一开始启动的时候需要点击两次,第一次不起作用
- [ ] LSP和DAP支持（目前对我来说太难了）

### 0.0.5

增加一个auto模式，在汇编链接时调用mosdos，（比较安静）在运行时使用dosbox，在使用TASM TD调试时使用dosbox（msdos会显示异常），在使用masm debug的时候使用msdos，这样直接在终端中显示会比较舒服。（变动有点大，可能会不稳定，欢迎issue和PR呀）

- [x] 增加问题匹配功能，*已经可以提供一个简单的匹配功能了*
- [x] 在运行和调试之前先diagnose，即mixed模块

### 0.0.2/0.0.3/0.0.4

- 0.0.2使用batch来简化msdos的调用，将需要的工具和插件一起打包，（基本失去支持除了windows系统以外系统的可能）。
- 0.0.3修复了一个terminal.sendtext 传递的内容被吞掉了开头的一个字符的问题，简单地增加了一些空格，并没有根除问题。
- 0.0.4使用child_process来替换掉一些vscode.terminal 应该解决了0.0.2中发现的问题了

- [ ] 实现根据情况自动下载相关组件 *废弃,已经直接打包在插件里面了*

### 0.0.1

初步完成一些对dosbox和msdos的简单调用还显得不是很完善

- [x] 实现在msdos之下运行调试MASM程序，运行TASM程序
- [x] 实现Dosbox直线来进行相关功能调用

### [Unreleased]

---nothing---
