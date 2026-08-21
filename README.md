# Basic Support for MASM/TASM v2.x
[Chinese](README.zh.md) | [English](README.md)
[中文 in Gitee](https://gitee.com/dosasm/masm-tasm/)

Basic language support for assembly in **DOS** environment.
It may be suitable for studying MASM/TASM in DOSBox
or courses like *Principles and Peripheral Technology of Microprocessor*.

- **Language Support**: Offers *grammar* validation, basic *outline* view, *hover* tips, and *code formatting* support for DOS assembly language
- **Status Bar**: Quick access to switch DOS emulator and assembler independently, with executable paths shown
- **Run and Debug**: Right-click on the VS Code editor panel to run and debug your code
- **Diagnose**: Processes the output of ASM tools and displays diagnostics in VS Code
- Supports all platforms including **Web** — see [Platform Support](#platform-support)
- Note: This extension is built for learning assembly in DOS, and it does not work with Win32 assembly

## Demo

### Demo 1: Language Features
| Format Code                  | Diagnose                         |
| ---------------------------- | -------------------------------- |
| ![](pics/demo_PLFeature.gif) | ![](pics/demo_diagnose_tasm.gif) |

The extension provides language features such as hover hints, code formatting, and jump to definition for the `assembly` language ID.

#### Code Formatting

The built-in formatter follows the style of sample `.asm` files:
- Labels at column 0, instructions indented with tabs
- Top-level directives (`.386`, `.model`, `.STACK`, `include`, etc.) stay at column 0
- Blank lines preserved as truly empty
- Original operand spacing and comments preserved
- Formatting is idempotent — running it twice produces the same result
- Use the **Format Document** command (`Shift+Alt+F`) to apply
You can also use other assembly language support extensions (e.g., the `asm-collection` language ID) by installing [ASM Code Lens](https://marketplace.visualstudio.com/items?itemName=maziac.asm-code-lens).

### Demo 2: Run and Debug
| Using TASM via DOSBox          | Using MASM via msdos-player   |
| ------------------------------ | ----------------------------- |
| ![](pics/demo_dosbox_tasm.gif) | ![](pics/demo_msdos_masm.gif) |

When editing `assembly` files, right-click in the editor panel to access the following options:
1. **Open Emulator**: Launch DOSBox and prepare the runtime environment
2. **Run ASM Code**: Assemble, link, and execute the program
3. **Debug ASM Code**: Assemble, link, and debug the program

#### Run/Debug Notes
- The extension copies your file to an isolated directory before assembling, to keep your workspace clean.
- Note that this extension is not optimized for complex projects.

#### Project Configuration with `dosasm.jsonc`
For multi-file projects or custom build workflows, you can place a `dosasm.jsonc` file in your project directory. When you right-click an `.asm` file to run/debug, the extension searches upward from the file's directory for `dosasm.jsonc`. If found, it uses the configuration defined there instead of the default settings.

Example `dosasm.jsonc`:
```jsonc
{
    "action": {
        "before": [
            "mount c ${<built-in>/TASM.jsdos}",
            "mount d ${actionFolder}",
            "PATH %PATH%;C:\\TASM",
            "d:",
            "cd d:\\"
        ],
        "open": [],
        "run": [
            "TASM ${file}",
            "TLINK ${filename}",
            ">${filename}"
        ],
        "debug": [
            "TASM /zi ${file}",
            "TLINK /v/3 ${filename}.obj",
            "copy C:\\TASM\\TDC2.TD TDCONFIG.TD",
            "TD -cTDCONFIG.TD ${filename}.exe"
        ]
    }
}
```

**Template variables:**
- `${file}` — the full path of the assembly file in DOS
- `${filename}` — the file path without extension
- `${actionFolder}` — the directory containing the `dosasm.jsonc` file
- `${<built-in>/TASM.jsdos}` — the extracted bundle folder path (the extension automatically extracts the `.jsdos` zip bundle and mounts the resulting folder)

**How it works:**
- The `action.before` commands set up the DOS environment (mount drives, set PATH, etc.)
- The `action.run` commands assemble, link, and execute the program
- The `action.debug` commands assemble, link, and launch the debugger
- The `action.open` commands are used when opening the emulator without running
- When `dosasm.jsonc` is found, the default single-file mount behavior is skipped — the `before` section fully controls the environment setup

**Copy file before run/debug:**
- `action.copyFileAs` (string | null): Controls whether the active file is copied before run/debug
  - String: file is copied to this path (relative to the action folder)
  - null: file is not copied, the original file path is used directly
- **Bundle extraction**: `${<built-in>/TASM.jsdos}` references a built-in `.jsdos` zip bundle. The extension extracts this bundle to a folder and replaces the variable with the folder path, so you can mount it as a DOS drive

## Platform Support
This extension interfaces with the DOSBox(-X) binary via [Node.js's `child_process` module](https://nodejs.org/api/child_process.html).
You must install DOSBox or DOSBox-X first to use this feature.

Since VS Code is primarily built with JavaScript (TypeScript), we support the WebAssembly (Wasm) version of DOSBox(-X) — namely [js-dos](https://js-dos.com/overview.html).
The extension bundles all required js-dos files, and it uses js-dos as the default DOS emulator for Web platform support.

## Compiling to `.com` Files
You can customize the build commands by modifying the `masmtasm.ASM.actions` configuration.
For example, to compile your code to a `.com` file, add the following configuration and set `masmtasm.ASM.assembler` to its key (`TASM-com`):

```json
"masmtasm.ASM.actions": {
  "TASM-com": {
    "baseBundle": "<built-in>/TASM.jsdos",
    "before": [
      "PATH %PATH%;C:\\TASM"
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
},
"masmtasm.ASM.assembler": "TASM-com"
```

## Docs & Acknowledgments & Licenses
- Special thanks to my teacher, *Mr. Han*. Wishing 2020 and the coming 2021 to be happy and fulfilling years.
- Inspired by [Woodykaixa](https://github.com/Woodykaixa)'s [masm-code](https://github.com/Woodykaixa/masm-code) project
- Thanks to the excellent DOS emulators: [DOSBox](https://www.dosbox.com), [caiiiycuk](https://github.com/caiiiycuk)'s [js-dos](https://js-dos.com/), and [msdos-player](http://takeda-toshiya.my.coocan.jp/msdos)
- Thanks to [Roncho](https://marketplace.visualstudio.com/publishers/Roncho)'s extension [Assembly (TASM)](https://marketplace.visualstudio.com/items?itemName=Roncho.assembly-8086) and [blindtiger](https://github.com/9176324)'s [masm](https://github.com/9176324/bltg-team.masm) for reference on assembly language support
- We welcome [issues](https://github.com/dosasm/masm-tasm/issues) and pull requests to help improve this extension
- [Acknowledgments](doc/Thanks.md)
- [Additional Information: Wiki](https://github.com/dosasm/masm-tasm/wiki)

Enjoy! 😊