import { getLocale, setLocale, subscribe, localizeUrl, initializeLocale } from "/assets/i18n/locale.js?v=20261019-default-en";
import { getSoundEnabled, setSoundEnabled, subscribeSound, playSound, mountInterfaceAudio } from "/assets/audio/interface-audio.js?v=20261019-sound";

const copy = {
  en: {
    title: "Drawings · Candice Hong",
    description: "Selected drawings by Candice Hong. Figures, imagined nature and stories in line.",
    skip: "Skip to drawings", brand: "candice hong.", brandLabel: "Candice Hong · Home", language: "Interface language",
    menu: "menu", close: "Close", eyebrow: "SELECTED DRAWINGS", heading: "Drawings.",
    subtitle: "Figures, imagined nature and stories in line.", filtersLabel: "Filter drawings", all: "All",
    figures: "Figures & Symbols", nature: "Imagined Nature", galleryLabel: "Selected drawings", back: "Back to work",
    copyright: "© Candice (Yuxin) Hong", navigation: "Main navigation", about: "About", work: "Work",
    drawings: "Drawings", expertise: "Expertise", contact: "Contact", imageArea: "Artwork image; scroll to explore when zoomed in",
    previous: "Previous", next: "Next", original: "Open original", download: "Download", zoomIn: "Zoom in", zoomOut: "Fit to screen",
    originalSize: "View artwork at its original resolution", fitSize: "Fit the complete artwork to the screen",
    soundOn: "Turn sound on", soundOff: "Turn sound off", drawing: "Drawing", pair: "Two drawings",
    view: "View", originalLabel: "Open original image", downloadLabel: "Download original image", count: "drawings shown",
  },
  zh: {
    title: "绘画 · 洪宇欣", description: "洪宇欣的绘画作品：线条中的人物、想象中的自然与故事。",
    skip: "跳转到绘画作品", brand: "洪宇欣", brandLabel: "洪宇欣 · 首页", language: "界面语言",
    menu: "菜单", close: "关闭", eyebrow: "绘画选集", heading: "绘画。", subtitle: "线条中的人物、想象中的自然与故事。",
    filtersLabel: "筛选绘画作品", all: "全部", figures: "人物与符号", nature: "想象中的自然", galleryLabel: "绘画作品选集", back: "返回作品",
    copyright: "© 洪宇欣", navigation: "主导航", about: "关于我", work: "作品", drawings: "绘画", expertise: "专长", contact: "联系我",
    imageArea: "绘画原图；放大后可滚动查看", previous: "上一幅", next: "下一幅", original: "打开原图", download: "下载", zoomIn: "放大", zoomOut: "适应屏幕",
    originalSize: "按原始分辨率查看作品", fitSize: "完整显示作品并适应屏幕", soundOn: "开启音效", soundOff: "关闭音效",
    drawing: "绘画", pair: "两幅作品", view: "查看", originalLabel: "打开作品原图", downloadLabel: "下载作品原图", count: "项作品",
  },
};
const titles = {
  55: { en: "Feathered Forms", zh: "羽叶之形" },
  50: { en: "In Bloom", zh: "掌心花园" },
  54: { en: "Imagined Garden", zh: "异想花园" },
  51: { en: "Entangled", zh: "交织" },
  52: { en: "Winged Forms", zh: "鸟翼与面孔" },
  53: { en: "Between Worlds", zh: "悬置的故事" },
  56: { en: "Suspended Garden", zh: "悬垂植物" },
  57: { en: "Imagined Depths", zh: "海洋幻想" },
};
const descriptions = {
  "55": {
    "en": "A dark face framed by dense feathers, leaves and patterned forms.",
    "zh": "深色面孔被层叠的羽毛、叶片与纹样环绕。"
  },
  "50": {
    "en": "A girl nestled in a hand, surrounded by flowers and branching forms.",
    "zh": "掌心中的女孩与花朵、枝蔓交织。"
  },
  "54": {
    "en": "Fantastical figures among broad leaves and intricate botanical shapes.",
    "zh": "奇幻人物穿行于宽大的叶片与繁密植物形态之间。"
  },
  "51": {
    "en": "A baby above a masked face, intertwined with roots and organic forms.",
    "zh": "婴儿悬于面罩与面孔之上，根系和有机形态交错缠绕。"
  },
  "52": {
    "en": "Faces intertwined with birds and sweeping wings.",
    "zh": "面孔与鸟类交织，舒展的羽翼穿插其间。"
  },
  "53": {
    "en": "Figures suspended at different heights around a long vertical pole.",
    "zh": "人物围绕细长竖杆，在上下不同位置悬置。"
  },
  "56": {
    "en": "Hanging plants intertwined with woven basket forms.",
    "zh": "悬垂植物与编织篮形态交错延伸。"
  },
  "57": {
    "en": "Two ocean-inspired fantasy drawings displayed side by side.",
    "zh": "两幅海洋主题的幻想绘画并置展示。"
  }
};
const cards = [...document.querySelectorAll("[data-artwork]")];
const grid = document.querySelector(".drawing-grid");
const filters = [...document.querySelectorAll("button[data-filter]")];
const languageButtons = [...document.querySelectorAll("[data-language]")];
const siteLinks = [...document.querySelectorAll("a[data-site-link]")].map(link => ({ link, href: link.getAttribute("href") }));
const soundButtons = [...document.querySelectorAll("[data-sound-toggle]")];
const menu = document.getElementById("site-menu");
const menuTrigger = document.querySelector(".menu-trigger");
const viewer = document.getElementById("art-viewer");
const viewerImage = document.getElementById("viewer-image");
const viewerStage = document.querySelector(".viewer-stage");
const viewerTitle = document.getElementById("viewer-title");
const viewerCounter = document.getElementById("viewer-counter");
const previous = document.getElementById("viewer-previous");
const next = document.getElementById("viewer-next");
const zoom = document.getElementById("viewer-zoom");
const original = document.getElementById("viewer-original");
const download = document.getElementById("viewer-download");
let activeFilter = "all";
let activeCard = null;
let viewerOpener = null;
let isZoomed = false;

function visibleCards() {
  return cards.filter(card => !card.hidden);
}
function artworkTitle(card) {
  return titles[card.dataset.artwork][getLocale()];
}
function artworkAlt(card) {
  return `${artworkTitle(card)} — ${descriptions[card.dataset.artwork][getLocale()]}`;
}

function syncSoundControls() {
  const enabled = getSoundEnabled();
  const label = copy[getLocale()][enabled ? "soundOff" : "soundOn"];
  soundButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", label);
    button.title = label;
  });
}
function toggleSound() {
  void setSoundEnabled(!getSoundEnabled());
}
function syncZoomControl() {
  const text = copy[getLocale()];
  zoom.textContent = isZoomed ? text.zoomOut : text.zoomIn;
  zoom.setAttribute("aria-pressed", String(isZoomed));
  zoom.setAttribute("aria-label", isZoomed ? text.fitSize : text.originalSize);
  zoom.title = isZoomed ? text.fitSize : text.originalSize;
}
function setZoom(value) {
  isZoomed = value;
  viewerStage.classList.toggle("is-zoomed", value);
  viewerStage.scrollTop = 0;
  viewerStage.scrollLeft = 0;
  syncZoomControl();
}
function renderViewer(changeImage = true) {
  if (!activeCard) return;
  const text = copy[getLocale()];
  const list = visibleCards();
  const index = list.indexOf(activeCard);
  const title = artworkTitle(activeCard);
  const src = activeCard.querySelector("[data-art-open]").getAttribute("href");
  viewerTitle.textContent = title;
  viewerCounter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
  viewerImage.alt = artworkAlt(activeCard);
  original.href = src;
  original.setAttribute("aria-label", `${text.originalLabel}: ${title}`);
  download.href = src;
  download.download = `Candice-Hong-drawing-${activeCard.dataset.artwork}.jpg`;
  download.setAttribute("aria-label", `${text.downloadLabel}: ${title}`);
  previous.disabled = next.disabled = list.length < 2;
  if (changeImage) {
    setZoom(false);
    viewerImage.width = Number(activeCard.dataset.width);
    viewerImage.height = Number(activeCard.dataset.height);
    viewerImage.style.setProperty("--image-width", `${activeCard.dataset.width}px`);
    viewerImage.src = src;
  }
  syncZoomControl();
}
function updateFilterStatus() {
  const count = visibleCards().length;
  const text = copy[getLocale()];
  document.getElementById("filter-status").textContent = getLocale() === "zh" ? `显示 ${count} ${text.count}` : `${count} ${text.count}`;
}
function applyLocale() {
  const text = copy[getLocale()];
  document.title = text.title;
  document.querySelector('meta[name="description"]').content = text.description;
  document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = text[element.dataset.i18n]; });
  document.querySelectorAll("[data-i18n-aria]").forEach(element => { element.setAttribute("aria-label", text[element.dataset.i18nAria]); });
  languageButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.language === getLocale())));
  siteLinks.forEach(({ link, href }) => { link.href = localizeUrl(href); });
  cards.forEach(card => {
    card.querySelector("[data-art-title]").textContent = artworkTitle(card);
    card.querySelector("[data-art-type]").textContent = card.dataset.artwork === "57" ? text.pair : text.drawing;
    card.querySelector("img").alt = artworkAlt(card);
    card.querySelector("[data-art-open]").setAttribute("aria-label", `${text.view} ${artworkTitle(card)}`);
  });
  syncSoundControls();
  syncZoomControl();
  updateFilterStatus();
  if (activeCard) renderViewer(false);
}
function setFilter(filter) {
  if (!["all", "figures", "nature"].includes(filter)) return;
  activeFilter = filter;
  grid.dataset.filter = filter;
  cards.forEach(card => { card.hidden = filter !== "all" && card.dataset.category !== filter; });
  filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === filter)));
  updateFilterStatus();
}
function updateModalLock() {
  document.body.classList.toggle("modal-open", menu.open || viewer.open);
}
function openMenu() {
  menu.showModal();
  menuTrigger.setAttribute("aria-expanded", "true");
  updateModalLock();
}
function closeMenu() {
  if (menu.open) menu.close();
}
function openArtwork(card, opener) {
  activeCard = card;
  viewerOpener = opener;
  renderViewer();
  viewer.showModal();
  updateModalLock();
  viewer.querySelector(".viewer-close").focus({ preventScroll: true });
}
function closeViewer() {
  if (viewer.open) viewer.close();
}
function stepArtwork(direction) {
  const list = visibleCards();
  if (list.length < 2 || !activeCard) return;
  const index = list.indexOf(activeCard);
  activeCard = list[(index + direction + list.length) % list.length];
  renderViewer();
}
function plainClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

initializeLocale();
mountInterfaceAudio();
subscribeSound(syncSoundControls);
subscribe(applyLocale);
applyLocale();
languageButtons.forEach(button => button.addEventListener("click", () => setLocale(button.dataset.language)));
soundButtons.forEach(button => { button.addEventListener("click", toggleSound); button.hidden = false; });
document.querySelectorAll(".language-control").forEach(control => { control.hidden = false; });
filters.forEach(button => button.addEventListener("click", () => setFilter(button.dataset.filter)));
document.querySelector(".filters").hidden = false;
menuTrigger.hidden = false;
menuTrigger.addEventListener("click", openMenu);
menu.querySelector(".menu-close").addEventListener("click", closeMenu);
menu.querySelector("[data-menu-current]").addEventListener("click", event => {
  if (!plainClick(event)) return;
  event.preventDefault();
  closeMenu();
});
menu.addEventListener("close", () => {
  menuTrigger.setAttribute("aria-expanded", "false");
  updateModalLock();
  menuTrigger.focus({ preventScroll: true });
});
menu.addEventListener("cancel", event => {
  event.preventDefault();
  if (event.isTrusted) playSound("close");
  closeMenu();
});
menu.addEventListener("click", event => {
  if (event.target !== menu) return;
  const bounds = menu.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    if (event.isTrusted) playSound("close");
    closeMenu();
  }
});
cards.forEach(card => {
  const link = card.querySelector("[data-art-open]");
  link.addEventListener("click", event => {
    if (!plainClick(event)) return;
    event.preventDefault();
    openArtwork(card, link);
  });
});
viewer.querySelector(".viewer-close").addEventListener("click", closeViewer);
viewer.addEventListener("close", () => {
  updateModalLock();
  setZoom(false);
  if (viewerOpener?.isConnected && !viewerOpener.closest("[hidden]")) viewerOpener.focus({ preventScroll: true });
});
viewer.addEventListener("cancel", event => {
  event.preventDefault();
  if (event.isTrusted) playSound("close");
  closeViewer();
});
viewer.addEventListener("keydown", event => {
  if (!viewer.open || event.ctrlKey || event.metaKey || event.altKey) return;
  // In the zoomed image area, arrow keys belong to native image scrolling.
  if (isZoomed && viewerStage.contains(event.target)) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    if (event.isTrusted) playSound("click");
    stepArtwork(event.key === "ArrowLeft" ? -1 : 1);
  }
});
previous.addEventListener("click", () => stepArtwork(-1));
next.addEventListener("click", () => stepArtwork(1));
zoom.addEventListener("click", () => setZoom(!isZoomed));
window.addEventListener("pageshow", event => {
  if (!event.persisted) return;
  updateModalLock();
  applyLocale();
});
