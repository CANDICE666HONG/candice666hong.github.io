/** Original, deterministic PCM for Candice's glass-and-air interface sounds. */
export const SOUND_NAMES = Object.freeze([
  "click", "open", "close", "enter", "swipeForward", "swipeBackward",
]);

const definitions = {
  click: { duration: 0.12, peak: 0.35 },
  open: { duration: 0.30, peak: 0.30 },
  close: { duration: 0.25, peak: 0.27 },
  enter: { duration: 1.08, peak: 0.40 },
  swipeForward: { duration: 0.19, peak: 0.19 },
  swipeBackward: { duration: 0.19, peak: 0.19 },
};
const TAU = Math.PI * 2;
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

function envelope(t, attack, decay, duration) {
  if (t < 0 || t >= duration) return 0;
  const onset = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, t / attack));
  const tail = Math.min(1, (duration - t) / Math.min(0.018, duration / 4));
  return onset * Math.exp(-t / decay) * tail * tail;
}

function chirp(t, start, end, duration) {
  const ratio = Math.log(end / start);
  const phase = Math.abs(ratio) < 0.00001 ? start * t : start * duration / ratio * Math.expm1(ratio * t / duration);
  return Math.sin(TAU * phase);
}

/** Generate the exact same mono sample bank in browsers and in the WAV exporter. */
export function renderSound(name, sampleRate = 44100) {
  const definition = definitions[name];
  if (!definition) throw new RangeError(`Unknown sound: ${name}`);
  const rate = Math.round(clamp(Number(sampleRate) || 44100, 16000, 96000));
  const { duration, peak } = definition;
  const samples = new Float32Array(Math.ceil(duration * rate));
  let seed = 0x5ea1c3 + SOUND_NAMES.indexOf(name) * 7919;
  let slowNoise = 0;
  let filteredNoise = 0;
  const highPassMemory = Math.exp(-TAU * 240 / rate);
  let maximum = 0;

  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const progress = t / duration;
    // Seeded noise makes exports and live synthesis reproducible.
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const white = seed / 2147483648 - 1;
    slowNoise = highPassMemory * slowNoise + (1 - highPassMemory) * white;
    const backwards = name === "swipeBackward" || name === "close";
    const cutoff = name === "click" ? 4600 : 850 + 1650 * (backwards ? 1 - progress : progress);
    const lowPassMemory = Math.exp(-TAU * cutoff / rate);
    filteredNoise = lowPassMemory * filteredNoise + (1 - lowPassMemory) * (white - slowNoise);
    let value = 0;

    if (name === "click") {
      // A small tactile body with two rounded, glass-like resonances.
      value = 0.22 * chirp(t, 980, 670, 0.12) * envelope(t, 0.0018, 0.018, duration)
        + 0.12 * Math.sin(TAU * 1468.32 * t) * envelope(t, 0.002, 0.026, duration)
        + 0.16 * chirp(t, 220, 130, 0.08) * envelope(t, 0.002, 0.013, 0.07)
        + 0.075 * filteredNoise * envelope(t, 0.001, 0.009, 0.05);
    } else if (name === "open" || name === "close") {
      const opening = name === "open";
      const air = Math.pow(Math.sin(Math.PI * progress), 2) * (1 - progress * 0.45);
      value = 0.12 * chirp(t, opening ? 330 : 560, opening ? 660 : 250, duration) * envelope(t, 0.009, 0.075, duration)
        + 0.055 * Math.sin(TAU * (opening ? 1046.5 : 783.99) * t) * envelope(t, 0.014, 0.06, duration)
        + 0.26 * filteredNoise * air;
    } else if (name === "enter") {
      // Three overlapping notes finish within the site's 1.15 s entry transition.
      const notes = [261.6256, 391.9954, 523.2511];
      for (let note = 0; note < notes.length; note++) {
        const local = t - note * 0.085;
        if (local < 0) continue;
        const sustain = envelope(local, 0.02, 0.24, duration - note * 0.085);
        value += sustain * (0.13 * Math.sin(TAU * notes[note] * local)
          + 0.025 * Math.sin(TAU * notes[note] * 2 * local));
      }
      value += 0.095 * filteredNoise * envelope(t, 0.06, 0.13, 0.5);
    } else {
      // Short, direction-specific air pulses. No loop or background noise bed.
      const air = Math.pow(Math.sin(Math.PI * progress), 2);
      value = 0.50 * filteredNoise * air
        + 0.023 * chirp(t, backwards ? 650 : 340, backwards ? 340 : 650, duration) * air;
    }

    // A gentle final edge fade prevents discontinuities at either buffer boundary.
    const edge = Math.min(1, t / 0.0015, (duration - t) / 0.006);
    samples[i] = value * Math.max(0, edge);
    maximum = Math.max(maximum, Math.abs(samples[i]));
  }
  const scale = maximum > 0 ? peak / maximum : 0;
  for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  samples[0] = samples[samples.length - 1] = 0;
  return samples;
}
