***WIP***

Rewrite this [project](https://github.com/starknt/LiveMoe)

<div style="display: flex; justify-content: center;align-items: center; flex-direction: column;">
  <span style="font-size: 2rem; font-weight: 700;">NaTmri</span>
  <span style="font-size: 1.1rem; font-weight: 500;">Nao Tomori</span>
  <strong>  一款基于 Electron 的免费开源桌面壁纸软件。  </strong>
  <br />
  
  ![PR Welcome](https://img.shields.io/badge/PR-welcome-brightgreen.svg?style=flat)
</div>

## 功能

- 控制壁纸的播放暂停
- 改变任务栏透明度或者自定义颜色
- 改变鼠标样式
- 可视化壁纸选择界面
- 可视化的设置界面
- 快速创建壁纸

## ⌨️ 本地开发

### 克隆代码

```bash
git clone git@github.com:starknt/natmri.git && cd natmri
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

完成之后可以在项目的 `release/build` 目录看到编译打包好的应用文件

## 🛠 技术栈

- [Electron](https://electronjs.org/)

## 🤝 参与共建

如果你有兴趣参与共同开发，欢迎 FORK 和 PR。

## 📜 开源许可

[MIT](./LICENSE) License © 2022 [starknt](https://github.com/starknt)
