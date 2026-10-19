import { renderSound, SOUND_NAMES } from "./sound-design.js";

// Shared by the React gallery and the standalone About page. No sound is started
// on load: even a remembered preference needs a fresh gesture on each document.
const STORAGE_KEY = "candice-sound";
const SAMPLE_RATE = 44100;
const SWIPE_INTERVAL = 220;
const listeners = new Set();
const voices = new Set();
let initialized = false;
let enabled = false;
let context = null;
let master = null;
let bank = null;
let ready = false;
let generation = 0;
let pendingUnlock = null;
let pendingGeneration = -1;
let unlockVersion = 0;
let lastSwipe = -Infinity;
let lastClick = -Infinity;
let mounts = 0;
let removeEvents = null;

const inBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";
const hidden = () => !inBrowser() || document.visibilityState === "hidden";
const now = () => typeof performance !== "undefined" ? performance.now() : Date.now();
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function initialize() {
  if (initialized || !inBrowser()) return;
  initialized = true;
  try { enabled = window.localStorage.getItem(STORAGE_KEY) === "on"; } catch { enabled = false; }
}
function savePreference() {
  try { window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off"); } catch { /* In-memory controls still work. */ }
}
function notify() {
  listeners.forEach(listener => { try { listener(); } catch { /* One subscriber cannot interrupt audio cleanup. */ } });
}
function release(voice, stop = false) {
  if (!voices.delete(voice)) return;
  voice.source.onended = null;
  if (stop) { try { voice.source.stop(); } catch { /* It may have already ended. */ } }
  try { voice.source.disconnect(); } catch { /* A failed start may already be disconnected. */ }
  try { voice.gain.disconnect(); } catch { /* Likewise. */ }
}
function silence() {
  generation += 1;
  ready = false;
  if (master) master.gain.value = 0;
  for (const voice of [...voices]) release(voice, true);
  lastSwipe = lastClick = -Infinity;
}
function disposeContext() {
  silence();
  const previous = context;
  try { master?.disconnect(); } catch { /* Already detached. */ }
  context = master = bank = null;
  pendingUnlock = null;
  pendingGeneration = -1;
  if (previous) {
    try { Promise.resolve(previous.close()).catch(() => {}); } catch { /* Optional browser audio support. */ }
  }
}
function failClosed(attempt) {
  if (generation !== attempt) return;
  enabled = false;
  disposeContext();
  savePreference();
  notify();
}

function unlock(retry = false) {
  if (!enabled || hidden()) return Promise.resolve(false);
  if (ready && context?.state === "running") return Promise.resolve(true);
  if (pendingUnlock && pendingGeneration === generation && !retry) return pendingUnlock;
  const attempt = generation;
  const version = ++unlockVersion;
  let candidate;
  let resumed;
  try {
    if (!context || context.state === "closed") {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) { failClosed(attempt); return Promise.resolve(false); }
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      bank = new Map(SOUND_NAMES.map(name => {
        const samples = renderSound(name, SAMPLE_RATE);
        const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
        buffer.getChannelData(0).set(samples);
        return [name, buffer];
      }));
    }
    candidate = context;
    // Call resume synchronously inside the trusted event, before a promise hop.
    resumed = candidate.state === "running" ? undefined : candidate.resume();
  } catch {
    failClosed(attempt);
    return Promise.resolve(false);
  }
  pendingGeneration = attempt;
  const promise = Promise.resolve(resumed).then(() => {
    if (attempt !== generation || version !== unlockVersion || !enabled || hidden() || context !== candidate || candidate.state !== "running") return false;
    ready = true;
    master.gain.value = 0.3;
    return true;
  }).catch(() => { if (version === unlockVersion) failClosed(attempt); return false; }).finally(() => {
    if (pendingUnlock === promise) pendingUnlock = null;
  });
  pendingUnlock = promise;
  return promise;
}

/** @returns {boolean} */
export function getSoundEnabled() {
  initialize();
  return inBrowser() && enabled;
}

/** @param {() => void} listener */
export function subscribeSound(listener) {
  initialize();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** @param {boolean} on @param {string} [cue] @returns {Promise<void>} */
export async function setSoundEnabled(on, cue = "click") {
  if (!inBrowser()) return;
  initialize();
  enabled = Boolean(on);
  if (!enabled) silence();
  savePreference();
  notify();
  if (enabled && await unlock()) playSound(cue);
}

/**
 * Never resumes audio itself. Scroll, inertia and programmatic UI changes cannot
 * turn sound on. A shared limiter keeps wheel/drag/native scroll unobtrusive.
 * @param {string} [name]
 * @param {{direction?: number, intensity?: number}} [opts]
 */
export function playSound(name = "click", opts = {}) {
  if (!enabled || hidden() || !ready || !context || context.state !== "running") return;
  const swipe = name === "swipe" || name === "swipeForward" || name === "swipeBackward";
  if (name === "swipe") name = (opts.direction ?? 1) < 0 ? "swipeBackward" : "swipeForward";
  const buffer = bank?.get(name);
  if (!buffer) return;
  const time = now();
  if ((swipe && time - lastSwipe < SWIPE_INTERVAL) || (name === "click" && time - lastClick < 45)) return;
  let voice;
  try {
    while (voices.size >= 4) release(voices.values().next().value, true);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    const intensity = Number.isFinite(opts.intensity) ? clamp(opts.intensity, 0, 1) : 0.5;
    gain.gain.value = swipe ? 0.3 + intensity * 0.7 : 1;
    source.connect(gain);
    gain.connect(master);
    voice = { source, gain };
    voices.add(voice);
    source.onended = () => release(voice);
    source.start();
    if (swipe) lastSwipe = time;
    if (name === "click") lastClick = time;
  } catch {
    if (voice) release(voice, true);
    // Audio is decorative and must never interrupt a navigation or interaction.
  }
}

/** Register one delegated listener set even when several React controls mount. */
export function mountInterfaceAudio() {
  if (!inBrowser()) return () => {};
  initialize();
  mounts += 1;
  if (mounts === 1) {
    const cleanups = [];
    const positions = new WeakMap();
    let intentUntil = 0;
    let scrollSource = null;
    let accumulated = 0;
    let accumulatedDirection = 0;
    const listen = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    };
    const elementOf = target => target?.nodeType === 1 ? target : target?.parentElement;
    const scrollElement = target => {
      let element = elementOf(target);
      while (element && element !== document.documentElement && element !== document.body) {
        const style = window.getComputedStyle(element);
        if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) return element;
        element = element.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    };
    const remember = element => {
      if (element) positions.set(element, { x: element.scrollLeft || 0, y: element.scrollTop || 0 });
    };
    const onGesture = event => {
      // Touch activation is granted at the end of the gesture; a touchstart
      // resume can stay pending on Safari and must not hold later input hostage.
      if (event.type === "pointerdown" && event.pointerType && event.pointerType !== "mouse") return;
      if (event.type === "pointerup" && event.pointerType === "mouse") return;
      if (event.type === "keydown" && (event.key === "Escape" || event.altKey || event.metaKey || event.ctrlKey)) return;
      if (event.isTrusted && getSoundEnabled()) void unlock(true);
    };
    const markIntent = event => {
      if (!event.isTrusted || !enabled || hidden()) return;
      if (event.type === "keydown") {
        if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return;
        const target = elementOf(event.target);
        if (target?.closest('input, textarea, select, [contenteditable="true"]') || event.altKey || event.metaKey || event.ctrlKey) return;
      }
      const element = scrollElement(event.target);
      if (element !== scrollSource || now() > intentUntil) {
        accumulated = 0;
        accumulatedDirection = 0;
      }
      scrollSource = element;
      remember(element);
      intentUntil = now() + 280;
    };
    const onScroll = event => {
      const element = event.target === document ? document.scrollingElement || document.documentElement : event.target;
      if (!element || typeof element !== "object") return;
      const previous = positions.get(element);
      const next = { x: element.scrollLeft || 0, y: element.scrollTop || 0 };
      positions.set(element, next);
      if (!event.isTrusted || !previous || element !== scrollSource || now() > intentUntil || hidden() || !enabled) return;
      const deltaY = next.y - previous.y;
      const deltaX = next.x - previous.x;
      const delta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
      if (!delta) return;
      const direction = Math.sign(delta);
      if (direction !== accumulatedDirection) accumulated = 0;
      accumulatedDirection = direction;
      accumulated += Math.abs(delta);
      if (accumulated >= 20) {
        playSound("swipe", { direction, intensity: clamp(accumulated / 180, 0.2, 1) });
        accumulated = 0;
      }
    };
    const onClick = event => {
      intentUntil = 0;
      accumulated = 0;
      if (!event.isTrusted) return;
      // A trusted click is also an activation fallback for older mobile browsers.
      const unlocking = enabled ? unlock(true) : null;
      const clickGeneration = generation;
      const target = elementOf(event.target);
      const control = target?.closest("a[href], button, [role='button']");
      if (!control || control.disabled || control.getAttribute("aria-disabled") === "true") return;
      if (target.closest('[data-sound="none"]')) return;
      const cue = target.closest("[data-sound]")?.getAttribute("data-sound") || "click";
      if (ready && context?.state === "running") playSound(cue);
      else if (unlocking) void unlocking.then(unlocked => {
        if (unlocked && generation === clickGeneration) playSound(cue);
      });
    };
    const onVisibility = () => {
      if (hidden()) { intentUntil = 0; silence(); }
    };
    listen(document, "pointerdown", onGesture, { capture: true, passive: true });
    listen(document, "pointerup", onGesture, { capture: true, passive: true });
    listen(document, "touchend", onGesture, { capture: true, passive: true });
    listen(document, "keydown", onGesture, true);
    listen(document, "wheel", markIntent, { capture: true, passive: true });
    listen(document, "touchmove", markIntent, { capture: true, passive: true });
    listen(document, "keydown", markIntent, true);
    listen(document, "scroll", onScroll, { capture: true, passive: true });
    listen(document, "click", onClick, true);
    listen(document, "visibilitychange", onVisibility);
    listen(window, "pagehide", () => { intentUntil = 0; disposeContext(); });
    listen(window, "storage", event => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = event.key === null ? false : event.newValue === "on";
      if (next === enabled) return;
      enabled = next;
      silence();
      notify();
    });
    removeEvents = () => { cleanups.forEach(cleanup => cleanup()); };
  }
  let mounted = true;
  return () => {
    if (!mounted) return;
    mounted = false;
    mounts = Math.max(0, mounts - 1);
    if (!mounts) {
      removeEvents?.();
      removeEvents = null;
      disposeContext();
    }
  };
}
