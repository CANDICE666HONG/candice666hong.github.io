# 桌边潮汐 Windows 版

下载 `Desktop-Tides-Windows.exe` 后双击即可玩。适用于 Windows 10/11 64 位电脑，不需要安装、浏览器、Node.js 或网络连接。

窗口中的海湾最多为 800×600，缩小窗口时会一起缩小。美术、钓鱼、随机投放生物、水波水流和图鉴均与网页版一致。右上角可选择「自动 / 日光 / 月夜」；自动模式使用电脑当地时间，06:00–18:00 为日光，其余为月夜。

图鉴、海湾与昼夜设置保存在 `%APPDATA%\DesktopTides`。移动 EXE 或下载新版不会改变存档位置。Windows 版与网站版、HTML 离线版的存档相互独立。

当前为未购买 Windows 代码签名证书的试玩版；下载文件的 SHA-256 随发布一并提供。它不会要求管理员权限，不会添加开机启动、注册表项目或自动更新服务。首次打开需要把自带运行环境展开到临时目录，稍等即可。

1.0.1 起每次打开使用独立的临时展开目录，连续打开多个副本时不会覆盖正在使用的程序文件；已有游戏窗口会被带到前面，存档位置不变。

## 从源码制作 EXE

使用 Windows、Node.js 24.22.1 和 pnpm 11.25.0，在仓库根目录执行：

```powershell
pnpm --dir source-games/desktop-tides --ignore-workspace install --no-lockfile
pnpm --dir desktop-app install --frozen-lockfile
node scripts/build-desktop.mjs
```

`desktop-app/pnpm-workspace.yaml` 使桌面依赖保持独立。不要对桌面依赖安装加 `--ignore-workspace`，否则 pnpm 会跳过构建脚本规则。游戏直接依赖版本固定；桌面打包依赖另有锁文件。构建工具会下载固定的 Electron 45.2.1 Windows x64 运行环境。

产物：

- `desktop-app/release/Desktop-Tides-Windows.exe`
- `desktop-app/release/Desktop-Tides-Windows.exe.sha256`
- `desktop-app/release/build-manifest.json`

构建先调用现有离线渲染器，再把完整游戏放入应用包。它验证 13 张内嵌图片、无外部资源依赖、Windows PE 格式和 x64 GUI 运行环境。内部地址固定为 `tides://bay/`，不启动本地 HTTP 服务。普通网页导航、新窗口和联网请求均关闭；渲染器不开放 Node.js、preload 或文件系统接口。

应用图标为单独绘制的矢量文件 `desktop-app/resources/icon.svg`。已提交的 `icon.ico` 包含 16–256 像素尺寸，无需安装额外图形工具即可构建。若修改图标，可先安装 `source` 的网站依赖，再在仓库根目录运行 `node desktop-app/resources/generate-icon.cjs` 重新生成。

## 发布前验证

运行 `node --test source-games/desktop-tides/tests/*.test.mjs`，然后打开生成的 EXE 检查海湾、钓鱼、投放、水波、图鉴和昼夜切换。关闭再打开后检查设置和存档仍在。保持网站下载按钮指向已经发布、能下载的版本。
