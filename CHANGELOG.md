# Change Log 更新日志

[email](mailto:xsro@foxmail.com?subject=VSCode_Extension(xsro.masm-tasm)_report&body=hello)|[issue](https://github.com/dosasm/masm-tasm/issues)


#### 2.1.x 使用AI重构代码，实现使用dosasm.jsonc 管理项目

- 修复格式化器：顶层指令（`.386`、`.model`、`.STACK`、`include` 等）不再被错误缩进
- 修复格式化器：空白行保留为空行，不再填充制表符
- 修复格式化器：保留原始操作数间距和注释，不再从 AST 重建指令行
- 修复格式化器：注释不再被意外删除
- 修复格式化器：格式化过程幂等（对已格式化代码再次格式化结果不变）
- 修复解析器：截断文件（缺少闭合符）的块范围正确扩展到最后一个子节点
- 状态栏：拆分为独立的模拟器选择器和汇编器选择器两个按钮
- 模拟器选择 Quick Pick：显示 dosbox / dosbox-x 的实际可执行文件路径
- 2.1.1 配置格式从 TOML 迁移到 JSONC：支持多文件
- 2.1.2 升级 jsdos emulator 到 8.4.1 并 将jsdos-x作为默认仿真工具


 #### 2.1.x Code refactored using AI, project now managed via dosasm.jsonc                                              
                                                                                                                        
 - Fixed formatter: Top-level directives (.386, .model, .STACK, include, etc.) are no longer incorrectly indented       
 - Fixed formatter: Blank lines are preserved as empty lines, no longer filled with tab characters                      
 - Fixed formatter: Original operand spacing and comments are preserved; instruction lines are no longer rebuilt from   
   the AST                                                                                                              
 - Fixed formatter: Comments are no longer accidentally deleted                                                         
 - Fixed formatter: Formatting is idempotent (re-formatting already-formatted code produces the same result)            
 - Fixed parser: Block ranges for truncated files (missing closing delimiters) now correctly extend to the last child   
   node                                                                                                                 
 - Status bar: Split into two independent buttons — emulator selector and assembler selector                            
 - Emulator quick pick: Displays the actual executable path for dosbox / dosbox-x                                       
 - 2.1.1: Configuration format migrated from TOML to JSONC — multi-file support                                         
 - 2.1.2: Upgraded jsdos emulator to 8.4.1 and set jsdos-x as the default emulator 


#### 2.0.x 使用Jsdos 作为首选模拟器

- 移除了对MS-DOS的支持。若仍有使用MS-DOS的需求，可回退至1.x版本。JSDOS的Worker模式应能满足当前绝大部分使用场景的需求。
- 移除了外部的DOSBox软件，不再依赖另一个插件[vscode-dosbox](https://marketplace.visualstudio.com/items?itemName=xsro.vscode-dosbox)，便于维护。
- 重构了ASM相关代码模块，原代码的调试与可读性较差。
- 合并了PR [#60](https://github.com/dosasm/masm-tasm/pull/60)，感谢[Gerrnperl](https://github.com/Gerrnperl)的贡献。
- 2.0.2 增加jsdosX的支持
- 2.0.3 使用MIMO AI重写了语言支持相关的代码，支持重名符号，并使用AI在[dos-assembly-codes](https://github.com/dosasm/dos-assembly-codes)中测试。**注意**：格式化功能和之前相比发生了变更



#### 2.0.x Use Jsdos as primary emulator

- MS-DOS support has been removed. If you still need to use MS-DOS, you can revert to version 1.x. The Worker mode of JSDOS should meet the requirements of most current usage scenarios.
- Removed the bundled DOSBox binary and removed the dependency on the [vscode-dosbox](https://marketplace.visualstudio.com/items?itemName=xsro.vscode-dosbox) extension for easier maintenance.
- Refactored the ASM-related code modules, as the original code was difficult to debug and read.
- Merged PR [#60](https://github.com/dosasm/masm-tasm/pull/60), thanks to [Gerrnperl](https://github.com/Gerrnperl) for their contribution.
- 2.0.2 add the support of jsdosX
- 2.0.3 use MIMO AI to rewrite the code about assembly language support. Now it support symbol rename by F2. The code is tested on [dos-assembly-codes](https://github.com/dosasm/dos-assembly-codes). **NOTE**: code formator is modified


---

原有CHANGELOG已迁移至[dev/doc/CHANGELOGv1-2.md](https://github.com/dosasm/masm-tasm/blob/v2/dev/doc/CHANGELOGv1-2.md)。感谢大语言模型在代码编写过程中提供的帮助。

The original CHANGELOG has been moved to [dev/doc/CHANGELOGv1-2.md](https://github.com/dosasm/masm-tasm/blob/v2/dev/doc/CHANGELOGv1-2.md). Thanks to the large language model for the assistance in code writing.
