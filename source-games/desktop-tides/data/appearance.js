export const appearanceLabels = Object.freeze({ day: '日间可遇见', night: '夜间可遇见', any: '日夜可遇见' });

export function canEncounter(entry, period) {
  if (period !== 'day' && period !== 'night') return false;
  return entry?.appearance === 'any' || entry?.appearance === period;
}

export function encounterPool(entries, period) {
  return entries.filter(entry => canEncounter(entry, period));
}

export function nextEncounterIndex(entries, currentIndex, period) {
  const eligible = entries.map((entry, index) => canEncounter(entry, period) ? index : -1).filter(index => index >= 0);
  if (eligible.length === 0) return -1;
  const position = eligible.indexOf(currentIndex);
  return eligible[(position + 1) % eligible.length];
}
