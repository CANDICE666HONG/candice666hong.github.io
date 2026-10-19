import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'source');
const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], {
  cwd: source, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
if (build.status !== 0) process.exit(build.status ?? 1);
const output = resolve(source, 'out');
if (!existsSync(resolve(output, 'index.html'))) throw new Error('Static export did not produce index.html');
const protectedPaths = new Set(['about', 'assets', 'images', 'CNAME', '.nojekyll', 'source', 'scripts']);
const entries = readdirSync(output);
for (const entry of entries) {
  if (protectedPaths.has(entry)) throw new Error(`Export conflicts with maintained path: ${entry}`);
}
for (const entry of entries) cpSync(resolve(output, entry), resolve(root, entry), { recursive: true });
console.log('Static export copied into the GitHub Pages directory.');
