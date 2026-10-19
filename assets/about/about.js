import { getLocale, setLocale, subscribe, localizeUrl, initializeLocale } from "/assets/i18n/locale.js";

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

  const symbols = [...paragraph.querySelectorAll(".inline-symbol")];
  const languageButtons = [...document.querySelectorAll("[data-language]")];
  const localeLinks = [...document.querySelectorAll('a[href^="/"]')].map(link => ({ link, href: link.getAttribute("href") }));
  const copy = {
    zh: {
      title: "关于我 · 洪宇欣",
      description: "认识洪宇欣：在交互、视觉与计算机艺术之间，探索设计、情绪与日常的连接。",
      skip: "跳转到自我介绍", brand: "洪宇欣", brandLabel: "洪宇欣 · 返回作品首页",
      menu: "菜单", close: "关闭", aboutHeading: "关于洪宇欣", languageLabel: "界面语言",
      sectionLabel: "01 / 关于我", location: "中国 · 广州", curiosity: "始终好奇。", perspective: "以人为起点。",
      fullName: "洪宇欣", bioFirst: "以人为起点，让设计连接情绪、技术与日常。",
      bioSecond: "我在交互、视觉与计算机艺术之间，探索体验的更多可能。",
      education: "教育经历", now: "现在", foundation: "起点",
      graduateSchool: "香港科技大学（广州）", graduateDegree: "计算机艺术 · 硕士在读",
      undergraduateSchool: "艾米丽卡尔艺术与设计大学", undergraduateDegree: "交互设计与平面设计 · 本科",
      expertiseLink: "了解我的专长", contactLink: "聊一聊", copyright: "© 洪宇欣", footerNote: "因好奇而创造。",
      workLink: "精选作品", restartLabel: "回到介绍开头", restartTitle: "回到开头", navigation: "主导航",
      navAbout: "关于我", navWork: "作品", navExpertise: "专长", navContact: "联系我",
      intro: ["我是洪宇欣，", "一名在广州的交互与视觉设计师。", "带着好奇心，我在交互、视觉设计与计算机艺术之间探索。", "让日常的片刻，成为有意义的体验。"],
    },
    en: {
      title: "About · Candice Hong",
      description: "Meet Candice (Yuxin) Hong, an interaction and visual designer exploring connections between design, emotion, technology and everyday life.",
      skip: "Skip to introduction", brand: "candice hong.", brandLabel: "Candice Hong · Back to selected work",
      menu: "menu", close: "close", aboutHeading: "About Candice Hong", languageLabel: "Interface language",
      sectionLabel: "01 / A LITTLE ABOUT ME", location: "GUANGZHOU, CHINA", curiosity: "A curious mind.", perspective: "A human perspective.",
      fullName: "Candice (Yuxin) Hong", bioFirst: "Starting with people, I connect emotion, technology and everyday life through design.",
      bioSecond: "Across interaction, visual design and computational art, I explore new possibilities for experience.",
      education: "Education", now: "NOW", foundation: "FOUNDATION",
      graduateSchool: "The Hong Kong University of Science and Technology (Guangzhou)", graduateDegree: "Computational Art · Master’s student",
      undergraduateSchool: "Emily Carr University of Art + Design", undergraduateDegree: "Interaction & Graphic Design · Bachelor’s degree",
      expertiseLink: "Explore my expertise", contactLink: "Let’s talk", copyright: "© Candice (Yuxin) Hong", footerNote: "MADE WITH CURIOSITY.",
      workLink: "selected work", restartLabel: "Back to the start of the introduction", restartTitle: "Back to the start", navigation: "Main navigation",
      navAbout: "About", navWork: "Work", navExpertise: "Expertise", navContact: "Contact",
      intro: ["I’m Candice Hong, ", " an interaction & visual designer based in Guangzhou. ", " With a curious mind, I explore interaction, visual design and computational art. ", " Turning everyday moments into meaningful experiences."],
    },
  };
  let tokens = [];
  let localeApplied = false;

  function rebuildIntroduction(locale) {
    // Move the existing SVG nodes into the translated text; never duplicate IDs or artwork.
    const fragment = document.createDocumentFragment();
    copy[locale].intro.forEach((text, index) => {
      const parts = locale === "zh" ? Array.from(text) : text.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) fragment.append(document.createTextNode(part));
        else {
          const word = document.createElement("span");
          word.className = "intro-word";
          word.textContent = part;
          fragment.append(word);
        }
      }
      if (symbols[index]) fragment.append(symbols[index]);
    });
    paragraph.replaceChildren(fragment);
    paragraph.lang = locale === "zh" ? "zh-CN" : "en";
    tokens = [...paragraph.querySelectorAll(".intro-word, .inline-symbol")].map((element, index, all) => ({
      element,
      symbol: element.classList.contains("inline-symbol"),
      // Leave a short grey lead-in and a readable white hold at the end.
      start: 0.035 + index / Math.max(1, all.length - 1) * 0.83,
    }));
  }

  function applyLocale() {
    const locale = getLocale();
    const text = copy[locale];
    const scrollY = window.scrollY;
    const introTop = scrollY + intro.getBoundingClientRect().top;
    const oldTravel = intro.offsetHeight - stage.offsetHeight;
    const oldHeight = intro.offsetHeight;
    const progress = scrollProgress(introTop - scrollY, oldTravel);
    document.title = text.title;
    document.querySelector('meta[name="description"]').content = text.description;
    document.querySelectorAll("[data-i18n]").forEach(element => {
      element.textContent = text[element.dataset.i18n];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(element => {
      element.setAttribute("aria-label", text[element.dataset.i18nAria]);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(element => {
      element.title = text[element.dataset.i18nTitle];
    });
    languageButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.language === locale)));
    localeLinks.forEach(({ link, href }) => { link.href = localizeUrl(href); });
    rebuildIntroduction(locale);
    measureStage();
    // Translation may change line wrapping. Preserve the same point on the scroll timeline.
    if (localeApplied && !reducedMotion.matches) {
      const newTravel = intro.offsetHeight - stage.offsetHeight;
      if (scrollY >= introTop && scrollY <= introTop + oldTravel) {
        window.scrollTo({ top: introTop + progress * newTravel, behavior: "instant" });
      } else if (scrollY > introTop + oldTravel) {
        window.scrollTo({ top: scrollY + intro.offsetHeight - oldHeight, behavior: "instant" });
      }
    }
    localeApplied = true;
    // Update even while the modal is open, so its backdrop never reveals stale text poses.
    updateScroll(true);
  }
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
  function updateScroll(force = false) {
    if (force && frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!force && (document.hidden || menu.open || leaving)) return;
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
    if (!frame && !document.hidden && !menu.open && !leaving) frame = requestAnimationFrame(() => updateScroll());
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

  initializeLocale();
  applyLocale();
  subscribe(applyLocale);
  languageButtons.forEach(button => button.addEventListener("click", () => setLocale(button.dataset.language)));
  document.querySelectorAll(".language-switch").forEach(control => { control.hidden = false; });

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
    applyLocale();
  });
  // Restore the pose after browser-native history/anchor scroll restoration.
  window.addEventListener("pageshow", measureStage);
})();
