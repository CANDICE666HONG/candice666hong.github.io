# 桌边潮汐：离线下载版

发布文件为 `/downloads/desktop-tides-offline.zip`。下载后解压，双击
`Desktop-Tides.html`，使用 Chrome、Edge 或 Firefox 打开即可。Windows 与
macOS 都不需要安装游戏运行环境，不需要启动服务器。它是浏览器离线版，
不是 `.exe` 或 `.app` 安装包。

图片、样式与游戏代码全部包含在一个 HTML 文件内。离线入口直接使用同一份
`App`，不包含网站上的下载或返回导航。游戏默认按设备当地时间切换昼夜，
右上角可手动选择自动、日光、月夜。

图鉴和设置会尝试写入浏览器存储。`file:` 页面的存储行为由浏览器决定；
不能保证换浏览器、移动或重命名文件后仍能读取原来的记录。网站与离线版不会
自动同步记录。说明文件中已向玩家说明这一点。
本地文件的存储差异参见 [MDN localStorage 文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#description)。

## 重建

安装 `source-games/desktop-tides` 的现有依赖后，在仓库根目录执行：

```sh
node scripts/build-offline.mjs
```

构建使用固定 Vite 6.4.2，生成经典脚本与内联 CSS，并嵌入全部 13 张必需图片。
打包前检查单一脚本、无额外文件依赖、脚本语法和图片数。ZIP 使用固定时间戳，
相同源码和依赖可生成相同字节。网页游戏与离线版构建相互独立；游戏更新时应
同时运行 `node scripts/build-game.mjs` 和上述离线构建。

离线页的内容安全策略禁止网络资源请求；所有游戏图片使用 `data:` URL。
发布前还应解压实际 ZIP，在 `file:` 地址下试玩日夜、钓鱼和图鉴。
