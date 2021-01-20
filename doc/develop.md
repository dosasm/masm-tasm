# Develop

## Requirement

### 0.use GIT to clone this repository

### 1.install nodejs and npm

1. the website of nodejs:<http://nodejs.org>, <http://nodejs.cn/>
2. you can also use cnpm<https://developer.aliyun.com/mirror/NPM?from=tnpm> or maybe also yarn

```bash
sudo apt install nodejs
sudo apt install npm
```

<details>
    <summary> using CNPM</summary>
    使用alias：alias cnpm="npm --registry=https://registry.npm.taobao.org --cache=$HOME/.npm/.cache/cnpm --disturl=https://npm.taobao.org/dist --userconfig=$HOME/.cnpmrc"<br>
    使用npm安装：sudo npm install -g cnpm --registry=https://registry.npm.taobao.org
</details>

### 2.install dependence and gulp-cli

```bash
sudo npm install -g gulp-cli #or use cnpm istead
npm install #or use cnpm instead
```

### 3.generate `visx` package

```bash
gulp package
```
