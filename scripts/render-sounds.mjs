import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { renderSound, SOUND_NAMES } = await import(pathToFileURL(resolve(root, 'assets/audio/sound-design.js')));
const rate = 44100;
// These exports are previews at the same master gain used by the live interface.
const output = resolve(process.argv[2] || resolve(root, 'assets/audio/previews'));
mkdirSync(output, { recursive: true });

function wav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buffer;
}

const parts = [];
const report = [];
for (const name of SOUND_NAMES) {
  const raw = renderSound(name, rate);
  const samples = Float32Array.from(raw, value => value * 0.3);
  if (samples.some(value => !Number.isFinite(value) || Math.abs(value) > 1)) throw Error(`Invalid audio: ${name}`);
  writeFileSync(resolve(output, name + '.wav'), wav(samples));
  parts.push(new Float32Array(Math.round(rate * 0.45)), samples);
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  report.push({ name, duration: +(samples.length / rate).toFixed(3), peakDbFS: +(20 * Math.log10(peak)).toFixed(1) });
}
parts.push(new Float32Array(rate / 2));
const demo = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
let position = 0;
for (const part of parts) { demo.set(part, position); position += part.length; }
writeFileSync(resolve(output, 'interface-sounds.wav'), wav(demo));
console.log(JSON.stringify({ output, sounds: report, previewSeconds: +(demo.length / rate).toFixed(2) }, null, 2));
