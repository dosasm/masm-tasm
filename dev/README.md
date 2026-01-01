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

## How to build these files

This project depends on the assembly tools packaged in [assembly-tool](https://github.com/dosasm/assembly-tool).
Therefore, ensure this project is in the same directory as the `assembly-tool` project.

```
git clone https://github.com/dosasm/assembly-tool
git clone -b dev/2026 https://github.com/dosasm/masm-tasm
cd masm-tasm
pnpm install
pnpm compile-dev
```

## Main references

- The js-dos emulator is based on <https://github.com/caiiiycuk/emulators>. My fork is available at <https://github.com/dosasm/emulators/>.
- The frontend code is based on <https://github.com/caiiiycuk/js-dos>.
- The reference manuals for DOSBox and DOSBox-X are also helpful.
