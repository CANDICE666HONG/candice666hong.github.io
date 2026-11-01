import test from 'node:test';
import assert from 'node:assert/strict';
import { accessSync } from 'node:fs';
import { ACHIEVEMENTS, FISH_CATALOG, createCollection, recordCatch, restoreCollection } from '../src/game/collection.js';
import { createEncounter } from '../src/game/encounter.js';

const dayCatch = { ...createEncounter(false, () => 0), night: false };
const nightCatch = { ...createEncounter(true, () => 0), night: true };
const thirdCatch = { ...createEncounter(false, () => 0.2), night: false };

test('the collection catalog matches all eight actual catch illustrations without adding fish', () => {
  assert.equal(FISH_CATALOG.length, 8);
  assert.equal(new Set(FISH_CATALOG.map(fish => fish.id)).size, 8);
  const encountered = new Map();
  for (const [night, count] of [[false, 6], [true, 5]]) {
    for (let i = 0; i < count; i++) {
      const caught = createEncounter(night, () => (i + 0.5) / count);
      encountered.set(caught.id, caught);
    }
  }
  for (const fish of FISH_CATALOG) {
    const caught = encountered.get(fish.id);
    assert.equal(fish.name, caught.name);
    assert.equal(fish.image, caught.image);
    accessSync(new URL(fish.image));
  }
  assert.deepEqual(ACHIEVEMENTS.map(item => item.id), ['first-catch', 'moon-catch', 'three-species']);
});

test('a first catch unlocks one discovery; repeat catches preserve its date and greatest weight', () => {
  const empty = createCollection();
  const first = recordCatch(empty, dayCatch, 1000);
  assert.equal(first.isNew, true);
  assert.deepEqual(first.newAchievements, ['first-catch']);
  assert.deepEqual(first.collection.fish[dayCatch.id], { firstCaughtAt: 1000, maxGrams: dayCatch.grams, catches: 1 });
  assert.deepEqual(empty, createCollection());

  const smaller = recordCatch(first.collection, { ...dayCatch, grams: 500 }, 2000);
  const larger = recordCatch(smaller.collection, { ...dayCatch, grams: 1200 }, 3000);
  assert.equal(smaller.isNew, false);
  assert.deepEqual(smaller.newAchievements, []);
  assert.equal(smaller.collection.fish[dayCatch.id].maxGrams, dayCatch.grams);
  assert.deepEqual(larger.collection.fish[dayCatch.id], { firstCaughtAt: 1000, maxGrams: 1200, catches: 3 });
  assert.equal(first.collection.fish[dayCatch.id].catches, 1);
  assert.notEqual(larger.collection.fish[dayCatch.id], smaller.collection.fish[dayCatch.id]);
});

test('moon and three-species achievements unlock naturally once, with no duplicate notifications', () => {
  const first = recordCatch(createCollection(), dayCatch, 1000);
  const moon = recordCatch(first.collection, nightCatch, 2000);
  assert.deepEqual(moon.newAchievements, ['moon-catch']);
  const third = recordCatch(moon.collection, thirdCatch, 3000);
  assert.deepEqual(third.newAchievements, ['three-species']);
  const repeat = recordCatch(third.collection, nightCatch, 4000);
  assert.deepEqual(repeat.newAchievements, []);
  assert.deepEqual(repeat.collection.achievements, { 'first-catch': 1000, 'moon-catch': 2000, 'three-species': 3000 });
  const firstAtNight = recordCatch(createCollection(), nightCatch, 0);
  assert.deepEqual(firstAtNight.newAchievements, ['first-catch', 'moon-catch']);
  assert.deepEqual(recordCatch(firstAtNight.collection, nightCatch, 1).newAchievements, []);
});

test('night eligibility uses the successful round flag and does not infer it from species or truthy values', () => {
  const day = recordCatch(createCollection(), { ...nightCatch, night: false }, 1000);
  assert.deepEqual(day.newAchievements, ['first-catch']);
  const malformed = recordCatch(day.collection, { ...nightCatch, night: 'true' }, 2000);
  assert.deepEqual(malformed.newAchievements, []);
  const night = recordCatch(malformed.collection, { ...dayCatch, night: true }, 3000);
  assert.deepEqual(night.newAchievements, ['moon-catch']);
});

test('old saves, invalid collections and unsupported future versions safely start with an empty collection', () => {
  for (const raw of [undefined, null, false, 1, 'saved', [], {}, { version: 2 }, { version: 1, creatures: [] }]) {
    assert.deepEqual(restoreCollection(raw), createCollection());
  }
});

test('restoring removes unknown fish, invalid dates and weights without erasing valid discoveries', () => {
  const raw = {
    version: 1,
    fish: {
      [dayCatch.id]: { firstCaughtAt: 1000, maxGrams: 850, catches: -1 },
      [nightCatch.id]: { firstCaughtAt: -1, maxGrams: 800, catches: 1 },
      [thirdCatch.id]: { firstCaughtAt: 1000, maxGrams: Infinity, catches: 1 },
      invented: { firstCaughtAt: 1000, maxGrams: 400, catches: 1 },
    },
    achievements: { 'first-catch': 1000, 'moon-catch': NaN, 'three-species': 1000, invented: 1000 },
  };
  assert.deepEqual(restoreCollection(raw), {
    version: 1,
    fish: { [dayCatch.id]: { firstCaughtAt: 1000, maxGrams: 850, catches: 1 } },
    achievements: { 'first-catch': 1000 },
  });
  for (const firstCaughtAt of [NaN, Infinity, 8.64e15 + 1, '1000', -1]) {
    assert.deepEqual(restoreCollection({ version: 1, fish: { [dayCatch.id]: { firstCaughtAt, maxGrams: 850, catches: 1 } } }), createCollection());
  }
});

test('invalid catches never unlock anything or modify the existing record', () => {
  const saved = recordCatch(createCollection(), dayCatch, 1000).collection;
  const snapshot = structuredClone(saved);
  for (const caught of [undefined, null, [], {}, { ...dayCatch, id: '__proto__' }, { ...dayCatch, id: 'missing' },
    ...[0, -1, NaN, Infinity, '500', 500.5].map(grams => ({ ...dayCatch, grams }))]) {
    assert.deepEqual(recordCatch(saved, caught, 2000), { collection: saved, isNew: false, newAchievements: [] });
    assert.deepEqual(saved, snapshot);
  }
});

test('collection JSON round trips preserve discoveries, maximum weights and achievement dates', () => {
  let saved = recordCatch(createCollection(), dayCatch, 1000).collection;
  saved = recordCatch(saved, nightCatch, 2000).collection;
  saved = recordCatch(saved, thirdCatch, 3000).collection;
  const restored = restoreCollection(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored, saved);
  assert.deepEqual(recordCatch(restored, nightCatch, 4000).newAchievements, []);
});
