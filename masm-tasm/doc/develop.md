# Develop

## STEPS

### 0.use GIT to clone this repository

```sh
#cd myFolder
git clone https://github.com/dosasm/masm-tasm.git
```

### 1.install nodejs and npm and pnpm

the website of nodejs: <http://nodejs.org>, <http://nodejs.cn/>

```sh
sudo apt install nodejs
sudo apt install npm
npm install --global pnpm
```

### 2.install dependence

```sh
pnpm install
```

### 3.generate `visx` package

```sh
npx vsce package
```

### Debug

```sh
pnpm watch
```

Press <kbd>F5</kbd> or Click `run` -> `Start Debugging`
