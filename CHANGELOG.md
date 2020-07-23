# Change Log

All notable changes to the "masm-tasm" extension will be documented in this file.

## 近期目标

- [ ] 在运行和调试之前先diagnose，即mixed模块
  - [ ] 提供tasks来实现调试工作
  - [ ] 增加问题匹配功能，*已经可以提供一个简单的匹配功能了*
- [ ] bug：每次一开始启动的时候需要点击两次,第一次不起作用

### 0.0.2/0.0.3/0.0.4

- 0.0.2使用batch来简化msdos的调用，将需要的工具和插件一起打包，（基本失去支持除了windows系统以外系统的可能）。
- 0.0.3修复了一个terminal.sendtext 传递的内容被吞掉了开头的一个字符的问题，简单地增加了一些空格，并没有根除问题。
- 0.0.4使用child_process来替换掉一些vscode.terminal 应该解决了0.0.2中发现的问题了

- [ ] 实现根据情况自动下载相关组件 *废弃*

### 0.0.1

初步完成一些对dosbox和msdos的简单调用还显得不是很完善

- [x] 实现在msdos之下运行调试MASM程序，运行TASM程序
- [x] 实现Dosbox直线来进行相关功能调用

### [Unreleased]

---nothing---
