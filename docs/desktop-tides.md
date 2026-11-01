# 《桌边潮汐》作品接入

试玩地址为 `/projects/desktop-tides/`，必须保留结尾斜杠；GitHub Pages 会将目录路径引导到其 `index.html`。支持携带 `?lang=zh` / `?lang=en`，返回链接会回到 `/?lang=zh#desktop-tides` 或英文版本的同一作品位置。

`projects/desktop-tides/` 是可直接发布的静态文件。可编辑源码与优化后素材在 `source-games/desktop-tides/`，不依赖原型项目的设计目录或私有文件。

从全新仓库重建：

```sh
cd source-games/desktop-tides
npm install
npm test
cd ../..
node scripts/build-game.mjs
```

Node.js 22.12 或更高版本可用于这份 Vite 6.4.2 / React 19.2.0 源码。游戏没有服务器接口或线上数据库。网站的静态首页构建与游戏构建相互独立；修改游戏后需要执行上述游戏构建，并随站点发布更新后的 `projects/desktop-tides/`。

游戏最大 800×600，缩小窗口时保持 4:3。画布外保留返回作品集和下载离线版两个入口；游戏内保留原来的简洁界面、盲钓机制与鱼种图鉴。网页副本使用高质量 WebP 素材，原有 PNG 原型文件不受影响。

昼夜默认跟随设备当地时间，06:00–18:00 为日光，其余为月夜；原昼夜按钮中可选择自动、日光或月夜。选择单独保存，不影响原来的海湾与图鉴记录。

`node scripts/build-offline.mjs` 生成 `downloads/desktop-tides-offline.zip`，访客解压后打开 `Desktop-Tides.html` 即可使用包含全部图片、脚本和样式的离线版。网页与离线版的记录不自动互通。完整说明见 `offline-play.md`。
