***WIP***

Rewrite this [project](https://github.com/starknt/LiveMoe)

<h1 align="center">NaTmri</h1>

<h4 align="center">Nao Tomori</h4>

<p align="center">一款基于 Electron 的免费开源桌面壁纸软件。</p>

<div align="center">

![PR Welcome](https://img.shields.io/badge/PR-welcome-brightgreen.svg?style=flat)

</div>

## ⌨️ 本地开发

### 克隆代码

```bash
git clone git@github.com:natmri/natmri.git && cd natmri
```

### 安装依赖

```bash
pnpm install
```

> Error: Electron failed to install correctly, please delete node_modules/electron and try installing again

`Electron` 下载安装失败的问题，解决方式请参考 <https://github.com/electron/electron/issues/8466#issuecomment-571425574>

### 开发模式

```bash
pnpm dev
```

### 编译打包

```bash
pnpm package
```

完成之后可以在项目的 `out-build` 目录看到编译打包好的应用文件

## 🛠 技术栈

- [Electron](https://electronjs.org/)

## 🤝 参与共建

如果你有兴趣参与共同开发，欢迎 FORK 和 PR。

## 📜 开源许可

[MIT](./LICENSE) License © 2022 [starknt](https://github.com/starknt)
