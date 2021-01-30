# Develop

## Requirement

### 0.use GIT to clone this repository

```bash
cd myFolder
git clone https://github.com/xsro/masm-tasm.git
```

### 1.install nodejs and npm

the website of nodejs: <http://nodejs.org>, <http://nodejs.cn/>

```bash
sudo apt install nodejs
sudo apt install npm
```

<details>
<summary>use CNPM</summary>

可以使用[CNPM](<https://developer.aliyun.com/mirror/NPM?from=tnpm>)来安装npm包

```bash
# 使用alias来使用cnpm：
alias cnpm="npm --registry=https://registry.npm.taobao.org --cache=$HOME/.npm/.cache/cnpm --disturl=https://npm.taobao.org/dist --userconfig=$HOME/.cnpmrc"
# 使用npm安装cnpm：
sudo npm install -g cnpm --registry=https://registry.npm.taobao.org
```

</details>

### 2.install dependence

```bash
# install npm packages
npm install #or use cnpm install
# install for tool jsdos
cd tools/js-dos && npm install && cd ../.. 
```

### 3.generate `visx` package

```bash
npm run package
```

### Debug

Press <kbd>F5</kbd> or Click `run` -> `Start Debugging`
