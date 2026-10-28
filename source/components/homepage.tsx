"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ArrowUp, Plus, Volume2, VolumeX, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { IntroOrb, PortfolioExperience, RollingText, useInterfaceAudio, type EntryPhase } from "@/components/portfolio-experience";
import { SpiralGallery, type GalleryMode, type GalleryProject } from "@/components/spiral-gallery";
import { LanguageSwitch } from "@/components/language-switch";
import { useLocale } from "@/lib/i18n";
import { projectData, skillData } from "@/lib/portfolio-content";
import { localizeUrl } from "../../assets/i18n/locale.js";

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return <div className="section-label"><span className="mono">({index})</span><span>{children}</span></div>;
}
function ordinaryClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
function SoundToggle({ soundOn, onToggle, className = "" }: { soundOn: boolean; onToggle: () => void; className?: string }) {
  const { t } = useLocale();
  const label = t(soundOn ? "关闭音效" : "开启音效");
  return <button type="button" className={`sound-toggle ${className}`} data-sound="none" aria-label={label} title={label} aria-pressed={soundOn} onClick={onToggle}>{soundOn ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}</button>;
}

export default function Home() {
  const { locale, t } = useLocale();
  const projects = useMemo(() => projectData.map(project => ({
    ...project,
    subtitle: t(project.subtitle), category: t(project.category), alt: t(project.alt),
    type: t(project.type), description: t(project.description), focus: t(project.focus),
    approach: t(project.approach), outcome: t(project.outcome), tools: t(project.tools),
    summary: t(project.description.split("。")[0] + "。"),
  })), [t]);
  const drawingsHref = `/drawings/?lang=${locale}`;
  const galleryProjects = useMemo<GalleryProject[]>(() => [...projects, {
    id: "drawings", number: "05", title: t("Drawings"), image: "drawings/drawing-55.jpg",
    alt: t("A drawing from Candice Hong’s collection"),
    category: t("DRAWINGS · VISUAL EXPLORATION"),
    description: t("Figures, imagined nature and stories in line."),
    summary: t("Figures, imagined nature and stories in line."),
    href: drawingsHref, actionLabel: t("Explore the drawings collection"),
  }], [projects, t, drawingsHref]);
  const [entryPhase, setEntryPhase] = useState<EntryPhase>("prelude");
  const [surface, setSurface] = useState<"gallery" | "content">("gallery");
  const [galleryMode, setGalleryMode] = useState<GalleryMode>("spiral");
  const { soundOn, setSound } = useInterfaceAudio();
  const [menuOpen, setMenuOpen] = useState(false);
  const navTarget = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = projects.find(project => project.id === activeId) ?? null;
  const [copyMessage, setCopyMessage] = useState("复制邮箱 ↗");
  const leaving = useRef(false);
  const departure = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aboutHref = `/about/?lang=${locale}`;

  const showSection = (id: string) => {
    setSurface("content");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${id}`);
    requestAnimationFrame(() => {
      const section = document.getElementById(id);
      section?.scrollIntoView({ behavior: "instant" });
      const heading = section?.querySelector<HTMLElement>("h1,h2,a.contact-title");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
  };
  const showGallery = (mode: GalleryMode = galleryMode) => {
    setSurface("gallery"); setGalleryMode(mode);
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const showPage = (path: "/about/" | "/drawings/") => {
    if (leaving.current) return;
    leaving.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.location.assign(localizeUrl(path));
      return;
    }
    document.documentElement.classList.add("about-route-leaving");
    departure.current = setTimeout(() => window.location.assign(localizeUrl(path)), 400);
  };
  const showAbout = () => showPage("/about/");
  const openGalleryItem = (id: string) => {
    if (id === "drawings") showPage("/drawings/");
    else setActiveId(id);
  };
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setGalleryMode("list");
    const followHash = () => {
      const id = window.location.hash.slice(1);
      if (id === "about") window.location.replace(localizeUrl("/about/"));
      else if (id === "drawings") window.location.replace(localizeUrl("/drawings/"));
      else if (["work", "skills", "contact"].includes(id)) showSection(id);
      else if (!id || id === "gallery") setSurface("gallery");
    };
    const resetDeparture = () => {
      if (departure.current) clearTimeout(departure.current);
      departure.current = null;
      leaving.current = false;
      document.documentElement.classList.remove("about-route-leaving");
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    window.addEventListener("pageshow", resetDeparture);
    window.addEventListener("pagehide", resetDeparture);
    return () => {
      resetDeparture();
      if (copyTimer.current) clearTimeout(copyTimer.current);
      window.removeEventListener("hashchange", followHash);
      window.removeEventListener("pageshow", resetDeparture);
      window.removeEventListener("pagehide", resetDeparture);
    };
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    document.title = locale === "zh" ? "洪宇欣 · 交互与视觉设计师" : "Candice Hong · Interaction & Visual Designer";
    document.querySelector('meta[name="description"]')?.setAttribute("content", locale === "zh"
      ? "洪宇欣的个人作品集。探索交互设计、视觉叙事、计算机艺术与绘画：Dream Illustrator、Buzzing、Recall、Consistent 及绘画作品集。"
      : "Candice (Yuxin) Hong’s portfolio. Explore interaction design, visual storytelling, computational art and drawings through Dream Illustrator, Buzzing, Recall, Consistent and the Drawings collection.");
  }, [locale]);
  const copyEmail = async () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    try { await navigator.clipboard.writeText("yhong423@connect.hkust-gz.edu.cn"); setCopyMessage("已复制 ✓"); }
    catch { setCopyMessage("请选择邮箱手动复制"); }
    copyTimer.current = setTimeout(() => setCopyMessage("复制邮箱 ↗"), 3000);
  };

  return <div className="portfolio" data-entry={entryPhase} data-surface={surface}>
    <noscript><style>{`.entry-preload,.gallery-screen{display:none!important}.portfolio{height:auto!important;overflow:visible!important}.portfolio-content[hidden],.portfolio>footer[hidden]{display:block!important}.portfolio>header,.portfolio>main,.portfolio>footer{opacity:1!important;visibility:visible!important}.reveal{opacity:1!important;transform:none!important}`}</style></noscript>
    <PortfolioExperience phase={entryPhase} onPhaseChange={setEntryPhase} onSound={setSound} />
    <a className="skip-link" href="#work" onClick={event => { event.preventDefault(); showSection("work"); }}>{t("跳转到作品")}</a>
    <header className="site-header">
      <a className="wordmark" data-sound="click" href="#gallery" onClick={event => { event.preventDefault(); showGallery(); }} aria-label={t("Candice Hong 作品首页")}><IntroOrb /><span className="wordmark-caption">{locale === "zh" ? "洪宇欣" : "candice hong."}</span></a>
      <nav className="gallery-view-switch" aria-label={t("作品展示方式")}><button data-sound="click" aria-pressed={surface === "gallery" && galleryMode === "spiral"} onClick={() => showGallery("spiral")}>{t("spiral")}</button><span className="gallery-view-dot" aria-hidden="true" /><button data-sound="click" aria-pressed={surface === "gallery" && galleryMode === "list"} onClick={() => showGallery("list")}>{t("list")}</button></nav>
      <div className="header-actions">
        {surface === "content" && <SoundToggle className="header-sound" soundOn={soundOn} onToggle={() => void setSound(!soundOn)} />}
        <LanguageSwitch />
        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogTrigger asChild><button className="menu-button" data-sound="open" data-magnetic><RollingText>{t("menu")}</RollingText> <Plus size={17} aria-hidden="true" /></button></DialogTrigger>
          <DialogContent className="navigation-dialog" showCloseButton={false} onCloseAutoFocus={event => { const id = navTarget.current; if (id) { event.preventDefault(); navTarget.current = null; showSection(id); } }}>
            <div className="menu-top"><span className="wordmark">{locale === "zh" ? "洪宇欣" : "candice hong."}</span><div className="dialog-actions"><SoundToggle soundOn={soundOn} onToggle={() => void setSound(!soundOn)} /><LanguageSwitch /><DialogClose asChild><button className="menu-button" data-sound="close" data-magnetic><RollingText>{t("close")}</RollingText> <X size={16} aria-hidden="true" /></button></DialogClose></div></div>
            <DialogTitle className="sr-only">{t("网站导航")}</DialogTitle><DialogDescription className="sr-only">{t("Go to About, selected work, drawings, expertise or contact.")}</DialogDescription>
            <nav className="menu-links" aria-label={t("主导航")}>{[["about", "About"], ["work", "Work"], ["drawings", "Drawings"], ["skills", "Expertise"], ["contact", "Contact"]].map(([id, label], index) => <a href={id === "about" ? aboutHref : id === "drawings" ? drawingsHref : `#${id}`} key={id} data-sound="open" onClick={event => {
              if (!ordinaryClick(event)) return;
              event.preventDefault();
              if (id === "about") showAbout();
              else if (id === "drawings") showPage("/drawings/");
              else { navTarget.current = id; setMenuOpen(false); }
            }}><span className="mono">0{index + 1}</span><span>{t(label)}</span><ArrowUpRight aria-hidden="true" /></a>)}</nav>
            <a className="menu-email" data-sound="open" href="mailto:yhong423@connect.hkust-gz.edu.cn">yhong423@connect.hkust-gz.edu.cn <ArrowUpRight size={18} /></a>
          </DialogContent>
        </Dialog>
      </div>
    </header>
    <main>
      <div hidden={surface !== "gallery"}><SpiralGallery projects={galleryProjects} mode={galleryMode} enabled={surface === "gallery" && (entryPhase === "transition" || entryPhase === "complete")} paused={menuOpen || active !== null} soundOn={soundOn} onSound={() => void setSound(!soundOn)} onOpen={openGalleryItem} onAbout={showAbout} /></div>
      <div className="portfolio-content" hidden={surface !== "content"}>
        <section id="work" className="work-section section-shell">
          <div className="section-heading reveal"><div><SectionLabel index="02">{t("SELECTED WORK / 精选作品")}</SectionLabel><h1 className="work-heading">{t("A few things")}<br />{t("I’ve put my ")}<em>{t("mind")}</em>{t(" into.")}</h1></div><span className="project-count mono">{t("INDEX — 01/04")}</span></div>
          <div className="project-grid">{projects.map(project => <button key={project.id} className={`project-card project-${project.id} reveal`} data-sound="open" onClick={() => setActiveId(project.id)} aria-label={t("查看 {title} 项目详情", { title: project.title })}><div className="project-image"><img src={`/images/${project.image}`} alt={project.alt} loading="lazy" width="1200" height="960" /><span className="image-index mono">({project.number})</span><span className="view-project">{t("View project")} <ArrowUpRight size={18} /></span></div><div className="project-meta"><div><span className="project-category mono">{project.category}</span><h3>{project.title}</h3><p>{project.summary}</p></div><span className="project-arrow"><ArrowUpRight size={25} strokeWidth={1.3} /></span></div></button>)}</div>
          <a className="drawings-collection reveal" href={drawingsHref} data-sound="open" onClick={event => {
            if (!ordinaryClick(event)) return;
            event.preventDefault();
            showPage("/drawings/");
          }}>
            <span className="drawings-collection-image"><img src="/images/drawings/drawing-55.jpg" alt={t("A drawing from Candice Hong’s collection")} loading="lazy" width="1280" height="959" /></span>
            <div className="drawings-collection-copy"><span className="drawings-collection-category mono">{t("DRAWINGS · VISUAL EXPLORATION")}</span><h2>{t("Drawings")}</h2><span className="drawings-collection-description">{t("Figures, imagined nature and stories in line.")}</span><span className="drawings-collection-action">{t("Explore drawings")}<ArrowUpRight size={23} strokeWidth={1.4} aria-hidden="true" /></span></div>
          </a>
        </section>
        <section id="skills" className="skills-section section-shell">
          <div className="section-heading reveal"><div><SectionLabel index="03">{t("EXPERTISE / 技能专长")}</SectionLabel><h2>{t("Different tools.")}<br /><span className="muted-line">{t("One curious mind.")}</span></h2></div><p className="skills-note">{t("从理解问题，到原型与表达。")}<br />{t("让每一种工具，为体验服务。")}</p></div>
          <div className="skill-list">{skillData.map(skill => <div className="skill-row reveal" key={skill.n}><span className="skill-number mono">{skill.n}</span><div><h3>{t(skill.title)}</h3></div><p>{t(skill.items)}</p><Plus className="skill-plus" size={20} strokeWidth={1.2} aria-hidden="true" /></div>)}</div>
        </section>
        <section id="contact" className="contact-section"><div className="contact-inner"><SectionLabel index="04">{t("SAY HELLO / 联系我")}</SectionLabel><a className="contact-title" data-sound="open" href="mailto:yhong423@connect.hkust-gz.edu.cn">{t("Let’s make")}<br />{t("something ")}<em>{t("matter.")}</em><ArrowUpRight className="contact-arrow" strokeWidth={1} aria-hidden="true" /></a><div className="contact-bottom"><p>{t("关于设计、创作，或一个有趣的想法。")}<br />{t("期待和你聊聊。")}</p><div className="contact-details"><a href="mailto:yhong423@connect.hkust-gz.edu.cn" className="email-link" data-sound="open">yhong423@connect.hkust-gz.edu.cn<ArrowUpRight size={20} /></a><div className="contact-actions"><a href="tel:+8613144539696" data-sound="open">+86 131 4453 9696</a><button onClick={copyEmail} aria-live="polite">{t(copyMessage)}</button></div></div></div></div></section>
      </div>
    </main>
    <footer hidden={surface !== "content"}><span>© {new Date().getFullYear()} {locale === "zh" ? "洪宇欣" : "Candice (Yuxin) Hong"}</span><span className="footer-note">{t("MADE WITH CURIOSITY.")}</span><a href="#work" onClick={event => { event.preventDefault(); showSection("work"); }}>{t("Back to top")} <ArrowUp size={14} /></a></footer>
    <Dialog open={active !== null} onOpenChange={open => { if (!open) setActiveId(null); }}><DialogContent className="project-dialog" showCloseButton={false}>{active && <>
      <div className="project-dialog-top"><span className="mono">{locale === "zh" ? "项目" : "PROJECT"} {active.number} / 04</span><div className="dialog-actions"><SoundToggle soundOn={soundOn} onToggle={() => void setSound(!soundOn)} /><LanguageSwitch /><DialogClose asChild><button className="menu-button" data-sound="close">{t("close")} <X size={17} aria-hidden="true" /></button></DialogClose></div></div>
      <div className="case-heading"><span className="project-category mono">{active.category}</span><DialogTitle className="case-title">{active.title}</DialogTitle><DialogDescription className="case-description">{active.description}</DialogDescription><p className="case-type">{active.type}</p></div>
      <img className={`case-cover cover-${active.id}`} src={`/images/${active.image}`} alt={active.alt} />
      <div className="case-content"><div><h3>{t("Focus / 设计议题")}</h3><p>{active.focus}</p></div><div><h3>{t("Process / 研究与探索")}</h3><p>{active.approach}</p></div><div><h3>{t("Outcome / 设计产出")}</h3><p>{active.outcome}</p></div><div><h3>{t("Methods / 方法与工具")}</h3><p>{active.tools}</p></div></div>
      <div className="case-pages"><span className="mono case-page-label">{t("FROM THE PORTFOLIO / 项目过程")}</span>{active.pages.map(page => <img key={page} src={`/images/${active.id}-page-${page}.webp`} alt={locale === "zh" ? `${active.title} 原始作品集项目过程，第 ${page} 页` : `${active.title} original portfolio process, page ${page}`} loading="lazy" width="2024" height="716" />)}</div>
      <DialogClose asChild><button className="case-back" data-sound="close">{t("返回精选作品")} <ArrowUpRight size={18} /></button></DialogClose>
    </>}</DialogContent></Dialog>
  </div>;
}
