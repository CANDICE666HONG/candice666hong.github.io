import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { CLOCK_SAVE_KEY, clockSave, createLocalClock, resolveDayNight, restoreClockPreference, untilNextMinute } from '../src/game/day-night.js';

const local = (hour, minute = 0, second = 0, ms = 0) => new Date(2026, 10, 1, hour, minute, second, ms);

test('automatic light changes exactly at local 06:00 and 18:00, including midnight', () => {
  for (const [date, expected] of [[local(0), 'night'], [local(5, 59, 59, 999), 'night'],
    [local(6), 'day'], [local(17, 59, 59, 999), 'day'], [local(18), 'night'], [local(23, 59), 'night']]) {
    assert.equal(resolveDayNight('auto', date), expected);
  }
});

test('automatic light uses the device timezone rather than UTC or a fixed China offset', () => {
  const model = new URL('../src/game/day-night.js', import.meta.url).href;
  const run = timezone => execFileSync(process.execPath, ['--input-type=module', '-e',
    `import { resolveDayNight } from ${JSON.stringify(model)}; console.log(resolveDayNight('auto', new Date('2026-11-01T08:00:00Z')));`],
    { env: { ...process.env, TZ: timezone }, encoding: 'utf8' }).trim();
  assert.equal(run('Asia/Tokyo'), 'day');
  assert.equal(run('America/Los_Angeles'), 'night');
});

test('manual choices remain fixed across time boundaries, and auto resumes the current hour', () => {
  for (const hour of [0, 5, 6, 12, 18, 23]) {
    assert.equal(resolveDayNight('day', local(hour)), 'day');
    assert.equal(resolveDayNight('night', local(hour)), 'night');
  }
  assert.equal(resolveDayNight('auto', local(18)), 'night');
  assert.equal(resolveDayNight('auto', local(8)), 'day');
});

test('versioned clock choice round trips separately from legacy bay and collection saves', () => {
  assert.notEqual(CLOCK_SAVE_KEY, 'desktop-tides-v1');
  assert.notEqual(CLOCK_SAVE_KEY, 'desktop-tides-collection-v1');
  for (const choice of ['auto', 'day', 'night']) {
    assert.equal(restoreClockPreference(JSON.parse(JSON.stringify(clockSave(choice)))), choice);
  }
  const legacyBay = { version: 1, night: true, creatures: [{ type: 'jelly', variant: 0 }] };
  const before = JSON.stringify(legacyBay);
  assert.equal(restoreClockPreference(legacyBay), 'auto');
  assert.equal(JSON.stringify(legacyBay), before);
});

test('missing, malformed and unsupported future settings safely use automatic time', () => {
  for (const raw of [null, undefined, false, [], 'night', {}, { version: 2, preference: 'night' },
    { version: '1', preference: 'day' }, { version: 1, preference: 'sunset' }, { version: 1, preference: true }]) {
    assert.equal(restoreClockPreference(raw), 'auto');
  }
  assert.deepEqual(clockSave('invalid'), { version: 1, preference: 'auto' });
});

function fakeClock(date) {
  let current = date, hidden = false, serial = 0;
  const jobs = new Map(), changes = [];
  const clock = createLocalClock({
    now: () => current, isHidden: () => hidden, onChange: value => changes.push(value),
    schedule: (callback, delay) => { const id = ++serial; jobs.set(id, { callback, delay }); return id; },
    cancel: id => jobs.delete(id),
  });
  return { clock, jobs, changes,
    setDate: date => { current = date; }, setHidden: value => { hidden = value; },
    tick() { const [id, job] = [...jobs][0]; jobs.delete(id); job.callback(); },
  };
}

test('visible clock aligns to the minute and updates only when the light actually changes', () => {
  const f = fakeClock(local(17, 59, 59, 500));
  f.clock.refresh();
  assert.deepEqual(f.changes, ['day']);
  assert.equal([...f.jobs.values()][0].delay, 500);
  f.setDate(local(18)); f.tick();
  assert.deepEqual(f.changes, ['day', 'night']);
  assert.equal([...f.jobs.values()][0].delay, 60_000);
  f.setDate(local(18, 1)); f.tick();
  assert.deepEqual(f.changes, ['day', 'night']);
  assert.equal(f.jobs.size, 1);
  assert.equal(untilNextMinute(local(0, 0, 0, 1)), 59_999);
  f.clock.dispose();
});

test('hiding cancels the clock and resuming catches up after sleep or a timezone change', () => {
  const f = fakeClock(local(17));
  f.clock.refresh();
  f.setHidden(true); f.clock.refresh();
  assert.equal(f.jobs.size, 0);
  f.setDate(local(23));
  f.setHidden(false); f.clock.refresh();
  assert.deepEqual(f.changes, ['day', 'night']);
  f.setDate(local(9)); f.clock.refresh();
  assert.deepEqual(f.changes, ['day', 'night', 'day']);
  assert.equal(f.jobs.size, 1);
  f.clock.dispose();
});

test('disposing for manual mode or unmount prevents stale timers from changing the light', () => {
  const f = fakeClock(local(17));
  f.clock.refresh();
  const stale = [...f.jobs.values()][0].callback;
  f.clock.dispose(); f.setDate(local(20)); stale(); f.clock.refresh();
  assert.equal(f.jobs.size, 0);
  assert.deepEqual(f.changes, ['day']);
});
