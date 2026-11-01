export const CLOCK_SAVE_KEY = 'desktop-tides-clock-v1';
export const CLOCK_PREFERENCES = ['auto', 'day', 'night'];

export function restoreClockPreference(raw) {
  return raw && raw.version === 1 && CLOCK_PREFERENCES.includes(raw.preference)
    ? raw.preference : 'auto';
}

export function clockSave(preference) {
  return { version: 1, preference: CLOCK_PREFERENCES.includes(preference) ? preference : 'auto' };
}

export function resolveDayNight(preference, date = new Date()) {
  if (preference === 'day' || preference === 'night') return preference;
  const hour = date.getHours();
  return hour < 6 || hour >= 18 ? 'night' : 'day';
}

export function untilNextMinute(date) {
  return 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds());
}

// The browser adapter supplies visibility/focus events; no frame-loop polling is needed.
export function createLocalClock({ onChange, now = () => new Date(), isHidden = () => false,
  schedule = setTimeout, cancel = clearTimeout }) {
  let timer = null, stopped = false, previous;
  function refresh() {
    if (timer !== null) cancel(timer);
    timer = null;
    if (stopped || isHidden()) return;
    const date = now();
    const mode = resolveDayNight('auto', date);
    if (mode !== previous) { previous = mode; onChange(mode); }
    timer = schedule(refresh, untilNextMinute(date));
  }
  return {
    refresh,
    dispose() { stopped = true; if (timer !== null) cancel(timer); timer = null; },
  };
}
