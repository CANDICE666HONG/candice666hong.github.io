import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, LIMITS, WORLD_WIDTH, WORLD_HEIGHT, shorelineX } from '../src/game/simulation.js';

function tick(sim, seconds, dt = 1 / 30) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) sim.update(dt);
}

test('a reproducible populated bay contains all three independent species', () => {
  const a = createSimulation({ seed: 43 });
  const b = createSimulation({ seed: 43 });
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.equal(a.creatures.filter(c => c.type === 'fish').length, 24);
  assert.equal(a.creatures.filter(c => c.type === 'jelly').length, 5);
  assert.equal(a.creatures.filter(c => c.type === 'ray').length, 3);
  assert.equal(new Set(a.creatures.map(c => c.phase)).size, 32);
  tick(a, 2); tick(b, 2);
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test('a local drawn current changes a nearby swimmer in its direction', () => {
  const still = createSimulation({ seed: 82 });
  const flowing = createSimulation({ seed: 82 });
  const target = still.creatures.find(c => c.type === 'jelly');
  const matching = flowing.creatures.find(c => c.id === target.id);
  const initialX = target.x, initialY = target.y;
  for (let i = 0; i < 45; i++) {
    if (i % 5 === 0) flowing.addCurrent(initialX, initialY, 1, 0, 1.2);
    still.update(1 / 30); flowing.update(1 / 30);
  }
  assert.ok(matching.x > target.x + 12, 'current should move the jellyfish to the right');
  assert.ok(Math.abs(matching.y - target.y) < 15, 'horizontal strokes should remain directional');
});

test('click creates an expanding ring that disappears without residual effects', () => {
  const sim = createSimulation();
  const ring = sim.addRipple(800, 450);
  assert.ok(ring);
  const startRadius = ring.radius;
  tick(sim, 0.4);
  assert.ok(ring.radius > startRadius + 20);
  assert.ok(sim.particles.length > 0);
  tick(sim, 5);
  assert.equal(sim.ripples.length, 0);
  assert.equal(sim.particles.length, 0);
});

test('continuous input is bounded and transient arrays expire', () => {
  const sim = createSimulation();
  for (let i = 0; i < 5000; i++) {
    sim.addCurrent(800 + i % 200, 450, 6, 4);
    sim.addRipple(850, 450);
  }
  assert.ok(sim.currents.length <= LIMITS.currents);
  assert.ok(sim.ripples.length <= LIMITS.ripples);
  assert.ok(sim.particles.length <= LIMITS.particles);
  tick(sim, 5);
  assert.equal(sim.currents.length, 0);
  assert.equal(sim.ripples.length, 0);
  assert.equal(sim.particles.length, 0);
});

test('long running movement stays finite, inside the scene, and outside land', () => {
  const sim = createSimulation({ seed: 12 });
  for (let i = 0; i < 18000; i++) {
    if (i % 60 === 0) sim.addCurrent(500 + i % 1000, 250 + i % 500, -1, -1, 2);
    sim.update(1 / 30);
  }
  assert.ok(Math.abs(sim.time - 600) < 1e-6);
  for (const c of sim.creatures) {
    assert.ok([c.x, c.y, c.vx, c.vy, c.angle, c.phase].every(Number.isFinite));
    assert.ok(c.x >= shorelineX(c.y));
    assert.ok(c.x > 0 && c.x < WORLD_WIDTH);
    assert.ok(c.y > 0 && c.y < WORLD_HEIGHT);
  }
});

test('invalid input and stalled-frame dt cannot poison or teleport the world', () => {
  const sim = createSimulation({ seed: 'guard' });
  const before = sim.snapshot();
  for (const dt of [0, -1, NaN, Infinity, undefined]) sim.update(dt);
  assert.deepEqual(sim.snapshot(), before);
  assert.equal(sim.addCurrent(800, 450, 0, 0), null);
  assert.equal(sim.addCurrent(NaN, 450, 1, 0), null);
  assert.equal(sim.addRipple(50, 50), null);
  assert.equal(sim.addRipple(-10, 450), null);
  const equivalent = createSimulation({ seed: 'guard' });
  sim.update(5000); equivalent.update(0.1);
  assert.deepEqual(sim.snapshot(), equivalent.snapshot());
  assert.ok(Math.abs(sim.creatures[0].x - before.creatures[0].x) < 10);
});

test('new residents respect the coastline and population limit', () => {
  const sim = createSimulation();
  assert.equal(sim.addCreature('shark'), null);
  const resident = sim.addCreature('ray', -1000, -1000);
  assert.ok(resident.x > shorelineX(resident.y));
  assert.equal(resident.spawnAge, 0);
  for (let i = 0; i < 200; i++) sim.addCreature('fish', 850, 450);
  assert.equal(sim.creatures.length, LIMITS.creatures);
  assert.equal(sim.addCreature('jelly'), null);
});

test('a selected water position is used exactly before boundary protection eases in', () => {
  const sim = createSimulation();
  const y = 450, x = shorelineX(y) + 2;
  const resident = sim.addCreature('fish', x, y, { exactPosition: true });
  assert.equal(resident.x, x);
  assert.equal(resident.y, y);
  sim.update(1 / 60);
  assert.ok(Math.abs(resident.x - x) < 2, 'a shore-adjacent drop must not jump away on the first frame');
  tick(sim, 2);
  assert.ok(resident.x >= shorelineX(resident.y));
});

test('reduced motion lowers settled movement without freezing the scene', () => {
  const full = createSimulation({ seed: 91 });
  const reduced = createSimulation({ seed: 91 });
  reduced.setReducedMotion(true);
  tick(full, 6); tick(reduced, 6);
  const meanSpeed = sim => sim.creatures.reduce((total, c) => total + Math.hypot(c.vx, c.vy), 0) / sim.creatures.length;
  assert.ok(meanSpeed(reduced) > 1);
  assert.ok(meanSpeed(reduced) < meanSpeed(full) * 0.75);
  const copy = reduced.snapshot();
  copy.creatures[0].x = -5;
  assert.ok(reduced.creatures[0].x > 0, 'snapshot does not expose mutable resident state');
});

test('animation phase remains continuous across a full revolution', () => {
  const sim = createSimulation();
  const frequencies = { fish: 4.6, jelly: 1.5, ray: 1.6 };
  const harmonics = { fish: 2.1, jelly: 1.2, ray: 0.85 };
  for (const type of Object.keys(frequencies)) {
    const resident = sim.creatures.find(c => c.type === type);
    resident.phase = Math.PI * 2 - 0.001;
  }
  const before = sim.snapshot();
  sim.update(0.01);
  for (const type of Object.keys(frequencies)) {
    const resident = sim.creatures.find(c => c.type === type);
    const previous = before.creatures.find(c => c.id === resident.id);
    assert.ok(resident.phase > Math.PI * 2, `${type} phase must not wrap at 2π`);
    assert.ok(Math.abs(resident.phase - previous.phase - frequencies[type] * 0.01) < 1e-9);
    const displacement = Math.abs(Math.sin(resident.phase * harmonics[type]) - Math.sin(previous.phase * harmonics[type]));
    assert.ok(displacement < 0.1, `${type} deformation must move continuously across the boundary`);
  }
});

test('idle residents keep circulating through the bay instead of settling along its edges', () => {
  const sim = createSimulation({ seed: 27062026 });
  // Deliberately begin larger residents at the lower corners, where a fixed
  // preferred heading used to pin them after a few minutes of idle viewing.
  const rays = sim.creatures.filter(c => c.type === 'ray');
  rays.forEach((c, i) => { c.x = i % 2 ? 1490 : 110; c.y = 820; });
  tick(sim, 180);
  for (const c of rays) {
    assert.ok(c.x > 180 && c.x < 1420 && c.y > 130 && c.y < 770, 'rays return to interior destinations');
  }
  let edgeSamples = 0, totalSamples = 0;
  for (let i = 0; i < 24; i++) {
    tick(sim, 5);
    for (const c of sim.creatures) {
      totalSamples++;
      if (c.x < shorelineX(c.y) + 80 || c.x > 1490 || c.y < 95 || c.y > 805) edgeSamples++;
    }
  }
  assert.ok(edgeSamples / totalSamples < 0.12, 'the interior should remain populated throughout idle play');
});
