import species from '../../data/species.json' with { type: 'json' };
import { encounterPool } from '../../data/appearance.js';

export { formatFishWeight as formatWeight } from '../../data/weight-format.js';

const daytimeFish = encounterPool(species, 'day');
const nighttimeFish = encounterPool(species, 'night');

// Call once per cast. Its result stays with that cast, even after a change of light.
export function createEncounter(night, random = Math.random) {
  const pool = night ? nighttimeFish : daytimeFish;
  const { id, name, weightGrams } = pool[Math.floor(random() * pool.length)];
  const image = new URL(`../../art/fish/${id}.webp`, import.meta.url).href;
  return { id, name, image, grams: weightGrams, night: Boolean(night) };
}
