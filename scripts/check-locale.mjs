import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../assets/i18n/locale.js', import.meta.url), 'utf8');
let version = 0;
async function scenario({ url = 'https://candicehong.cn/#contact', saved = null, language = 'en-US', blocked = false } = {}) {
  const events = new Map();
  const storage = new Map(saved ? [['candice-language', saved]] : []);
  const win = {
    location: new URL(url),
    localStorage: {
      getItem(key) { if (blocked) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw new Error('Storage blocked'); storage.set(key, value); },
    },
    history: {
      state: { retained: true },
      replaceState(state, _, href) { this.state = state; win.location = new URL(href, win.location); },
    },
    addEventListener(name, callback) { events.set(name, callback); },
  };
  globalThis.window = win;
  globalThis.document = { documentElement: { lang: '', dataset: {} } };
  Object.defineProperty(globalThis, 'navigator', { value: { language }, configurable: true });
  const api = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${version++}`);
  return { api, win, storage, events };
}

let test = await scenario({ language: 'zh-CN' });
assert.equal(test.api.getLocale(), 'zh');
assert.equal(document.documentElement.lang, 'zh-CN');
test = await scenario({ saved: 'zh', language: 'en' });
assert.equal(test.api.getLocale(), 'zh');
test = await scenario({ url: 'https://candicehong.cn/?lang=en#contact', saved: 'zh' });
assert.equal(test.api.getLocale(), 'en');
let notifications = 0;
const unsubscribe = test.api.subscribe(() => notifications++);
test.api.setLocale('zh');
assert.equal(test.api.getLocale(), 'zh');
assert.equal(test.storage.get('candice-language'), 'zh');
assert.equal(test.win.location.search, '?lang=zh');
assert.equal(test.win.location.hash, '#contact');
assert.deepEqual(test.win.history.state, { retained: true });
assert.equal(test.api.localizeUrl('/about/#bio'), '/about/?lang=zh#bio');
assert.equal(test.api.localizeUrl('/?view=list#skills'), '/?view=list&lang=zh#skills');
assert.equal(test.api.localizeUrl('mailto:hi@example.com'), 'mailto:hi@example.com');
assert.equal(test.api.localizeUrl('https://example.com/'), 'https://example.com/');
assert.equal(notifications, 1);
unsubscribe();
test.api.setLocale('en');
assert.equal(notifications, 1);
test.events.get('storage')({ key: 'candice-language', newValue: 'zh' });
assert.equal(test.api.getLocale(), 'zh');
assert.equal(test.win.location.hash, '#contact');
test.win.location = new URL('https://candicehong.cn/?lang=en#work');
test.events.get('popstate')();
assert.equal(test.api.getLocale(), 'en');
test = await scenario({ language: 'zh-TW', blocked: true });
assert.equal(test.api.getLocale(), 'zh');
test.api.setLocale('en');
assert.equal(test.api.getLocale(), 'en');
assert.equal(test.api.localizeUrl('/about/'), '/about/?lang=en');
test = await scenario({ url: 'https://candicehong.cn/?lang=invalid', saved: 'invalid', language: 'fr' });
assert.equal(test.api.getLocale(), 'en');
test.api.setLocale('invalid');
assert.equal(test.api.getLocale(), 'en');
console.log('PASS: language priority, persistence, subscriptions, URL/hash/state preservation, cross-page links, storage sync, history, and blocked storage.');
