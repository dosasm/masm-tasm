# DOS assembly (MASM/TASM) via DOSBox

[Chinese](README.zh.md)|[English](README.md)|
[中文 in gitee](https://gitee.com/dosasm/masm-tasm/)|
[more versions](https://github.com/xsro/masm-tasm/releases)

Language support for DOS assembly,may be suitable for studying MASM/TASM in DOSBox and the course *principles& peripheral technology of microprocessor*.

- (**Language Support**) Offer *grammar*,basic *outline* view,*hover*,*code formate* support for DOS assembly language
- **Run and debug** assembly with right click on the VSCode editor panel. You can choose using MASM or TASM in the preference-settings.
- **Diagnose**: process the output of ASM tools and display them in VSCode
- (suitable for all OS) use JS-Dos to run your asm program in VSCode webview
- **For windows**, also support use DOSBox and [MSDOS player](http://takeda-toshiya.my.coocan.jp/msdos). All needed tools have been packaged in the extension. Just install and enjoy!
- [For other systems](#for-other-system): also support DOSBox. You need to install [DOSBox](https://www.dosbox.com) first
- Note: this extension is built for assembly in DOS, so it not works well with assembly for win32

## Demo

Now the extension supports using JSDos to run wdosbox in VSCode's Webview. Change the `masmtasm.ASM.emulator` in settings to *jsdos* to try it.

![jsdos demo](pics/demo_jsdos.gif)

### Demo 1: Run and Debug Assembly

| using TASM via DOSBox                          | using MASM via msdos-player                         |
| ---------------------------------------------- | --------------------------------------------------- |
| ![demo dosbox tasm](pics/demo_dosbox_tasm.gif) | ![demo msdos-player masm](pics/demo_msdos_masm.gif) |

when you are editing `assembly` files ,you can right click at the editor panel,then you will see several choices listed below:

1. **Open Emulator**: Open the dosbox, prepare the environment
2. **Run ASM code**: Assemble,link and Run the program
3. **Debug ASM code**: Assemble,link and Debug the program

**NOTE**:

- If your files path is not workable for emulator. The extension will copy your file in active editor to a separate workspace and operate it there.
- Default is using `DOSBox` and `TASM`,you can change them in `preference->settings` like the second gif(using MASM via msdos player).
- If you use `include` to include another file or use `extern`, please use `dosbox here`(see demo2)

### Demo 2: Open dosbox and type the command you need

| Single-File (command `Open DOSBox`)    | Multi-Files (command `Dosbox here`)                                              |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| ![Open in Dosbox](pics/opendosbox.gif) | [![pacman](pics/demo_pacman.gif)](https://github.com/dpisdaniel/assembly-pacman) |

- Editor Command "`Open Emulator`":Open emulator at your file's folder. If your file's path is not readable for DOS emulator, your file will be copied as `T.ASM` in DOS emulator. (For DOSBox, copy your file to work space folder and mount this folder to DOSBox disk `D:`)
- Command "`Doxbox here`": The extension will Open DOSBox and mount your active editor file's folder directly to DOSBox 's disk `D:` with no path-checking.
- some ASM commands you may need: [ASM_commands](https://github.com/xsro/masm-tasm/wiki/ASM_commands).
- Some interesting assembly codes you may need: [DOSBox ASM codes](https://github.com/xsro/masm-tasm/wiki/dosbox)

### Demo 3: code Formate,Diagnose and more

| Formate Codes                                               | Diagnose                                 |
| ----------------------------------------------------------- | ---------------------------------------- |
| ![programmatic lanaguage features](pics/demo_PLFeature.gif) | ![diagnose](pics/demo_diagnose_tasm.gif) |

The extension offer some programmatic features like "hover","formate","jump to definition",you can close them in the `preferece->settings`

## For other system

The extension is packaged with needed [tools](doc/Toolspath.md) for windows inside while **other OS** users *should* make sure DOSBox can be opened by shell command. We can download DOSBox from its website:[DOSBox](https://www.dosbox.com)

For MacOS (Darwin),the extension will use command `open -a DOSBox --args` to open DOSBox. So you need to:

1. download dmg file from [DOSBox's website](https://www.dosbox.com)
2. Double-click the `.DMG` file to mount it. A new Finder window showing its contents should appear.
3. double-click the mounted volume on your desktop and drag the app icon from there to the “Applications” icon in the Finder sidebar.

For Ubuntu and other linux system user,The extension will use shell command `dosbox` to open DOSBox. We can use command like this:

```sh
sudo apt install dosbox  #install dosbox
dosbox #if successfully opened the dosbox, it is largely possible for the extension to use dosbox
```

You can also use the setting ID `masmtasm.dosbox.command` to set your command for the extension to open DOSBox.

## Extension Settings

for more,please see the `preference->settings`

- `masmtasm.ASM.MASMorTASM` use *MASM* or *TASM* assembler in DOS emulator to run and debug assembly
- `masmtasm.ASM.emulator` choose DOS emulator
  - `jsdos` (recommend) run in JS-DOS in VSCode's webview
  - `DOSBox` (default) more stable
  - `msdos player`quiet, it runs in command prompt(CMD).  So it cannot support GUI like `TD.exe`
  - `auto` use DOSBox and msdos player
    1. use msdos-player to compile and link
    2. use DOSBox to run
    3. use msdos-player for MASM(debug)
    4. use DOSBox for TASM(TD)
- `masmtasm.ASM.savefirst`  save file first before using
- `masmtasm.dosbox.run`：what to do after run your code in DOSBox
- `masmtasm.ASM.toolspath`: (usually do not need it) use tools from this path, see [about-tools](#about-tools)
- `masmtasm.dosbox.config`: set the DOSBox configuration. The setting will be write to a `.conf` file which will be used by the DOSBox launched by the extension. Set the configuration like below:

```jsonc
{
  "masmtasm.dosbox.config": {
        "SDL.windowresolution": "1024x640",//set the size of the dosbox window
        "SDL.output": "opengl"
    },
  "masmtasm.ASM.toolspath": "E:\\tools"//set the custom ASM tools
}
```

### string replacer

the string replacer for settings `masmtasm.dosbox.more`,`masmtasm.jsdos.more`,`masmtasm.msdos.more`.Extension will replace these strings to relavant value.

| string          | replace to                                                          |
| --------------- | ------------------------------------------------------------------- |
| `${fullname}`   | the fullname of the source code file like`c:\asm\hello.asm`         |
| `${filename}`   | the filename of the source code file like `hello`                   |
| `${fileFolder}` | the folder path of the source code file like `c:\asm`               |
| `${fileDisk}`   | the file disk of the source code file like `c`                      |
| `${toolpath}`   | the folder path of the asm tools including *MASM* and *TASM* folder |

### About DOSBox 's disk

The extension will mount some folder to DOSBox 's disk. Please don't modify them.

| in DOSBox | real path in the computer  |
| --------- | -------------------------- |
| C:        | the path of tools folder   |
| D:        | the path of the work space |

## known issues

- lack of support of assembly in not just one file

## About tools

### How the extension use tools

The extension will use the tools in the extension's folder `tools`. If defined the setting `masmtasm.ASM.toolspath`, the extension will use ASM tools in this folder instead. This may cause problem

See [built-in-tools](tools/README.md)

### where-are-extensions-installed

According to [VSCode-doc](https://code.visualstudio.com/docs/editor/extension-gallery#_where-are-extensions-installed), the extension will be installed in following folder:

- Windows `%USERPROFILE%\.vscode\extensions`
- mac-OS `~/.vscode/extensions`
- Linux `~/.vscode/extensions`

### use your tools

if you want to use your tools of assembler, please paste your path to the setting `masmtasm.ASM.toolspath`, your files should follow the structure like [tools](tools/)

## Docs & Thanks & Licenses

- Thanks to my teacher *Han*. Hope 2020 and the coming 2021 happy and worthy
- inspired by [Woodykaixa](https://github.com/Woodykaixa)'s [masm-code](https://github.com/Woodykaixa/masm-code)
- Thanks to excellent DOS emulator: [dosbox](https://www.dosbox.com), [caiiiycuk](https://github.com/caiiiycuk)'s [js dos](https://js-dos.com/) and [caiiiycuk](https://github.com/caiiiycuk)'s [msdos player](http://takeda-toshiya.my.coocan.jp/msdos)
- Thanks to [Roncho](https://marketplace.visualstudio.com/publishers/Roncho) 's extension [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086),[blindtiger](https://github.com/9176324)'s [masm](https://github.com/9176324/bltg-team.masm) for ASM language information

- Welcome [issue](https://github.com/xsro/masm-tasm/issues) and PR to build a better extension with your help
- [THANKS](doc/Thanks.md)
- [some infomation :wiki](https://github.com/xsro/masm-tasm/wiki)

Enjoy!:smile:
