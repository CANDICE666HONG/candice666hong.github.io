// Normalized vertical fishing track. Zero is the top, one is the bottom.
// No DOM or clock dependencies: one update represents the caller's held state.
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const TAU = Math.PI * 2;

function seededRandom(seed) {
  let value = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  return () => {
    value += 0x6D2B79F5;
    let n = value;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export function isFishCovered({ fishY, fishHeight, barY, barHeight }) {
  if (![fishY, fishHeight, barY, barHeight].every(Number.isFinite)) return false;
  return fishY - fishHeight / 2 >= barY - barHeight / 2 - 1e-9 &&
    fishY + fishHeight / 2 <= barY + barHeight / 2 + 1e-9;
}

export function createFishingGame({ seed = 29102026 } = {}) {
  const random = seededRandom(seed);
  const phase = random() * TAU;
  const secondPhase = random() * TAU;
  const speed = 0.85 + random() * 0.18;
  // Broad, smooth excursions are readable, while the two waves prevent a
  // mechanical up/down loop. The lower resting bar never covers the whole fish.
  const fishPosition = time => 0.45 + Math.sin(time * speed + phase) * 0.17 +
    Math.sin(time * 1.73 + secondPhase) * 0.055;

  const state = {
    fishY: fishPosition(0), fishHeight: 0.07,
    barY: 0.73, barHeight: 0.30, barVelocity: 0,
    progress: 0.42, status: 'playing', covered: false, elapsed: 0,
    update, snapshot,
  };
  state.covered = isFishCovered(state);

  function update(dt, held = false) {
    if (state.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return state;
    let remaining = Math.min(dt, 0.1);
    while (remaining > 1e-8 && state.status === 'playing') {
      const step = Math.min(remaining, 1 / 120);
      state.elapsed += step;
      state.fishY = fishPosition(state.elapsed);

      const acceleration = held ? -1.50 : 1.16;
      state.barVelocity = clamp((state.barVelocity + acceleration * step) * Math.exp(-2.3 * step), -0.53, 0.45);
      state.barY += state.barVelocity * step;
      const half = state.barHeight / 2;
      if (state.barY < half) { state.barY = half; state.barVelocity = 0; }
      if (state.barY > 1 - half) { state.barY = 1 - half; state.barVelocity = 0; }

      state.covered = isFishCovered(state);
      state.progress = clamp(state.progress + step * (state.covered ? 0.095 : -0.105), 0, 1);
      if (state.progress >= 1) { state.status = 'caught'; state.barVelocity = 0; }
      if (state.progress <= 0) { state.status = 'escaped'; state.barVelocity = 0; }
      remaining -= step;
    }
    return state;
  }

  function snapshot() {
    const { fishY, fishHeight, barY, barHeight, barVelocity, progress, status, covered, elapsed } = state;
    return { fishY, fishHeight, barY, barHeight, barVelocity, progress, status, covered, elapsed };
  }

  return state;
}
