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
      bioPractice: "我的实践涵盖游戏社区与积分奖励产品的体验设计，也延伸到学生组织运营与活动执行。",
      languageFact: "语言",
      languageValue: "中文 · 英文",
      graduationFact: "预计毕业",
      present: "至今",
      undergraduateGrade: "GPA 3.81 / 4.0 · 交互设计与平面设计双专业",
      experienceLabel: "02 / 实习经历",
      experienceHeading: "让设计走进真实体验。",
      leihuoRole: "UX/UI 体验设计",
      leihuoCompany: "杭州雷火 UX 用户体验中心",
      leihuoContext: "逆水寒手游专属圈子 · 游戏社区体验",
      leihuoPoint1: "输出社区交互原型、高保真界面与动效资源，参与可复用 UI 组件库建设与界面规范整理。",
      leihuoPoint2: "收集近千条玩家反馈，梳理 12 项操作痛点、提出 8 套体验优化方案，并配合主设计师完成 3 轮版本迭代。",
      leihuoPoint3: "独立完成活动横幅、移动活动页面与弹窗素材共 47 套，保障运营活动如期上线。",
      leihuoMetric1: "操作痛点",
      leihuoMetric2: "优化方案",
      leihuoMetric3: "套运营视觉素材",
      ezsaveRole: "UI/UX 视觉设计",
      ezsaveCompany: "EZSave Inc.",
      ezsaveContext: "客户积分奖励可视化 · 城市探索地图",
      ezsavePoint1: "梳理跨门店消费路径与行为数据，以城市探索地图和积分、成长进度可视化优化奖励体验；用户活跃度提升 37%，流失率较旧版下降 22%。",
      ezsavePoint2: "使用 Lottie 优化页面动效，页面加载速度提升 18%；通过 A/B 测试与行为数据分析，迭代 3 版设计方案。",
      ezsavePoint3: "运用游戏化视觉语言呈现抽象数据，并与前端工程师建立设计标注和每周验收机制，使设计还原度达到 95%。",
      ezsaveMetric1: "用户活跃度",
      ezsaveMetric2: "用户流失率",
      ezsaveMetric3: "页面加载速度",
      communityLabel: "03 / 社团与组织",
      communityHeading: "在协作中，把想法落地。",
      gsaaRole: "校友工作部副部长",
      gsaaCompany: "香港科技大学研究生与校友联会（GSAA）",
      gsaaContext: "广深港三地新生见面会 · 教师节周边",
      gsaaPoint1: "参与三地新生见面会执行：在深圳负责校长致辞视频剪辑、会场搭建、礼包与赞助物料对接；在广州、香港完成签到引导、接待及现场流程支持。",
      gsaaPoint2: "主导教师节活动周边视觉设计，负责物料选型、筹备与整理，支撑活动落地执行。",
      cssaCompany: "ECU 中国学生学者联谊会（CSSA）",
      cssaDeputyRole: "副部长",
      cssaDeputyContext: "全年运营 · 新生支持 · 跨校协作",
      cssaDeputyPoint1: "协助主席统筹全年运营，分管活动与宣传，制定学期活动规划与预算，年度运营经费约 1,500 加元；通过迎新包、生活与选课指南等支持，帮助上百名中国新生适应温哥华生活。",
      cssaDeputyPoint2: "协调 UBC、SFU、Langara 等跨校资源与春晚节目征集；完善交接文档、活动清单和赞助模板，使换届后的活动断档期缩短 50%。",
      cssaEventsRole: "活动部长",
      cssaEventsContext: "活动策划与执行 · 赞助拓展 · 流程建设",
      cssaEventsPoint1: "策划中秋活动、校园寻宝、画材交换等活动，并参与跨校春晚，累计参加 300+ 人次；负责场地、采购、志愿者排班与现场执行。",
      cssaEventsPoint2: "争取价值 600+ 加元的实物赞助与折扣，建立 ECU CSSA 首份活动策划模板与场地预约流程，供后续团队沿用。",
      cssaPublicityRole: "宣传部长",
      cssaPublicityContext: "视觉传播 · 新生社群",
      cssaPublicityPoint1: "负责微信公众号、Instagram 及校内海报等宣传渠道，面向约 400 名华人学生；设计 20+ 活动视觉，统一品牌色彩与排版。",
      cssaPublicityPoint2: "通过二维码海报与 Linktree 搭建新生社群入口，单学期吸引 90+ 名新生加入。",
      volunteerHeading: "校园志愿服务",
      volunteerCopy: "协助红鸟新生活动，负责签到、伴手礼分发与流程讲解；参与红鸟游园会志愿工作，配合老师推进现场环节与秩序维护。",
      title: "关于我 · 洪宇欣",
      description: "认识洪宇欣：交互与视觉设计师，香港科技大学（广州）计算机艺术硕士在读。了解她的教育、UX/UI 实习与学生组织经历。",
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
      bioPractice: "My practice spans experience design for game communities and rewards products, alongside student organization operations and event delivery.",
      languageFact: "Languages",
      languageValue: "Chinese · English",
      graduationFact: "Expected graduation",
      present: "Present",
      undergraduateGrade: "GPA 3.81 / 4.0 · Double major in Interaction and Graphic Design",
      experienceLabel: "02 / INTERNSHIPS",
      experienceHeading: "Design in practice.",
      leihuoRole: "UX/UI Experience Design",
      leihuoCompany: "Hangzhou Leihuo UX User Experience Center",
      leihuoContext: "Nishuihan Mobile community · Game community experience",
      leihuoPoint1: "Created interaction prototypes, high-fidelity community interfaces and motion assets; contributed to a reusable UI component library and interface standards.",
      leihuoPoint2: "Collected nearly 1,000 pieces of player feedback, identified 12 usability issues and proposed 8 experience improvements, supporting the lead designer through 3 iterations.",
      leihuoPoint3: "Independently produced 47 sets of campaign assets across banners, H5 pages and pop-ups, supporting on-time campaign launches.",
      leihuoMetric1: "Usability issues",
      leihuoMetric2: "Improvement proposals",
      leihuoMetric3: "Campaign asset sets",
      ezsaveRole: "UI/UX Visual Design",
      ezsaveCompany: "EZSave Inc.",
      ezsaveContext: "Customer rewards visualization · City exploration map",
      ezsavePoint1: "Mapped cross-store shopping journeys and behavior data, using a city exploration map and visual feedback for points and progression to improve the rewards experience. User activity increased by 37%, and churn fell by 22% compared with the previous version.",
      ezsavePoint2: "Optimized page animations with Lottie, improving page loading speed by 18%. Iterated through 3 design versions using A/B testing and behavioral data.",
      ezsavePoint3: "Used gamified visual language to communicate abstract data, and established annotated handoffs and weekly reviews with frontend engineers, achieving 95% design fidelity.",
      ezsaveMetric1: "User activity",
      ezsaveMetric2: "User churn",
      ezsaveMetric3: "Page loading speed",
      communityLabel: "03 / COMMUNITY & ORGANIZATIONS",
      communityHeading: "Making things happen together.",
      gsaaRole: "Deputy Head, Alumni Affairs",
      gsaaCompany: "HKUST Graduate Students and Alumni Association (GSAA)",
      gsaaContext: "New-student meetups in Guangzhou, Shenzhen and Hong Kong · Teachers’ Day merchandise",
      gsaaPoint1: "Supported new-student meetups across three cities: edited the president’s welcome video, coordinated venue setup, welcome gifts and sponsor materials in Shenzhen; handled check-in, reception and on-site support in Guangzhou and Hong Kong.",
      gsaaPoint2: "Led the visual design of Teachers’ Day merchandise and managed material selection, preparation and organization to support event delivery.",
      cssaCompany: "ECU Chinese Students and Scholars Association",
      cssaDeputyRole: "Deputy Department Head",
      cssaDeputyContext: "Year-round operations · New-student support · Cross-campus collaboration",
      cssaDeputyPoint1: "Assisted the president with year-round operations, overseeing events and publicity and developing semester plans and budgets, with approximately CAD 1,500 in annual operating funds. Helped over 100 Chinese newcomers settle in Vancouver through welcome packs and guidance on daily life and course registration.",
      cssaDeputyPoint2: "Coordinated resources with UBC, SFU and Langara and supported Spring Festival performance recruitment. Improved handover documents, event checklists and sponsorship templates, reducing gaps in activity after leadership transitions by 50%.",
      cssaEventsRole: "Head of Events",
      cssaEventsContext: "Event planning and delivery · Sponsorship · Operations",
      cssaEventsPoint1: "Planned Mid-Autumn celebrations, campus treasure hunts and art supply swaps, and contributed to an inter-university Spring Festival event, with a combined attendance of 300+ across these events. Managed venues, purchasing, volunteer schedules and on-site delivery.",
      cssaEventsPoint2: "Secured CAD 600+ in in-kind sponsorship and discounts, and created ECU CSSA’s first event planning template and venue-booking procedure for subsequent teams to use.",
      cssaPublicityRole: "Head of Publicity",
      cssaPublicityContext: "Visual communication · New-student community",
      cssaPublicityPoint1: "Managed WeChat, Instagram and campus posters for an audience of approximately 400 Chinese students. Designed 20+ event visuals with consistent brand colors and typography.",
      cssaPublicityPoint2: "Built entry points to new-student communities through QR-code posters and Linktree, bringing in 90+ newcomers in a single semester.",
      volunteerHeading: "Campus volunteering",
      volunteerCopy: "Supported Red Bird new-student activities with check-in, welcome gift distribution and explanations of event procedures. Volunteered at the Red Bird campus fair, helping staff coordinate activities and maintain an orderly event.",
      title: "About · Candice Hong",
      description: "Meet Candice (Yuxin) Hong, an interaction and visual designer pursuing a master’s degree in Computational Art at HKUST (Guangzhou). Explore her education, UX/UI internships and student organization experience.",
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
