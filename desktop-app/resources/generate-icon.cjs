// Optional asset-authoring helper. The generated ICO is checked in for builds.
// Run from repository root after installing the portfolio source dependencies.
const { createRequire } = require('node:module');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '../..');
const nextRequire = createRequire(require.resolve('next', { paths: [join(root, 'source')] }));
const sharp = nextRequire('sharp');
(async () => {
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(sizes.map(size => sharp(readFileSync(join(__dirname, 'icon.svg'))).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const at = 6 + index * 16;
    header[at] = size % 256;
    header[at + 1] = size % 256;
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(pngs[index].length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += pngs[index].length;
  });
  writeFileSync(join(__dirname, 'icon.ico'), Buffer.concat([header, ...pngs]));
})();
