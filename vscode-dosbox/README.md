# vscode-DOSBox

Offer an Interface for running DOSBox and its variants in your platform.

## supported DOSBox and platforms

- [JSDos](https://js-dos.com/): all platform including web
- [DOSBox](https://www.dosbox.com/): binaries packaged for windows system, need to install manually for other OS
- [DOSBox-x](https://dosbox-x.com/): binaries packaged for windows system, need to install manually for other OS
- [MSDos-player](http://takeda-toshiya.my.coocan.jp/msdos/index.html): only runs in windows system and binaries packaged

## Features

- offer commands for open supported platform
- offer API for other extensions: see [api.ts](src/api.ts)
- (TODO) use this extension for DOS game playing

## Dependency Installation

### for Windows

All binary files for windows system haven been packaged in the extension,

### Install DOSBox and DOSBox-x for macOS via homebrew (recommend)

```sh
brew install dosbox
brew install dosbox-x
```

### Install DOSBox for macOS via packages

1. download DMG file from dosbox's [website](https://www.dosbox.com/download.php?main=1)
2. click to open the dmg file
3. drag the application to `/Applications` folder
4. set the following settings in your VSCode's setting

```json
"vscode-dosbox.command.dosbox":"open -a dosbox --args",
```

### Install DOSBox-x for macOS via packages

1. download ZIP file for macOS from dosbox-x's [website](https://dosbox-x.com)
2. Unzip the file and drag your `.app` file to `/Applications` folder
3. follow this [macOS's doc](https://support.apple.com/en-us/HT202491) to set up security settings
   1. Go to Security & Privacy
   2. Click the Open Anyway button in the General pane to confirm your intent to open or install the app
4. set the following setting in your VSCode's settings

```json
"vscode-dosbox.command.dosboxX":"open -a dosbox-x --args",
```

### Install DOSBox for Linux

for example,

```sh
sudo apt install dosbox
```

For more, see [DOSBox's website](https://www.dosbox.com/download.php?main=1)

### Install DOSBox-x for Linux

according to [dosbox-x's instructions](https://github.com/joncampbell123/dosbox-x/blob/master/INSTALL.md#linux-packages-flatpak-and-more),
we can use [flatpak](https://www.flatpak.org/setup/) to install DOSBox-X.

```sh
# install flatpak
sudo apt install flatpak
# use flatpak to install DOSBox-X
flatpak install flathub com.dosbox_x.DOSBox-X
```

then set the following setting in your VSCode's settings

```json
"vscode-dosbox.command.dosboxX":"flatpak run com.dosbox_x.DOSBox-X",
```

you may need to change output of SDL for better screen effect

```json
"vscode-dosbox.dosbox.config": {
   "SDL.output":"overlay",
}
```

## Extension Settings

This extension contributes the following settings:

- `vscode-dosbox.command.dosbox`: customize your command to open dosbox
- `vscode-dosbox.command.dosboxX`: customize your command to open dosbox-x

## Report

report bugs in [github issues](https://github.com/dosasm/vscode-dosbox/issues)

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes
