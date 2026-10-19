/** Shared language preference for the React homepage and standalone About page. */
const STORAGE_KEY = "candice-language";
const listeners = new Set();
let initialized = false;
/** @type {'en' | 'zh'} */
let current = "en";

function valid(value) { return value === "en" || value === "zh"; }
function preferredLocale() {
  const explicit = new URL(window.location.href).searchParams.get("lang");
  if (valid(explicit)) return explicit;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (valid(saved)) return saved;
  } catch { /* Private browsing may disallow persistent storage. */ }
  return /^zh\b/i.test(navigator.language || "") ? "zh" : "en";
}
function applyDocumentLocale() {
  document.documentElement.lang = current === "zh" ? "zh-CN" : "en";
  document.documentElement.dataset.language = current;
}
function notify() {
  applyDocumentLocale();
  listeners.forEach(listener => listener());
}
export function initializeLocale() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  current = preferredLocale();
  applyDocumentLocale();
  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY || !valid(event.newValue) || event.newValue === current) return;
    current = event.newValue;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", current);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    notify();
  });
  window.addEventListener("popstate", () => {
    const next = preferredLocale();
    if (next !== current) { current = next; notify(); }
  });
}
/** @returns {'en' | 'zh'} */
export function getLocale() {
  initializeLocale();
  return current;
}
/** @param {'en' | 'zh'} next */
export function setLocale(next) {
  if (!valid(next) || typeof window === "undefined") return;
  initializeLocale();
  current = next;
  try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* In-memory preference still works. */ }
  const url = new URL(window.location.href);
  url.searchParams.set("lang", next);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  notify();
}
/** @param {() => void} listener */
export function subscribe(listener) {
  initializeLocale();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
/** Carry language in links as well as storage, including private browsing. */
export function localizeUrl(input) {
  if (typeof window === "undefined") return input;
  const url = new URL(input, window.location.href);
  if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return input;
  url.searchParams.set("lang", getLocale());
  return url.pathname + url.search + url.hash;
}
