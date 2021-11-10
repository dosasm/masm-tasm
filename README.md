<img align="right"  src="./resources/dosboxasm.png">

# Basic support for MASM/TASM v1.x

[Chinese](README.zh.md)|[English](README.md)|
[中文 in gitee](https://gitee.com/dosasm/masm-tasm/)

Basic language support for assembly in **DOS** environment.
may be suitable for studying MASM/TASM in DOSBox
or courses like _principles& peripheral technology of microprocessor_.

- **Language Support**: Offer _grammar_,basic _outline_ view,_hover_,_code formate_ support for DOS assembly language
- **Run and debug**: Right click on the VSCode editor panel, run and debug your code
- **Diagnose**: process the output of ASM tools and display them in VSCode
- support all platform including **Web**, see [platform support](#platform-support)
- Note: this extension is built for learning assembly in DOS, it can not work with assembly for win32

## Demo

### Demo 1: Language Features

| Formate Codes                | Diagnose                         |
| ---------------------------- | -------------------------------- |
| ![](pics/demo_PLFeature.gif) | ![](pics/demo_diagnose_tasm.gif) |

The extension offers some language features like "hover","formate","jump to definition" as language id `assembly`.
You can also use other extension for Assembly language Support, for example language ID `asm-collection` by installing extension [ASM Code Lens](https://marketplace.visualstudio.com/items?itemName=maziac.asm-code-lens).

### Demo 2: Run and Debug

| using TASM via DOSBox          | using MASM via msdos-player   |
| ------------------------------ | ----------------------------- |
| ![](pics/demo_dosbox_tasm.gif) | ![](pics/demo_msdos_masm.gif) |

when you are editing `assembly` files ,you can right click at the editor panel,then you will see several choices listed below:

1. **Open Emulator**: Open the dosbox, prepare the environment
2. **Run ASM code**: Assemble,link and Run the program
3. **Debug ASM code**: Assemble,link and Debug the program

#### RunDebug Notes

- If your code just in a single file, set configuration `masmtasm.ASM.mode` as `single file`. The extension will copy your file to a seperate space in your machine to keep your workspace Folder clean.
- If your project is complex and making up with many files, you may set configuration `masmtasm.ASM.mode` as `workspace` and keep your files' names follow the emulator's limitation.
  - take `include <filename>` for example, the `<filename>` should be the relative path to your workspace Folder
- Obviously, this extension may be not suitable for complex project

## Platform Support

The extension depend on [vscode-dosbox](https://marketplace.visualstudio.com/items?itemName=xsro.vscode-dosbox) for intergration with DOS emulator.
It has packaged all binary files for windows system.

Follow [its doc](https://github.com/dosasm/vscode-dosbox#dependency-installation) for installing emulator like DOSBox in other system.

## About DOSBox 's disk

The extension will mount some folder to DOSBox 's disk.

| in DOSBox | real path in the computer  |
| --------- | -------------------------- |
| C:        | the path of tools folder   |
| D:        | the path of the work space |

## Compile to `.com` files

You can change the command to exec in setting `masmtasm.ASM.actions`.
For example, if you want to compile your code to `.com`, you can add a setting like this.
And set `masmtasm.ASM.assembler` to its key `TASM-com`

```json
"masmtasm.ASM.actions": {
     "TASM-com": {
      "baseBundle": "<built-in>/TASM.jsdos",
      "before": [
        "set PATH=C:\\TASM"
      ],
      "run": [
        "TASM ${file}",
        "TLINK /t ${filename}",
        "${filename}"
      ],
      "debug": [
        "TASM /zi ${file}",
        "TLINK /t/v/3 ${filename}.obj",
        "TD ${filename}.exe"
      ]
    }
}
"masmtasm.ASM.assembler":"TASM-com"
```

### where-are-extensions-installed

According to [VSCode-doc](https://code.visualstudio.com/docs/editor/extension-gallery#_where-are-extensions-installed), the extension will be installed in following folder:

- Windows `%USERPROFILE%\.vscode\extensions`
- mac-OS `~/.vscode/extensions`
- Linux `~/.vscode/extensions`

## Docs & Thanks & Licenses

- Thanks to my teacher _Han_. Hope 2020 and the coming 2021 happy and worthy
- inspired by [Woodykaixa](https://github.com/Woodykaixa)'s [masm-code](https://github.com/Woodykaixa/masm-code)
- Thanks to excellent DOS emulator: [dosbox](https://www.dosbox.com), [caiiiycuk](https://github.com/caiiiycuk)'s [js dos](https://js-dos.com/) and [msdos player](http://takeda-toshiya.my.coocan.jp/msdos)
- Thanks to [Roncho](https://marketplace.visualstudio.com/publishers/Roncho) 's extension [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086),[blindtiger](https://github.com/9176324)'s [masm](https://github.com/9176324/bltg-team.masm) for ASM language information
- Welcome [issue](https://github.com/dosasm/masm-tasm/issues) and PR to build a better extension with your help
- [THANKS](doc/Thanks.md)
- [some infomation :wiki](https://github.com/dosasm/masm-tasm/wiki)

Enjoy!:smile:
