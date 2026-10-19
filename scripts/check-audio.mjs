import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const designCode = await readFile(new URL('../assets/audio/sound-design.js', import.meta.url), 'utf8');
const designUrl = `data:text/javascript;base64,${Buffer.from(designCode).toString('base64')}`;
const code = (await readFile(new URL('../assets/audio/interface-audio.js', import.meta.url), 'utf8'))
  .replace('"./sound-design.js"', JSON.stringify(designUrl));
let version = 0;
const importEngine = () => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${version++}`);
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

function eventTarget() {
  const handlers = new Map();
  return {
    addEventListener(name, callback) {
      const list = handlers.get(name) || new Set(); list.add(callback); handlers.set(name, list);
    },
    removeEventListener(name, callback) { handlers.get(name)?.delete(callback); },
    emit(name, values = {}) {
      const event = { type: name, isTrusted: true, target: this, ...values };
      for (const callback of handlers.get(name) || []) callback(event);
    },
    count(name) { return handlers.get(name)?.size || 0; },
  };
}

async function scenario({ saved = null, blocked = false, deferred = false, missing = false, safari = false } = {}) {
  let clock = 1000;
  const storage = new Map(saved ? [['candice-sound', saved]] : []);
  const contexts = [];
  const sources = [];
  class FakeAudioContext {
    constructor() { this.state = 'suspended'; this.destination = {}; this.pending = []; this.closed = false; contexts.push(this); }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() { this.disconnected = true; } }; }
    createBuffer(channels, length, rate) {
      assert.equal(channels, 1); assert.equal(rate, 44100);
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    }
    createBufferSource() {
      const source = {
        active: false, stopped: false, disconnected: false, onended: null,
        connect() {}, start() { this.active = true; },
        stop() { this.stopped = true; this.active = false; this.onended?.(); },
        disconnect() { this.disconnected = true; },
        finish() { this.active = false; this.onended?.(); },
      };
      sources.push(source); return source;
    }
    resume() {
      if (!deferred) { this.state = 'running'; return Promise.resolve(); }
      return new Promise((resolve, reject) => this.pending.push({
        resolve: () => { this.state = 'running'; resolve(); }, reject,
      }));
    }
    close() { this.closed = true; this.state = 'closed'; return Promise.resolve(); }
  }
  const root = { nodeType: 1, scrollTop: 0, scrollLeft: 0, scrollHeight: 4000, clientHeight: 800 };
  const doc = { ...eventTarget(), visibilityState: 'visible', documentElement: root, scrollingElement: root, body: {} };
  const win = {
    ...eventTarget(),
    localStorage: {
      getItem(key) { if (blocked) throw new Error('Blocked storage'); return storage.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw new Error('Blocked storage'); storage.set(key, value); },
    },
    getComputedStyle(element) { return { overflowY: element.overflowY || 'visible' }; },
  };
  if (!missing) win[safari ? 'webkitAudioContext' : 'AudioContext'] = FakeAudioContext;
  globalThis.window = win;
  globalThis.document = doc;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true });
  const api = await importEngine();
  return {
    api, win, doc, root, storage, sources, contexts,
    advance(ms = 250) { clock += ms; },
    active: () => sources.filter(source => source.active).length,
    control({ cue, disabled = false, ancestorNone = false } = {}) {
      const control = {
        nodeType: 1, disabled,
        getAttribute(name) { return name === 'data-sound' ? cue : null; },
        closest(selector) {
          if (selector === '[data-sound="none"]') return cue === 'none' || ancestorNone ? this : null;
          if (selector === '[data-sound]') return cue ? this : null;
          if (selector === "a[href], button, [role='button']") return this;
          return null;
        },
      };
      return control;
    },
  };
}

delete globalThis.window;
delete globalThis.document;
const server = await importEngine();
assert.equal(server.getSoundEnabled(), false);
await server.setSoundEnabled(true);
server.playSound('click');
server.mountInterfaceAudio()();

let test = await scenario();
const cleanupA = test.api.mountInterfaceAudio();
const cleanupB = test.api.mountInterfaceAudio();
assert.equal(test.api.getSoundEnabled(), false);
assert.equal(test.contexts.length, 0, 'No audio context is allocated for a silent visitor');
assert.equal(test.doc.count('click'), 1, 'Concurrent controls share delegated listeners');
test.doc.emit('click', { target: test.control() });
assert.equal(test.sources.length, 0);
let notifications = 0;
const unsubscribe = test.api.subscribeSound(() => notifications++);
await test.api.setSoundEnabled(true);
assert.equal(test.contexts.length, 1);
assert.equal(test.sources.length, 1);
assert.equal(test.storage.get('candice-sound'), 'on');
assert.equal(notifications, 1);
test.api.playSound('swipe', { direction: 1 });
test.api.playSound('swipe', { direction: -1 });
assert.equal(test.sources.length, 2, 'Directions share one swipe limiter');
test.advance(220);
test.api.playSound('swipe', { direction: -1, intensity: 1 });
assert.equal(test.sources.length, 3);
for (let i = 0; i < 8; i++) test.api.playSound('open');
assert.equal(test.active(), 4, 'Rapid interaction cannot accumulate unlimited voices');
assert.ok(test.sources.slice(0, -4).every(source => source.stopped && source.disconnected));
test.sources.at(-1).finish();
assert.equal(test.active(), 3);
assert.equal(test.sources.at(-1).disconnected, true, 'Completed voices release their audio graph');
const mute = test.api.setSoundEnabled(false);
assert.equal(test.active(), 0, 'Mute is synchronous');
const mutedCount = test.sources.length;
await mute;
test.api.playSound('click');
test.doc.emit('click', { target: test.control() });
assert.equal(test.sources.length, mutedCount, 'Silent entry and mute never emit a closing click');
assert.equal(test.storage.get('candice-sound'), 'off');
unsubscribe();
cleanupA();
assert.equal(test.doc.count('click'), 1);
cleanupA();
cleanupB();
assert.equal(test.doc.count('click'), 0);
assert.equal(test.contexts[0].closed, true);

test = await scenario({ saved: 'on', safari: true });
let cleanup = test.api.mountInterfaceAudio();
assert.equal(test.api.getSoundEnabled(), true);
assert.equal(test.contexts.length, 0, 'Remembered sound never unlocks itself');
test.doc.emit('pointerdown', { isTrusted: false });
assert.equal(test.contexts.length, 0);
test.doc.emit('pointerdown');
await flush();
assert.equal(test.contexts.length, 1, 'Safari fallback unlocks on a fresh gesture');
assert.equal(test.sources.length, 0, 'Unlocking alone is silent');
test.doc.emit('click', { target: test.control({ ancestorNone: true }) });
test.doc.emit('click', { target: test.control({ disabled: true }) });
test.doc.emit('click', { target: test.control(), isTrusted: false });
assert.equal(test.sources.length, 0);
test.doc.emit('click', { target: test.control({ cue: 'open' }) });
assert.equal(test.sources.length, 1);

const beforeScroll = test.sources.length;
test.root.scrollTop = 100;
test.doc.emit('scroll');
assert.equal(test.sources.length, beforeScroll, 'Programmatic scroll without user intent is silent');
test.doc.emit('wheel', { target: test.root });
test.doc.emit('scroll');
assert.equal(test.sources.length, beforeScroll, 'A stationary scroll position makes no sound');
test.root.scrollTop = 130;
test.doc.emit('scroll');
assert.equal(test.sources.length, beforeScroll + 1);
test.advance();
test.doc.emit('wheel', { target: test.root });
test.doc.emit('click', { target: test.control({ cue: 'none' }) });
test.root.scrollTop = 800;
test.doc.emit('scroll');
assert.equal(test.sources.length, beforeScroll + 1, 'Anchor clicks clear preceding scroll intent');
test.advance();
const dialog = { nodeType: 1, parentElement: test.root, scrollTop: 0, scrollLeft: 0, overflowY: 'auto', scrollHeight: 1000, clientHeight: 300 };
test.doc.emit('touchmove', { target: dialog });
dialog.scrollTop = 50;
test.doc.emit('scroll', { target: dialog });
assert.equal(test.sources.length, beforeScroll + 2, 'Nested dialog scroll is supported');
test.advance(300);
dialog.scrollTop = 100;
test.doc.emit('scroll', { target: dialog });
assert.equal(test.sources.length, beforeScroll + 2, 'Expired user intent cannot sound unrelated scrolling');
test.doc.visibilityState = 'hidden';
test.doc.emit('visibilitychange');
assert.equal(test.active(), 0);
test.api.playSound('enter');
assert.equal(test.sources.length, beforeScroll + 2);
test.doc.visibilityState = 'visible';
test.api.playSound('enter');
assert.equal(test.sources.length, beforeScroll + 2, 'Returning to the tab does not restart audio');
test.doc.emit('pointerdown');
await flush();
test.api.playSound('enter');
assert.equal(test.active(), 1);
test.win.emit('storage', { key: 'candice-sound', newValue: 'off' });
assert.equal(test.api.getSoundEnabled(), false);
assert.equal(test.active(), 0);
test.win.emit('storage', { key: 'candice-sound', newValue: 'on' });
test.api.playSound('click');
assert.equal(test.active(), 0, 'A cross-tab enable still needs a gesture');
test.win.emit('pagehide');
assert.equal(test.contexts[0].closed, true);
cleanup();

test = await scenario({ saved: 'on', deferred: true, safari: true });
cleanup = test.api.mountInterfaceAudio();
test.doc.emit('pointerdown', { pointerType: 'touch' });
test.doc.emit('touchstart');
assert.equal(test.contexts.length, 0, 'Touch audio waits for the end of a touch gesture');
test.doc.emit('pointerup', { pointerType: 'touch' });
assert.equal(test.contexts[0].pending.length, 1);
test.doc.emit('touchend');
assert.equal(test.contexts[0].pending.length, 2, 'A valid end gesture can retry an unresolved resume');
test.doc.emit('click', { target: test.control({ cue: 'open' }) });
assert.equal(test.contexts[0].pending.length, 3, 'Trusted click provides an additional activation fallback');
test.contexts[0].pending[2].resolve();
await flush();
assert.equal(test.sources.length, 1, 'The first menu click sounds once after unlocking');
test.contexts[0].pending[0].reject(new Error('Earlier inactive gesture'));
test.contexts[0].pending[1].resolve();
await flush();
assert.equal(test.api.getSoundEnabled(), true, 'Older activation attempts cannot override a successful retry');
assert.equal(test.sources.length, 1, 'Late resume completion cannot replay the click');
cleanup();

test = await scenario({ saved: 'on', deferred: true });
cleanup = test.api.mountInterfaceAudio();
test.doc.emit('pointerdown', { pointerType: 'mouse' });
test.doc.emit('pointerup', { pointerType: 'touch' });
test.contexts[0].pending[1].resolve();
await flush();
test.doc.emit('click', { target: test.control({ cue: 'open' }) });
assert.equal(test.sources.length, 1, 'A pending start never blocks the next valid end gesture');
test.contexts[0].pending[0].resolve();
await flush();
assert.equal(test.sources.length, 1);
cleanup();

test = await scenario({ saved: 'on', deferred: true });
cleanup = test.api.mountInterfaceAudio();
test.doc.emit('click', { target: test.control({ cue: 'none' }) });
await test.api.setSoundEnabled(false);
test.contexts[0].pending[0].resolve();
await flush();
assert.equal(test.sources.length, 0, 'A silent entry click remains silent after delayed unlocking');
cleanup();

test = await scenario({ saved: 'on', deferred: true });
cleanup = test.api.mountInterfaceAudio();
test.doc.emit('click', { target: test.control({ cue: 'open' }) });
await test.api.setSoundEnabled(false);
test.contexts[0].pending[0].resolve();
await flush();
assert.equal(test.sources.length, 0, 'Mute cancels a queued first-click cue');
cleanup();

test = await scenario({ deferred: true });
let enabling = test.api.setSoundEnabled(true, 'enter');
const candidate = test.contexts[0];
await test.api.setSoundEnabled(false);
candidate.pending[0].resolve();
await enabling;
test.api.playSound('enter');
assert.equal(test.sources.length, 0, 'A delayed unlock cannot undo mute');
assert.equal(test.api.getSoundEnabled(), false);

test = await scenario({ deferred: true });
enabling = test.api.setSoundEnabled(true, 'enter');
await test.api.setSoundEnabled(false);
const reenabling = test.api.setSoundEnabled(true, 'open');
test.contexts[0].pending[1].resolve();
await reenabling;
test.contexts[0].pending[0].reject(new Error('Stale attempt'));
await enabling;
assert.equal(test.api.getSoundEnabled(), true, 'A stale rejection cannot undo a newer valid enable');
assert.equal(test.sources.length, 1);
await test.api.setSoundEnabled(false);

test = await scenario({ deferred: true });
enabling = test.api.setSoundEnabled(true);
test.contexts[0].pending[0].reject(new Error('Audio unavailable'));
await enabling;
assert.equal(test.api.getSoundEnabled(), false);
assert.equal(test.sources.length, 0);
test = await scenario({ missing: true });
await test.api.setSoundEnabled(true);
assert.equal(test.api.getSoundEnabled(), false);
test = await scenario({ blocked: true });
await test.api.setSoundEnabled(true, 'none');
assert.equal(test.api.getSoundEnabled(), true);
assert.equal(test.sources.length, 0);
await test.api.setSoundEnabled(false);

console.log('PASS: silent defaults/entry, gesture-only unlock, preference sync, delegated controls, scroll intent, rate limiting, voice cleanup, mute races, hidden tabs, SSR, Safari fallback, and unavailable audio/storage.');
