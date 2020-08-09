# 对于非windows系统

对于非windows系统用户，插件会使用终端工具，调用dosbox（由于msdos目前只有windows下的程序包，所以auto模式和msdos模式在非windows平台下都视为使用dosbox）

## linux

可以从dosbox官网下载安装dosbox，并设置环境变量，或者使用命令行工具，如apt

```bash
sudo apt install dosbox #安装dosbox
dosbox #打开dosbox，假如成功打开dosbox则安装成功，那么插件插件也能调用
```

## OSX

理论上说只要能在命令行执行`dosbox`命令打开dosbox（nodejs 的child_process.exec(dosbox)命令），就可以使用，没有试过，不懂
