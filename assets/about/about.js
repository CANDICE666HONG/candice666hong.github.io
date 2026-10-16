/* The introduction is scrubbed by native scroll position, never by a clock. */
(() => {
  "use strict";
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const paragraph = document.querySelector(".intro-text");
  const intro = document.querySelector(".intro-scroll");
  const stage = document.querySelector(".intro-stage");
  const restart = document.getElementById("intro-start");
  const position = document.getElementById("scroll-position");
  const menu = document.getElementById("site-menu");
  const menuTrigger = document.querySelector(".menu-trigger");
  const controls = document.querySelector(".scroll-controls");

  // Wrap only text nodes. Spaces remain real spaces and inline art stays decorative.
  for (const node of [...paragraph.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const fragment = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) fragment.append(document.createTextNode(part));
      else {
        const word = document.createElement("span");
        word.className = "intro-word";
        word.textContent = part;
        fragment.append(word);
      }
    }
    node.replaceWith(fragment);
  }
  const tokens = [...paragraph.querySelectorAll(".intro-word, .inline-symbol")].map((element, index, all) => ({
    element,
    symbol: element.classList.contains("inline-symbol"),
    // Leave a short grey lead-in and a readable white hold at the end.
    start: 0.035 + index / Math.max(1, all.length - 1) * 0.83,
  }));
  let frame = 0;
  let lastProgress = -1;
  let leaving = false;
  let closeTimer = 0;
  let navigationTimer = 0;

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }
  function scrollProgress(top, travel) {
    return travel > 0 ? clamp(-top / travel) : 1;
  }
  function updateScroll() {
    frame = 0;
    if (document.hidden || menu.open || leaving) return;
    const progress = reducedMotion.matches ? 1 : scrollProgress(
      intro.getBoundingClientRect().top,
      intro.offsetHeight - stage.offsetHeight,
    );
    if (progress === lastProgress) return;
    lastProgress = progress;
    for (const token of tokens) {
      const reveal = reducedMotion.matches ? 1 : clamp((progress - token.start) / 0.075);
      if (token.symbol) {
        // Every pose has an exact scroll coordinate, including while reversing.
        token.element.style.setProperty("--symbol-reveal", reveal.toFixed(4));
        token.element.style.setProperty("--symbol-progress", (reducedMotion.matches ? 1 : clamp((progress - token.start) / (0.96 - token.start))).toFixed(4));
      } else {
        const shade = Math.round(139 + (245 - 139) * reveal);
        token.element.style.color = `rgb(${shade} ${shade} ${shade})`;
      }
    }
    position.textContent = String(Math.round(progress * 100)).padStart(2, "0");
  }
  function requestScrollUpdate() {
    // One render per scroll/resize event batch. No self-scheduling animation loop.
    if (!frame && !document.hidden && !menu.open && !leaving) frame = requestAnimationFrame(updateScroll);
  }
  function measureStage() {
    intro.style.setProperty("--intro-stage-height", `${stage.offsetHeight}px`);
    lastProgress = -1;
    requestScrollUpdate();
  }
  function setMotionPreference() {
    body.classList.toggle("scroll-driven", !reducedMotion.matches);
    measureStage();
  }
  function returnToStart() {
    window.scrollTo({ top: window.scrollY + intro.getBoundingClientRect().top, behavior: "instant" });
    requestScrollUpdate();
  }

  controls.hidden = false;
  menuTrigger.hidden = false;
  restart.addEventListener("click", returnToStart);
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", measureStage, { passive: true });
  // Also handles font-size changes, orientation changes and wrapping on phones.
  if ("ResizeObserver" in window) new ResizeObserver(measureStage).observe(stage);
  document.addEventListener("visibilitychange", requestScrollUpdate);
  reducedMotion.addEventListener("change", setMotionPreference);
  setMotionPreference();

  function closeMenu() {
    if (!menu.open || menu.classList.contains("is-closing")) return;
    if (reducedMotion.matches) menu.close();
    else {
      menu.classList.add("is-closing");
      closeTimer = window.setTimeout(() => menu.close(), 300);
    }
  }
  menuTrigger.addEventListener("click", () => {
    clearTimeout(closeTimer);
    menu.classList.remove("is-closing");
    menu.showModal();
    body.classList.add("menu-open");
    menuTrigger.setAttribute("aria-expanded", "true");
    requestScrollUpdate();
  });
  menu.querySelector(".menu-close").addEventListener("click", closeMenu);
  menu.addEventListener("cancel", event => { event.preventDefault(); closeMenu(); });
  menu.addEventListener("close", () => {
    body.classList.remove("menu-open");
    menu.classList.remove("is-closing");
    menuTrigger.setAttribute("aria-expanded", "false");
    menuTrigger.focus({ preventScroll: true });
    requestScrollUpdate();
  });
  menu.addEventListener("click", event => {
    if (event.target === menu) {
      const box = menu.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeMenu();
    }
  });
  menu.querySelector('[aria-current="page"]').addEventListener("click", event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    closeMenu();
    returnToStart();
  });

  document.addEventListener("click", event => {
    const link = event.target.closest?.("a[data-page-link]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (reducedMotion.matches) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    body.classList.add("page-leaving");
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    navigationTimer = window.setTimeout(() => window.location.assign(link.href), 360);
  });
  // Back/forward cache restores the old DOM, including exit-transition classes.
  function clearPendingWork() {
    clearTimeout(navigationTimer);
    clearTimeout(closeTimer);
    if (frame) cancelAnimationFrame(frame);
    navigationTimer = closeTimer = frame = 0;
  }
  window.addEventListener("pagehide", clearPendingWork);
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    clearPendingWork();
    leaving = false;
    body.classList.remove("page-leaving");
    if (menu.open) menu.close();
    measureStage();
  });
  // Restore the pose after browser-native history/anchor scroll restoration.
  window.addEventListener("pageshow", measureStage);
})();
