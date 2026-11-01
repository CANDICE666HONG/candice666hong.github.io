import test from 'node:test';
import assert from 'node:assert/strict';
import { createFishingGame, isFishCovered } from '../src/game/fishing.js';

function play(game, seconds, controller = () => false, dt = 1 / 60) {
  for (let t = 0; t < seconds && game.status === 'playing'; t += dt) game.update(dt, controller(game));
  return game;
}

test('holding raises the green region and releasing lowers it smoothly', () => {
  const up = createFishingGame(), down = createFishingGame();
  const initial = up.barY;
  play(up, 0.3, () => true);
  play(down, 0.3, () => false);
  assert.ok(up.barY < initial - 0.04);
  assert.ok(down.barY > initial + 0.03);
  assert.ok(up.barVelocity < 0);
  const releasePosition = up.barY;
  play(up, 0.8, () => false);
  assert.ok(up.barY > releasePosition, 'release must eventually overcome upward inertia');
  assert.ok(up.barVelocity >= 0);
});

test('the entire fish icon must lie inside the green region, including its edges', () => {
  const sample = { fishY: 0.5, fishHeight: 0.07, barY: 0.5, barHeight: 0.30 };
  assert.equal(isFishCovered(sample), true);
  assert.equal(isFishCovered({ ...sample, fishY: 0.615 }), true);
  assert.equal(isFishCovered({ ...sample, fishY: 0.616 }), false);
  assert.equal(isFishCovered({ ...sample, fishY: 0.37 }), false);
  assert.equal(isFishCovered({ ...sample, fishY: NaN }), false);
});

test('coverage increases progress while separation decreases it', () => {
  const covered = createFishingGame({ seed: 5 });
  covered.barY = covered.fishY;
  const start = covered.progress;
  covered.update(1 / 60, false);
  assert.equal(covered.covered, true);
  assert.ok(covered.progress > start);
  const missed = createFishingGame({ seed: 5 });
  missed.barY = 0.85;
  missed.update(1 / 60, false);
  assert.equal(missed.covered, false);
  assert.ok(missed.progress < start);
});

test('green region never leaves the track even under sustained input', () => {
  const top = createFishingGame({ seed: 8 });
  const bottom = createFishingGame({ seed: 8 });
  play(top, 2, () => true);
  play(bottom, 2, () => false);
  assert.equal(top.barY, top.barHeight / 2);
  assert.equal(bottom.barY, 1 - bottom.barHeight / 2);
  assert.equal(top.barVelocity, 0);
  assert.equal(bottom.barVelocity, 0);
});

test('full and empty progress resolve exactly once and terminal state stays frozen', () => {
  const won = createFishingGame({ seed: 4 });
  won.barY = won.fishY; won.progress = 0.9999;
  won.update(1 / 60, false);
  assert.equal(won.status, 'caught');
  assert.equal(won.progress, 1);
  const wonSnapshot = won.snapshot();
  won.update(20, true);
  assert.deepEqual(won.snapshot(), wonSnapshot);

  const lost = createFishingGame({ seed: 4 });
  lost.barY = 0.85; lost.progress = 0.0001;
  lost.update(1 / 60, false);
  assert.equal(lost.status, 'escaped');
  assert.equal(lost.progress, 0);
  const lostSnapshot = lost.snapshot();
  lost.update(20, true);
  assert.deepEqual(lost.snapshot(), lostSnapshot);
});

test('seed and input produce repeatable motion, while a different seed changes it', () => {
  const a = createFishingGame({ seed: 'bay' }), b = createFishingGame({ seed: 'bay' });
  const c = createFishingGame({ seed: 'other' });
  assert.notEqual(a.fishY, c.fishY);
  for (let i = 0; i < 90; i++) { a.update(1 / 60, i % 30 < 15); b.update(1 / 60, i % 30 < 15); }
  assert.deepEqual(a.snapshot(), b.snapshot());
  const copied = a.snapshot(); copied.progress = 0;
  assert.notEqual(a.progress, copied.progress);
});

test('invalid or stalled frame times cannot teleport or poison the round', () => {
  const game = createFishingGame();
  const before = game.snapshot();
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt, true);
  assert.deepEqual(game.snapshot(), before);
  game.update(1000, true);
  assert.ok(game.elapsed <= 0.100001);
  assert.ok(Math.abs(game.barY - before.barY) < 0.03);
  assert.ok(Object.values(game.snapshot()).filter(value => typeof value === 'number').every(Number.isFinite));
});

test('a simple tracking player can win, while unattended rounds fail promptly', () => {
  for (let seed = 1; seed <= 24; seed++) {
    const tracked = createFishingGame({ seed });
    play(tracked, 15, game => game.barY + game.barVelocity * 0.22 > game.fishY);
    assert.equal(tracked.status, 'caught', `tracking should work for seed ${seed}`);
    assert.ok(tracked.elapsed >= 6 && tracked.elapsed <= 15, `catch time ${tracked.elapsed}`);
    const idle = createFishingGame({ seed });
    play(idle, 8);
    assert.equal(idle.status, 'escaped', `idle should fail for seed ${seed}`);
    assert.ok(idle.elapsed >= 3 && idle.elapsed <= 8, `idle duration ${idle.elapsed}`);
  }
});
