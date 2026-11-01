import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSelection, screenToWorld, randomCreatureType, SUPPORTED_CREATURE_TYPES } from '../src/game/placement.js';
import { shorelineX } from '../src/game/simulation.js';

test('random placement includes all three saved creature types with equal probability ranges', () => {
  assert.deepEqual(SUPPORTED_CREATURE_TYPES, ['fish', 'jelly', 'ray']);
  const draws = [0, 1 / 3 - Number.EPSILON, 1 / 3, 2 / 3 - Number.EPSILON, 2 / 3, 1 - Number.EPSILON];
  let calls = 0;
  const random = () => draws[calls++];
  assert.deepEqual(draws.map(() => randomCreatureType(random)), ['fish', 'fish', 'jelly', 'jelly', 'ray', 'ray']);
  assert.equal(calls, draws.length, 'one random draw per committed placement');
});

test('seeded random placements remain balanced across fish, jellyfish and rays', () => {
  let seed = 20261101;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const counts = { fish: 0, jelly: 0, ray: 0 };
  for (let i = 0; i < 9000; i++) counts[randomCreatureType(random)]++;
  for (const count of Object.values(counts)) assert.ok(count > 2850 && count < 3150, JSON.stringify(counts));
});

test('forward and reverse drags produce the same water rectangle and exact center', () => {
  const start = { x: 620, y: 260, inside: true };
  const end = { x: 780, y: 340, inside: true };
  const expected = { x: 620, y: 260, width: 160, height: 80, centerX: 700, centerY: 300, valid: true };
  assert.deepEqual(makeSelection(start, end), expected);
  assert.deepEqual(makeSelection(end, start), expected);
});

test('a box crossing sand is rejected even if its center and both drag endpoints are water', () => {
  const start = { x: 400, y: 100 };
  const end = { x: 300, y: 200 };
  assert.ok(start.x >= shorelineX(start.y));
  assert.ok(end.x >= shorelineX(end.y));
  // This diagonal's upper-left rectangle corner enters the sand.
  const selection = makeSelection(start, end);
  assert.equal(selection.valid, false);
  assert.equal(selection.centerX, 350);
  assert.equal(selection.centerY, 150);
  assert.ok(selection.centerX >= shorelineX(selection.centerY));
});

test('sand, outside-world coordinates and releases outside the canvas are invalid', () => {
  assert.equal(makeSelection({ x: 10, y: 10 }, { x: 40, y: 40 }).valid, false);
  assert.equal(makeSelection({ x: 900, y: 300 }, { x: 1601, y: 400 }).valid, false);
  assert.equal(makeSelection({ x: 900, y: 300 }, { x: 1200, y: 901 }).valid, false);
  assert.equal(makeSelection({ x: -1, y: 500 }, { x: 50, y: 600 }).valid, false);
  assert.equal(makeSelection({ x: 700, y: 300, inside: false }, { x: 710, y: 320 }).valid, false);
  assert.equal(makeSelection({ x: 700, y: 300 }, { x: 710, y: 320, inside: false }).valid, false);
});

test('a click or a tiny near-shore selection remains valid without silently shifting it', () => {
  const point = { x: shorelineX(200) + .1, y: 200, inside: true };
  const click = makeSelection(point, point);
  assert.equal(click.valid, true);
  assert.equal(click.width, 0);
  assert.equal(click.height, 0);
  assert.equal(click.centerX, point.x);
  assert.equal(click.centerY, point.y);
  const tiny = makeSelection(point, { x: point.x + .2, y: 200.2 });
  assert.equal(tiny.valid, true);
  assert.equal(tiny.centerX, point.x + .1);
});

test('custom world bounds apply, and malformed inputs return safe invalid geometry', () => {
  assert.equal(makeSelection({ x: 600, y: 450 }, { x: 810, y: 500 }, { worldWidth: 800, worldHeight: 600 }).valid, false);
  for (const value of [NaN, Infinity, -Infinity, '100', undefined]) {
    const selection = makeSelection({ x: value, y: 200 }, { x: 500, y: 400 });
    assert.equal(selection.valid, false);
    assert.ok(Object.entries(selection).filter(([key]) => key !== 'valid').every(([, v]) => Number.isFinite(v)));
  }
  assert.equal(makeSelection(null, null).valid, false);
  assert.deepEqual(makeSelection({ x: -1e308, y: 200 }, { x: 1e308, y: 400 }), { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0, valid: false });
  assert.equal(makeSelection({ x: 500, y: 400 }, { x: 500, y: 400 }, { worldWidth: 0 }).valid, false);
});

test('screen conversion accounts for centered card origin, camera offset and scale', () => {
  const rect = { left: 240, top: 120, width: 800, height: 600 };
  const view = { scale: 2 / 3, offsetX: -100, offsetY: 0 };
  const point = screenToWorld({ clientX: 640, clientY: 420 }, rect, view);
  assert.deepEqual(point, { x: 750, y: 450, inside: true });
  assert.equal(screenToWorld({ clientX: 1041, clientY: 420 }, rect, view).inside, false);
  assert.equal(screenToWorld({ clientX: 640, clientY: 119 }, rect, view).inside, false);
  assert.equal(screenToWorld({ clientX: 1040, clientY: 720 }, rect, view).inside, true);
});

test('screen conversion never maps invalid geometry into a valid interaction', () => {
  assert.deepEqual(screenToWorld({ clientX: 0, clientY: 0 }, { left: 0, top: 0, width: 0, height: 600 }, { scale: 1 }), { x: 0, y: 0, inside: false });
  assert.equal(screenToWorld({ clientX: 500, clientY: 200 }, { left: 0, top: 0, width: 800, height: 600 }, { scale: 0 }).inside, false);
  assert.equal(screenToWorld({ clientX: NaN, clientY: 200 }, { left: 0, top: 0, width: 800, height: 600 }, { scale: 1 }).inside, false);
  assert.equal(screenToWorld(null, null, null).inside, false);
  assert.equal(screenToWorld({ clientX: 500, clientY: 200 }, { left: 0, top: 0, width: 800, height: 600 }, { scale: 1e-320 }).inside, false);
});
