# vscode-DOSBox

提供一个在 VSCode 中运行 DOSBox 及其变体的接口

## 支持的 DOSBox 和 VSCode 平台

- [JSDos](https://js-dos.com/): 支持包括 web 端的所有平台
- [DOSBox](https://www.dosbox.com/): windows 系统下打包了可执行文件，linux 和 macOS 系统需要手动安装
- [DOSBox-x](https://dosbox-x.com/): windows 系统下打包了可执行文件，linux 和 macOS 系统需要手动安装
- [MSDos-player](http://takeda-toshiya.my.coocan.jp/msdos/index.html): windows 系统下打包了可执行文件，其他平台无相应程序

## 功能

- 提供打开相关 DOS 模拟器的简单接口，参看 [api.ts](src/api.ts)
- 提供打开相关 DOS 模拟器的简单命令，可以在命令面板测试与调用

## 安装依赖

### Windows 系统用户

所有的可执行文件都已经打包在安装包中。可以通过修改设置来使用不同的模拟器

### 在 mac 平台使用 homebrew 安装 DOSBox 和 DOSBox-x (推荐)

```sh
brew install dosbox
brew install dosbox-x
```

[homebrew](https://brew.sh/)官网有安装 homebrew 的详细教程，[tuna](https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/)也提供了镜像安装和换源方法。

### 在 mac 平台从 dmg 文件安装 DOSBox

1. 从 DOSBox 的[官网](https://www.dosbox.com/download.php?main=1)下载 DMG 文件
2. 点击 dmg 文件
3. 将程序拖拽到`/Applications`文件夹
4. 在 VSCode 中添加如下设置，配置用于打开 DOSBox 的命令

```json
"vscode-dosbox.command.dosbox":"open -a dosbox --args",
```

可能需要修改 sdl 输出方式，来使显示效果满意，例如：

```json
"vscode-dosbox.dosbox.config": {
   "SDL.output":"overlay",
}
```

### 在 mac 平台从 zip 文件安装 DOSBox-x

1. 从 dosbox-x 的 [官网](https://dosbox-x.com) 下载 zip 压缩包文件
2. 解压并将需要的话`.app`文件拖拽到 `/Applications`文件夹
3. 按照[macOS 的文档](https://support.apple.com/zh-cn/HT202491)设置安全选项
   1. 在“系统偏好设置”中，前往“安全性与隐私”。
   1. 点按“通用”面板中的“仍要打开”按钮，以确认您打算打开或安装这个 App。
4. 在 VSCode 中添加如下设置，配置用于打开 DOSBox 的命令

```json
"vscode-dosbox.command.dosboxX":"open -a dosbox-x --args",
```

### 在 Linux 平台安装 dosbox

Ubuntu 等可以使用 apt 的发行版可以使用如下命令安装

```sh
sudo apt install dosbox
```

参看[DOSBox's website](https://www.dosbox.com/download.php?main=1)

### 在 Linux 平台安装 dosbox-x

根据[dosbox-x's instructions](https://github.com/joncampbell123/dosbox-x/blob/master/INSTALL.md#linux-packages-flatpak-and-more),
我们可以使用[flatpak](https://www.flatpak.org/setup/)来安装 DOSBox-X.

```sh
# install flatpak
sudo apt install flatpak
# use flatpak to install DOSBox-X
flatpak install flathub com.dosbox_x.DOSBox-X
```

最后在 VSCode 的设置中添加如下内容

```json
"vscode-dosbox.command.dosboxX":"flatpak run com.dosbox_x.DOSBox-X",
```

## 插件设置

该插件主要包括如下设置:

- `vscode-dosbox.command.dosbox`: 自定义打开 dosbox 的命令
- `vscode-dosbox.command.dosboxX`: 自定义打开 dosbox-x 的命令

## jsdos兼容情况

|environment|platform|dosboxWorker|dosboxDirect|
|---|---|---|---|
|extensionhost|nodejs|✅|✅|
|webview|browser|✅|✅|
|web extensionhost|Worker|✅|❌|
|web webview|browser|✅|✅|

## 报告问题

在[github issues](https://github.com/dosasm/vscode-dosbox/issues)中，提交遇到的问题。

## Release Notes
