# Change Log 更新日志

[email](mailto:xsro@foxmail.com?subject=VSCode_Extension(xsro.masm-tasm)_report&body=hello)|[issue](https://github.com/dosasm/masm-tasm/issues)

### 2.0.0 Use Jsdos as primary emulator 使用Jsdos 作为首选模拟器

- 移除了对MS-DOS的支持。若仍有使用MS-DOS的需求，可回退至1.x版本。JSDOS的Worker模式应能满足当前绝大部分使用场景的需求。
  - MS-DOS support has been removed. If you still need to use MS-DOS, you can revert to version 1.x. The Worker mode of JSDOS should meet the requirements of most current usage scenarios.
- 移除了外部的DOSBox软件，不再依赖另一个插件[vscode-dosbox](https://marketplace.visualstudio.com/items?itemName=xsro.vscode-dosbox)方便维护。
  - remove the bundled dosbox binary and remove the dependent of [vscode-dosbox](https://marketplace.visualstudio.com/items?itemName=xsro.vscode-dosbox)
- 重构了ASM相关代码模块，原代码的调试与可读性较差。
  - Refactored the ASM-related code modules, as the original code was difficult to debug and read.
- 合并了PR [#60](https://github.com/dosasm/masm-tasm/pull/60)，感谢[Gerrnperl](https://github.com/Gerrnperl)的贡献。
  - Merged PR [#60](https://github.com/dosasm/masm-tasm/pull/60), thanks to [Gerrnperl](https://github.com/Gerrnperl) for their contribution.

原有CHANGELOG已迁移至[dev/doc/CHANGELOGv1-2.md](https://github.com/dosasm/masm-tasm/blob/v2/dev/doc/CHANGELOGv1-2.md)。感谢大语言模型在代码编写过程中提供的帮助。
The original CHANGELOG has been moved to [dev/doc/CHANGELOGv1-2.md](https://github.com/dosasm/masm-tasm/blob/v2/dev/doc/CHANGELOGv1-2.md). Thanks to the large language model for the assistance in code writing.