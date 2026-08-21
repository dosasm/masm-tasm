# Development Tips

The project was originally developed when I was studying assembly language at [NJUPT](https://www.njupt.edu.cn).  
Now in 2026, programming assisted by AI tools such as ChatGPT and Gemini has eased the development of VSCode extensions.  
Thanks to the work on [caiiiycuk](https://github.com/caiiiycuk)'s [js-dos](https://github.com/js-dos), we can now use a DOS emulator entirely in Node.js and browser environments.
Additionally, as more features have been requested in the [GitHub issues](https://github.com/dosasm/masm-tasm/issues), I plan to rewrite some code for this old extension.


## Main changes:
- [x] Remove the dependency on DOSBOX binary files.
- [x] Remove support for MS-DOS.
- [x] Add support for more assembly languages, especially the **Symbol Rename** feature.
- [x] Use js-dos as the primary emulator.


## How to build these files

This project depends on the assembly tools packaged in [assembly-tool](https://github.com/dosasm/assembly-tool).
Therefore, ensure this project is in the same directory as the `assembly-tool` project.

```
git clone https://github.com/dosasm/assembly-tool
git clone https://github.com/dosasm/masm-tasm
cd masm-tasm
pnpm install
pnpm compile-dev
```

To generate `visx` package

```sh
pnpx vsce package
```

Press <kbd>F5</kbd> or Click `run` -> `Start Debugging`

## Publish

Upload the package file at [marketplace](https://marketplace.visualstudio.com/manage/publishers/xsro)

## Main references

- The js-dos emulator is based on <https://github.com/caiiiycuk/emulators>. My fork is available at <https://github.com/dosasm/emulators/>.
- The frontend code is based on <https://github.com/caiiiycuk/js-dos>.
- The reference manuals for DOSBox and DOSBox-X are also helpful.

## DOS环境模拟程序运行逻辑 中文

由于DOS模拟器一般都只支持8.3的文件格式，所以我们需要设置一个模拟器与设计系统的文件同步方案。
本项目考虑到汇编语言的实际开发需求，一般做如下约定：

1. C盘作为编程工具的目录
2. D盘作为文件工作区的目录，默认使用workspace方式，即将当前的工作目录映射到D盘。

