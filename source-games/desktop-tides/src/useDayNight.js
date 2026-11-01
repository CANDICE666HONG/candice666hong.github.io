import { useCallback, useEffect, useState } from 'react';
import { CLOCK_SAVE_KEY, clockSave, createLocalClock, resolveDayNight, restoreClockPreference } from './game/day-night.js';

function readPreference() {
  try { return restoreClockPreference(JSON.parse(localStorage.getItem(CLOCK_SAVE_KEY) || 'null')); }
  catch { return 'auto'; }
}

export function useDayNight() {
  const [preference, updatePreference] = useState(readPreference);
  const [mode, setMode] = useState(() => resolveDayNight(preference));
  const setPreference = useCallback(value => {
    const next = clockSave(value);
    updatePreference(next.preference);
    setMode(resolveDayNight(next.preference));
    try { localStorage.setItem(CLOCK_SAVE_KEY, JSON.stringify(next)); }
    catch { /* The current choice still works when browser storage is unavailable. */ }
  }, []);

  useEffect(() => {
    if (preference !== 'auto') return;
    const clock = createLocalClock({ onChange: setMode, isHidden: () => document.hidden });
    clock.refresh();
    window.addEventListener('focus', clock.refresh);
    document.addEventListener('visibilitychange', clock.refresh);
    return () => {
      clock.dispose();
      window.removeEventListener('focus', clock.refresh);
      document.removeEventListener('visibilitychange', clock.refresh);
    };
  }, [preference]);
  return { mode, preference, setPreference };
}
