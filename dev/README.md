# Development Tips

The project was originally developed when I was studying assembly language at [NJUPT](https://www.njupt.edu.cn).  
Now in 2026, programming assisted by AI tools such as ChatGPT and Gemini has eased the development of VSCode extensions.  
Thanks to the work on [caiiiycuk](https://github.com/caiiiycuk)'s [js-dos](https://github.com/js-dos), we can now use a DOS emulator entirely in Node.js and browser environments.
Additionally, as more features have been requested in the [GitHub issues](https://github.com/dosasm/masm-tasm/issues), I plan to rewrite some code for this old extension.


## Main changes:
- [ ] Remove the dependency on DOSBOX binary files.
- [ ] Remove support for MS-DOS.
- [ ] Add support for more assembly languages, especially the **Symbol Rename** feature.
- [ ] Use js-dos as the primary emulator.
- [ ] To keep this project simple and easy to mantain, **only one emulator instance** is allowed in the simulation. (When use binary dosbox, the extension doesn't check this, but it is also highly recommmend)

## How to build these files

This project depends on the assembly tools packaged in [assembly-tool](https://github.com/dosasm/assembly-tool).
Therefore, ensure this project is in the same directory as the `assembly-tool` project.

```
git clone https://github.com/dosasm/assembly-tool
git clone -b dev/2026 https://github.com/dosasm/masm-tasm
cd masm-tasm
pnpm install
pnpm compile-webview
pnpm compile-dev
```

## Main references

- The js-dos emulator is based on <https://github.com/caiiiycuk/emulators>. My fork is available at <https://github.com/dosasm/emulators/>.
- The frontend code is based on <https://github.com/caiiiycuk/js-dos>.
- The reference manuals for DOSBox and DOSBox-X are also helpful.

## DOS环境模拟程序运行逻辑 中文

由于DOS模拟器一般都只支持8.3的文件格式，所以我们需要设置一个模拟器与设计系统的文件同步方案。
本项目考虑到汇编语言的实际开发需求，一般做如下约定：

1. C盘作为编程工具的目录
2. D盘作为文件工作区的目录，默认使用workspace方式，即将当前的工作目录映射到D盘。

