/* Standalone, buildless About page. Motion uses real text and CSS geometry. */
(() => {
  "use strict";
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const paragraph = document.querySelector(".intro-text");
  const stage = document.querySelector(".intro-stage");
  const toggle = document.getElementById("motion-toggle");
  const replay = document.getElementById("replay");
  const menu = document.getElementById("site-menu");
  const menuTrigger = document.querySelector(".menu-trigger");
  const controls = document.querySelector(".motion-controls");

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
  const tokens = [...paragraph.querySelectorAll(".intro-word, .inline-symbol")];
  // Reference cadence: grey copy first, then a phrase every ~0.4–0.7 s.
  const FIRST_WORD_MS = 800;
  const WORD_STEP_MS = 145;
  let elapsed = 0;
  let previousTime = 0;
  let frame = 0;
  let nextToken = 0;
  let userPaused = false;
  let stageVisible = true;
  let leaving = false;
  let closeTimer = 0;
  let navigationTimer = 0;

  function blocked() {
    return userPaused || document.hidden || !stageVisible || menu.open || reducedMotion.matches || leaving;
  }
  function advance(now) {
    frame = 0;
    if (blocked()) { previousTime = 0; return; }
    if (previousTime) elapsed += Math.min(now - previousTime, 100);
    previousTime = now;
    while (nextToken < tokens.length && elapsed >= FIRST_WORD_MS + nextToken * WORD_STEP_MS) {
      tokens[nextToken++].classList.add("is-lit");
    }
    if (nextToken < tokens.length) frame = requestAnimationFrame(advance);
  }
  function syncMotion() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    body.classList.toggle("animation-paused", blocked());
    toggle.setAttribute("aria-pressed", String(userPaused));
    toggle.setAttribute("aria-label", userPaused ? "继续动画" : "暂停动画");
    toggle.title = userPaused ? "继续动画" : "暂停动画";
    if (reducedMotion.matches) {
      tokens.forEach(token => token.classList.add("is-lit"));
      nextToken = tokens.length;
    } else if (!blocked() && nextToken < tokens.length) frame = requestAnimationFrame(advance);
  }
  function restart() {
    elapsed = 0;
    nextToken = 0;
    userPaused = false;
    tokens.forEach(token => token.classList.remove("is-lit"));
    syncMotion();
  }

  body.classList.add("motion-ready");
  controls.hidden = false;
  menuTrigger.hidden = false;
  toggle.addEventListener("click", () => { userPaused = !userPaused; syncMotion(); });
  replay.addEventListener("click", () => { stage.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth" }); restart(); });
  document.addEventListener("visibilitychange", syncMotion);
  reducedMotion.addEventListener("change", syncMotion);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      stageVisible = entries[0].isIntersecting;
      syncMotion();
    }, { threshold: 0.1 }).observe(stage);
    const reveals = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        reveals.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(element => reveals.observe(element));
  } else document.querySelectorAll(".reveal").forEach(element => element.classList.add("is-visible"));

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
    syncMotion();
  });
  menu.querySelector(".menu-close").addEventListener("click", closeMenu);
  menu.addEventListener("cancel", event => { event.preventDefault(); closeMenu(); });
  menu.addEventListener("close", () => {
    body.classList.remove("menu-open");
    menu.classList.remove("is-closing");
    menuTrigger.setAttribute("aria-expanded", "false");
    menuTrigger.focus({ preventScroll: true });
    syncMotion();
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
    stage.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth" });
  });

  document.addEventListener("click", event => {
    const link = event.target.closest?.("a[data-page-link]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (reducedMotion.matches) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    body.classList.add("page-leaving");
    syncMotion();
    navigationTimer = window.setTimeout(() => window.location.assign(link.href), 360);
  });
  // Back/forward cache restores the old DOM, including exit-transition classes.
  function clearPendingWork() {
    clearTimeout(navigationTimer);
    clearTimeout(closeTimer);
    if (frame) cancelAnimationFrame(frame);
    navigationTimer = closeTimer = frame = previousTime = 0;
  }
  window.addEventListener("pagehide", clearPendingWork);
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    clearPendingWork();
    leaving = false;
    body.classList.remove("page-leaving");
    if (menu.open) menu.close();
    syncMotion();
  });
  syncMotion();
})();
