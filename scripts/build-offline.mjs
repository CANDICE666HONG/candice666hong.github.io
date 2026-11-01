import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Script } from 'node:vm';
import { deflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const gameRoot = resolve(root, 'source-games/desktop-tides');
const gameRequire = createRequire(join(gameRoot, 'package.json'));
const entryId = 'virtual:desktop-tides-offline.jsx';
const resolvedEntryId = '\0' + entryId;
const publicImageNames = ['bay-day.webp', 'bay-night.webp', 'fish.webp', 'jelly.webp', 'ray.webp'];
const imageUrls = Object.fromEntries(publicImageNames.map(name => [name,
  'data:image/webp;base64,' + readFileSync(join(gameRoot, 'public/assets', name)).toString('base64'),
]));

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// A standard ZIP with UTF-8 names and a fixed DOS date; no OS-specific launcher.
function createZip(entries) {
  const localParts = [], centralParts = [];
  let offset = 0;
  const dosDate = ((2026 - 1980) << 9) | (11 << 5) | 1;
  for (const [name, text] of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const bytes = Buffer.from(text, 'utf8');
    const compressed = deflateRawSync(bytes, { level: 9 });
    const checksum = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    localParts.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBytes);
    offset += local.length + nameBytes.length + compressed.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, central, end]);
}

const vitePackage = gameRequire.resolve('vite/package.json');
if (JSON.parse(readFileSync(vitePackage, 'utf8')).version !== '6.4.2') {
  throw new Error('This game expects Vite 6.4.2. Install source-games/desktop-tides dependencies first.');
}
const { build } = await import(pathToFileURL(join(dirname(vitePackage), 'dist/node/index.js')).href);
const { default: react } = await import(pathToFileURL(gameRequire.resolve('@vitejs/plugin-react')).href);
const sourcePath = name => join(gameRoot, 'src', name).replaceAll('\\', '/');
const offlineEntry = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { App } from ${JSON.stringify(sourcePath('App.jsx'))};
  import ${JSON.stringify(sourcePath('styles.css'))};
  createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(App)));
`;

const result = await build({
  configFile: false,
  root: gameRoot,
  base: './',
  publicDir: false,
  plugins: [
    {
      name: 'desktop-tides-offline-resources',
      enforce: 'pre',
      resolveId(id) { if (id === entryId) return resolvedEntryId; },
      load(id) { if (id === resolvedEntryId) return offlineEntry; },
      transform(code, id) {
        if (!id.replaceAll('\\', '/').startsWith(gameRoot.replaceAll('\\', '/') + '/src/')) return null;
        let changed = false;
        const output = code.replace(/`\$\{import\.meta\.env\.BASE_URL\}assets\/([^`]+)`/g, (_match, name) => {
          if (!Object.hasOwn(imageUrls, name)) throw new Error(`Unexpected public image: ${name}`);
          changed = true;
          return JSON.stringify(imageUrls[name]);
        });
        return changed ? { code: output, map: null } : null;
      },
    },
    react(),
  ],
  build: {
    write: false,
    copyPublicDir: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    sourcemap: false,
    modulePreload: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: entryId,
      output: { format: 'iife', name: 'DesktopTides', inlineDynamicImports: true, entryFileNames: 'game.js', assetFileNames: '[name][extname]' },
    },
  },
});
if (Array.isArray(result)) throw new Error('Expected one offline build.');
const chunks = result.output.filter(item => item.type === 'chunk');
const styles = result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css'));
const externalAssets = result.output.filter(item => item.type === 'asset' && !item.fileName.endsWith('.css'));
if (chunks.length !== 1 || externalAssets.length || chunks[0].imports.length || chunks[0].dynamicImports.length) {
  throw new Error('Offline build still depends on separate files.');
}
const code = chunks[0].code;
new Script(code, { filename: 'Desktop-Tides.html inline game' });
const embeddedImages = new Set(code.match(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g));
if (embeddedImages.size !== 13) throw new Error(`Expected 13 embedded images, found ${embeddedImages.size}.`);
if (/(?:["'`])\.?\/?assets\/[^"'`]*\.webp/.test(code) || /import\.meta/.test(code)) {
  throw new Error('Found an unresolved image path or module-only expression.');
}
const css = styles.map(item => String(item.source)).join('\n');
const html = `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src data:; media-src data:; base-uri 'none'; form-action 'none'">
<meta name="theme-color" content="#073b51">
<title>桌边潮汐 · 离线版</title>
<style>${css.replace(/<\/style/gi, '<\\/style')}</style>
</head><body><div id="root"></div>
<script>${code.replace(/<\/script/gi, '<\\/script')}</script>
</body></html>
`;
const readme = `桌边潮汐 · 离线试玩 / Desktop Tides — Offline

1. 先把整个 ZIP 解压到桌面或常用文件夹。
2. 双击 Desktop-Tides.html，用 Chrome、Edge 或 Firefox 打开。
3. 游戏已经包含全部素材，不需要联网、安装软件或启动服务器。

昼夜默认跟随设备当地时间：06:00–18:00 为日光，其余为月夜。
点击海湾右上角的昼夜按钮，可以选择「自动 / 日光 / 月夜」。
鼠标左键框选水域后松开，随机放入一个生物；水波工具可以点击或拖动。
钓鱼时按住鼠标让绿色区域上升，松开下降。

图鉴和设置会尝试保存在当前浏览器。离线文件的保存方式取决于浏览器；
更换浏览器、移动或重命名 HTML、清理浏览器数据可能使旧记录不可用。
离线版与网站版的记录不会自动同步。

Unzip first, then double-click Desktop-Tides.html and open it in Chrome, Edge,
or Firefox. All artwork and code are included; no internet or local server is needed.
The game interface is Chinese and is designed for a mouse.
Day/night follows your device's local clock (06:00–18:00 is daytime), with an
Auto / Day / Night selector in the upper right.
Records are stored when the browser permits local-file storage. They are not synced
with the website. Changing browser, moving/renaming the file, or clearing browser
data can make old records unavailable.

作品集 / Portfolio: https://candicehong.cn/?lang=zh#desktop-tides
`;
if (crc32(Buffer.from('123456789')) !== 0xcbf43926) throw new Error('ZIP CRC32 self-check failed.');
const zip = createZip([['Desktop-Tides.html', html], ['README.txt', readme]]);
const output = resolve(root, 'downloads/desktop-tides-offline.zip');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, zip);
console.log(`Offline ZIP: ${output}`);
console.log(`${zip.length} bytes; single HTML plus README; ${embeddedImages.size} embedded images; zero required network resources.`);
