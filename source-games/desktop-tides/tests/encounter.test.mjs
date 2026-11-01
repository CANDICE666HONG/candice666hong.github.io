import test from 'node:test';
import assert from 'node:assert/strict';
import { accessSync } from 'node:fs';
import { createEncounter, formatWeight } from '../src/game/encounter.js';

const day = ['真鲷', '黑鲷', '鲻鱼', '鲐鱼', '绿鳍马面鲀', '金鲳鱼'];
const night = ['大黄鱼', '黑鲷', '花鲈', '鲻鱼', '鲐鱼'];

test('each cast draws from the eligible fish and carries a valid result image and weight', () => {
  for (const [isNight, names] of [[false, day], [true, night]]) {
    const casts = names.map((_, i) => createEncounter(isNight, () => (i + 0.5) / names.length));
    assert.deepEqual(casts.map(cast => cast.name).sort(), [...names].sort());
    for (const cast of casts) {
      accessSync(new URL(cast.image));
      assert.ok(Number.isSafeInteger(cast.grams) && cast.grams > 0);
    }
  }
});

test('a new nighttime cast retains its own result and leaves the daytime catch intact', () => {
  const earlier = createEncounter(false, () => 0);
  const later = createEncounter(true, () => 0);
  assert.deepEqual([later.name, formatWeight(later.grams)], ['大黄鱼', '1斤6两']);
  assert.deepEqual([earlier.name, formatWeight(earlier.grams)], ['真鲷', '1斤7两']);
  assert.equal(earlier.night, false);
  assert.equal(later.night, true);
});

test('catch weight preserves small fish, exact units, and carries rounding into jin', () => {
  for (const [grams, expected] of [[49, '不足1两（49克）'], [50, '1两'], [55, '1.1两'],
    [497, '约9.9两'], [498, '约1斤'], [500, '1斤'], [632, '约1斤2.6两']]) {
    assert.equal(formatWeight(grams), expected);
  }
  for (const invalid of [0, -12, 12.5, NaN, '500']) {
    assert.throws(() => formatWeight(invalid), RangeError);
  }
});
