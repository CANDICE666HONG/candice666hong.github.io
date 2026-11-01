import species from '../../data/species.json' with { type: 'json' };

export const FISH_CATALOG = species.map(({ id, name, appearance }) => ({
  id, name, appearance,
  image: new URL(`../../art/fish/${id}.webp`, import.meta.url).href,
}));

export const ACHIEVEMENTS = [
  { id: 'first-catch', name: '初次相逢', description: '钓到第一条鱼' },
  { id: 'moon-catch', name: '月下有鱼', description: '在月夜钓到一条鱼' },
  { id: 'three-species', name: '海湾新识', description: '发现三种不同的鱼' },
];

const fishIds = new Set(FISH_CATALOG.map(fish => fish.id));
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isWeight = value => Number.isSafeInteger(value) && value > 0;
const isTimestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15;

export function createCollection() {
  return { version: 1, fish: {}, achievements: {} };
}

// The collection is optional in older bay saves. Only copy recognized, usable entries.
export function restoreCollection(raw) {
  const collection = createCollection();
  if (!isRecord(raw) || raw.version !== 1) return collection;
  if (isRecord(raw.fish)) {
    for (const { id } of FISH_CATALOG) {
      if (!Object.hasOwn(raw.fish, id)) continue;
      const record = raw.fish[id];
      if (!isRecord(record) || !isWeight(record.maxGrams) || !isTimestamp(record.firstCaughtAt)) continue;
      collection.fish[id] = {
        firstCaughtAt: record.firstCaughtAt,
        maxGrams: record.maxGrams,
        catches: Number.isSafeInteger(record.catches) && record.catches > 0 ? record.catches : 1,
      };
    }
  }
  const count = Object.keys(collection.fish).length;
  if (count && isRecord(raw.achievements)) {
    for (const { id } of ACHIEVEMENTS) {
      if (!Object.hasOwn(raw.achievements, id) || !isTimestamp(raw.achievements[id])) continue;
      if (id === 'three-species' && count < 3) continue;
      collection.achievements[id] = raw.achievements[id];
    }
  }
  return collection;
}

// Called once for a successful round, using that round's locked time of day.
export function recordCatch(previous, caught, now = Date.now()) {
  const collection = restoreCollection(previous);
  if (!isRecord(caught) || !fishIds.has(caught.id) || !isWeight(caught.grams)) {
    return { collection, isNew: false, newAchievements: [] };
  }
  const timestamp = isTimestamp(now) ? now : Date.now();
  const known = collection.fish[caught.id];
  collection.fish[caught.id] = {
    firstCaughtAt: known?.firstCaughtAt ?? timestamp,
    maxGrams: Math.max(known?.maxGrams ?? 0, caught.grams),
    catches: Math.min(Number.MAX_SAFE_INTEGER, (known?.catches ?? 0) + 1),
  };
  const eligible = {
    'first-catch': true,
    'moon-catch': caught.night === true,
    'three-species': Object.keys(collection.fish).length >= 3,
  };
  const newAchievements = [];
  for (const { id } of ACHIEVEMENTS) {
    if (eligible[id] && !Object.hasOwn(collection.achievements, id)) {
      collection.achievements[id] = timestamp;
      newAchievements.push(id);
    }
  }
  return { collection, isNew: !known, newAchievements };
}
