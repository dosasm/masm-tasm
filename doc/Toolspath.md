# 汇编工具相关信息

## 插件如何使用汇编工具

插件会从用户获取它的用户工具的根目录，如果没有设置那么就是[插件安装目录](#插件安装路径一般在哪里)
下的tools文件夹，插件首先会将需要使用的文件（编辑器当前文件）复制到插件工作文件夹，再在汇编工具文件夹中找到相应工具进行处理

### 插件安装路径一般在哪里

VSCode文档中关于插件安装路径的说明[VSCode-doc](https://code.visualstudio.com/docs/editor/extension-gallery#_where-are-extensions-installed)，摘录如下

- Windows `%USERPROFILE%\.vscode\extensions`
- macOS `~/.vscode/extensions`
- Linux `~/.vscode/extensions`

### 自带的汇编工具版本

16位环境模拟工具和汇编工具来自[github仓库](https://github.com/xsro/VSC-ASMtasks/releases),使用的是msdos的是MS-DOS Player (i486) for Win32 console

|file|masm.exe|link.exe|debug.exe|tasm.exe|tlink.exe|td.exe|dosbox|msdos|
|---|----------|----------|----------|---------|----------|------|--------|--------|
|version|5.00|3.60|---|4.1|7.1.30.1|--|0.74|4/10/2020|

## 自定义汇编工具路径

如果需要使用不同版本的软件，可以自定义汇编工具路径。将文件路径复制到设置中即可。插件会从对应的文件夹中寻找相关组件,注意windows下如果通过json设置需要使用`\\`，首选项中设置直接使用`\`即可。

### tools文件夹的目录结构

自定义汇编工具集地址时需要遵守这个目录结构，至少包含这些文件及它们的依赖才能使用。部分相关软件的链接：[dosbox](https://dosbox.com)、[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)

1. masm文件夹：MASM汇编工具（不区分大小写）
   - masm.exe 汇编工具
   - link.exe 链接工具
   - debug.exe 调试工具
2. tasm文件夹：TASM汇编工具（不区分大小写）
   - tasm.exe 汇编工具
   - tlink.exe 调试工具
   - td.exe 调试工具（TDC2.td为调试工具配置文件，如果有将使用这个td配置文件）
3. dosbox文件夹：dosbox软件目录（for windows）
   - dosbox.exe
   - SDL.dll
   - SDL_net.dll
4. player文件夹：MSDOS-player软件目录（for windows）
   - msdos.exe

#### 首选项中设置

![set the tool path](../pics/settools.gif)

#### json中设置

```json
{
   "masmtasm.ASM.toolspath": "E:\\tools"
}
```
