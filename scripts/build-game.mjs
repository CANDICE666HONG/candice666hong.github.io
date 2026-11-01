import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.resolve(root, 'source-games', 'desktop-tides');
const output = path.resolve(root, 'projects', 'desktop-tides');
const expectedOutput = path.join(root, 'projects', 'desktop-tides');
if (output !== expectedOutput || !output.startsWith(path.resolve(root) + path.sep)) {
  throw new Error('Refusing to build outside projects/desktop-tides.');
}

const requireFromGame = createRequire(path.join(source, 'package.json'));
let vitePackage;
try {
  vitePackage = requireFromGame.resolve('vite/package.json');
} catch {
  console.error('Install the game dependencies first: cd source-games/desktop-tides && npm install');
  process.exit(1);
}
const installed = JSON.parse(readFileSync(vitePackage, 'utf8'));
if (installed.version !== '6.4.2') throw new Error(`Expected Vite 6.4.2, found ${installed.version}.`);
const vite = path.join(path.dirname(vitePackage), 'bin', 'vite.js');
// Keep prior fingerprinted scripts/styles available to visitors with cached HTML.
const assetDirectory = path.join(output, 'assets');
const cachedAssets = existsSync(assetDirectory)
  ? readdirSync(assetDirectory).filter(name => /^index-[\w-]+\.(js|css)$/.test(name))
    .map(name => [name, readFileSync(path.join(assetDirectory, name))])
  : [];
const build = spawnSync(process.execPath, [vite, 'build', '--config', path.join(source, 'vite.config.mjs')], {
  cwd: source,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);
if (!existsSync(path.join(output, 'index.html'))) throw new Error('The game build did not produce index.html.');
for (const [name, content] of cachedAssets) {
  const target = path.join(assetDirectory, name);
  if (!existsSync(target)) writeFileSync(target, content);
}
console.log('Playable game rebuilt in projects/desktop-tides/.');
