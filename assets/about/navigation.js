/* About routing for the existing, exported portfolio. No framework bundle edits. */
(() => {
  "use strict";

  if (window.__candiceAboutNavigation) return;
  window.__candiceAboutNavigation = true;

  const ABOUT_PATH = "/about/";
  const EXIT_DURATION = 400;
  const EXIT_CLASS = "about-route-leaving";
  const MENU_ABOUT = '.menu-links a[href="#about"], .menu-links a[href="/about/"]';
  const FOOTER_TOP = '.portfolio > footer a[href="#about"], .portfolio > footer a[href="#work"]';
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let navigationTimer = 0;
  let leaving = false;

  function resetTransition() {
    window.clearTimeout(navigationTimer);
    navigationTimer = 0;
    leaving = false;
    document.documentElement.classList.remove(EXIT_CLASS);
  }

  function redirectLegacyAbout(event) {
    if (window.location.hash.toLowerCase() !== "#about") return;
    // Replace the obsolete hash entry so Back never loops through /#about.
    if (event) event.stopImmediatePropagation();
    window.location.replace(ABOUT_PATH);
  }

  function navigateToAbout() {
    if (leaving) return;
    leaving = true;
    if (reducedMotion.matches) {
      window.location.assign(ABOUT_PATH);
      return;
    }
    document.documentElement.classList.add(EXIT_CLASS);
    navigationTimer = window.setTimeout(() => {
      window.location.assign(ABOUT_PATH);
    }, EXIT_DURATION);
  }

  function eventElement(event) {
    return event.target instanceof Element ? event.target : null;
  }

  function upgradeMenuLinks(root) {
    if (!(root instanceof Element)) return;
    if (root.matches(MENU_ABOUT)) root.setAttribute("href", ABOUT_PATH);
    root.querySelectorAll(MENU_ABOUT).forEach((link) => {
      link.setAttribute("href", ABOUT_PATH);
    });
  }

  function prepareLink(event) {
    const element = eventElement(event);
    if (!element) return;
    const about = element.closest(MENU_ABOUT);
    if (about) about.setAttribute("href", ABOUT_PATH);
    const footer = element.closest(FOOTER_TOP);
    if (footer) footer.setAttribute("href", "#work");
  }

  function handleActivation(event) {
    const element = eventElement(event);
    if (!element) return;

    // This link means “Back to top”, not “About”. Change it only on interaction,
    // after hydration, and retain the browser's ordinary anchor behavior.
    const footer = element.closest(FOOTER_TOP);
    if (footer) {
      footer.setAttribute("href", "#work");
      event.stopImmediatePropagation();
      return;
    }

    const about = element.closest(MENU_ABOUT);
    const galleryButton = element.closest(".gallery-about");
    if (!about && !galleryButton) return;
    if (about) about.setAttribute("href", ABOUT_PATH);

    // Capture before React's old hash handler can prevent the native action.
    event.stopImmediatePropagation();
    if (about && (
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey ||
      event.altKey || about.hasAttribute("download") ||
      (about.target && about.target !== "_self")
    )) return;

    // A button has no native middle-click behavior; preserve that distinction.
    if (event.type === "auxclick" || event.button !== 0) return;
    event.preventDefault();
    navigateToAbout();
  }

  document.addEventListener("click", handleActivation, true);
  document.addEventListener("auxclick", handleActivation, true);
  document.addEventListener("pointerdown", prepareLink, true);
  document.addEventListener("focusin", prepareLink, true);
  document.addEventListener("contextmenu", prepareLink, true);
  window.addEventListener("hashchange", redirectLegacyAbout, true);
  window.addEventListener("pagehide", resetTransition);
  window.addEventListener("pageshow", () => {
    resetTransition();
    redirectLegacyAbout();
  });

  // Menu dialogs are client-created portals. Observe only new nodes, so the
  // server-rendered React tree remains untouched during initial hydration.
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach(upgradeMenuLinks);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  redirectLegacyAbout();
})();
