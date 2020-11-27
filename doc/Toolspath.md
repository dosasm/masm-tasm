# About tools

## How the extension use tools

The extension will use the tools in the extension's foler `tools`. If defined the setting `masmtasm.ASM.toolspath`, the extension will use tools in this folder instead.

### where-are-extensions-installed

According to [VSCode-doc](https://code.visualstudio.com/docs/editor/extension-gallery#_where-are-extensions-installed), the extension will be installed in following folder:

- Windows `%USERPROFILE%\.vscode\extensions`
- macOS `~/.vscode/extensions`
- Linux `~/.vscode/extensions`

### the versions of the built in tools

| file    | masm.exe(ml.exe) | link.exe | debug.exe | tasm.exe | tlink.exe | td.exe | dosbox | msdos     |
| ------- | ---------------- | -------- | --------- | -------- | --------- | ------ | ------ | --------- |
| version | 6.11             | 5.31.009 | ---       | 4.1      | 7.1.30.1  | --     | 0.74-3 | 4/10/2020 |

links of some tools: [dosbox](https://dosbox.com)、[msdos player](http://takeda-toshiya.my.coocan.jp/msdos)

## use your tools

if you want to use your tools of assembler and emulator, please paste your path to the setting "masmtasm.ASM.toolspath", your files should follow the structrue like [tools](../tools)

1. Folder:`masm`
   - masm.exe 
   - link.exe 
   - debug.exe 
2. Folder:tasm
   - tasm.exe 
   - tlink.exe 
   - td.exe 
3. Folder:dosbox
   - dosbox.exe
   - SDL.dll
   - SDL_net.dll
4. Folder:player：
   - msdos.exe
5. if there is a file `boxasm.bat` here,the extension will use this file to operate 


#### How to set this
##### 自定义汇编工具路径

![set the tool path](../pics/settools.gif)

#### json中设置

```json
{
   "masmtasm.ASM.toolspath": "E:\\tools"
}
```
