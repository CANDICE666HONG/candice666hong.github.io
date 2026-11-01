import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const desktopRoot = join(root, 'desktop-app');
const outputName = 'Desktop-Tides-Windows.exe';
const packageInfo = JSON.parse(readFileSync(join(desktopRoot, 'package.json'), 'utf8'));

function run(script, args = [], cwd = root) {
  const child = spawnSync(process.execPath, [script, ...args], {
    cwd, stdio: 'inherit', windowsHide: true,
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      ...((process.env.HTTPS_PROXY || process.env.HTTP_PROXY) ? { ELECTRON_GET_USE_PROXY: '1' } : {}),
    },
  });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`Build step failed (${child.status}): ${script}`);
}

// Reuse the offline renderer build so desktop and web always share game logic/art.
run(join(root, 'scripts/build-offline.mjs'));
const zip = readFileSync(join(root, 'downloads/desktop-tides-offline.zip'));
let html;
for (let offset = 0; zip.readUInt32LE(offset) === 0x04034b50;) {
  const flags = zip.readUInt16LE(offset + 6);
  const method = zip.readUInt16LE(offset + 8);
  const size = zip.readUInt32LE(offset + 18);
  const nameLength = zip.readUInt16LE(offset + 26);
  const extraLength = zip.readUInt16LE(offset + 28);
  if (flags & 8 || method !== 8) throw new Error('Unexpected offline ZIP encoding.');
  const name = zip.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
  const dataOffset = offset + 30 + nameLength + extraLength;
  if (name === 'Desktop-Tides.html') html = inflateRawSync(zip.subarray(dataOffset, dataOffset + size)).toString('utf8');
  offset = dataOffset + size;
}
if (!html) throw new Error('Offline ZIP does not contain the game.');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) throw new Error('Expected exactly one bundled script.');
const scriptHash = createHash('sha256').update(scripts[0][1]).digest('base64');
html = html.replace("script-src 'unsafe-inline'", `script-src 'sha256-${scriptHash}'`)
  .replace('<title>桌边潮汐 · 离线版</title>', '<title>桌边潮汐</title>');
if (html.includes('portfolio-nav') || /<script\s+src=|<link\s[^>]*href=/.test(html)) {
  throw new Error('Desktop renderer must contain the game only, with no external dependencies.');
}
mkdirSync(join(desktopRoot, 'content'), { recursive: true });
writeFileSync(join(desktopRoot, 'content/index.html'), html);
console.log(`Desktop renderer: ${Buffer.byteLength(html)} bytes, stable tides://bay/ origin.`);

if (process.argv.includes('--prepare-only')) process.exit(0);
if (process.platform !== 'win32') throw new Error('Build the Windows EXE on Windows.');
const builder = resolve(desktopRoot, 'node_modules/electron-builder/cli.js');
if (!existsSync(builder)) throw new Error('Install desktop-app dependencies first.');
run(builder, ['--win', 'portable', '--x64', '--publish', 'never'], desktopRoot);
const output = join(desktopRoot, 'release', outputName);
const bytes = readFileSync(output);
if (bytes.subarray(0, 2).toString() !== 'MZ' || bytes.readUInt32LE(bytes.readUInt32LE(0x3c)) !== 0x00004550) {
  throw new Error('Packaged file is not a Windows PE executable.');
}
const sha256 = createHash('sha256').update(bytes).digest('hex');
writeFileSync(`${output}.sha256`, `${sha256}  ${outputName}\n`);
const runtime = readFileSync(join(desktopRoot, 'release/win-unpacked', packageInfo.build.productName + '.exe'));
const peOffset = runtime.readUInt32LE(0x3c);
if (runtime.readUInt32LE(peOffset) !== 0x00004550 || runtime.readUInt16LE(peOffset + 4) !== 0x8664) {
  throw new Error('Expected a Windows x64 runtime.');
}
if (runtime.readUInt16LE(peOffset + 24 + 68) !== 2) throw new Error('Expected a native Windows GUI executable.');
const manifest = {
  product: packageInfo.build.productName,
  version: packageInfo.version,
  platform: 'win32',
  arch: 'x64',
  electron: packageInfo.devDependencies.electron,
  builder: packageInfo.devDependencies['electron-builder'],
  artifact: outputName,
  bytes: bytes.length,
  sha256,
  rendererSha256: createHash('sha256').update(html).digest('hex'),
  embeddedImages: new Set(html.match(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g)).size,
  requiredNetworkResources: 0,
  origin: 'tides://bay/',
  saveDirectory: '%APPDATA%/DesktopTides',
  signing: 'unsigned',
};
if (manifest.embeddedImages !== 13) throw new Error('Expected all 13 game images.');
writeFileSync(join(desktopRoot, 'release/build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Windows portable: ${output}\n${bytes.length} bytes\nSHA256: ${sha256}`);
