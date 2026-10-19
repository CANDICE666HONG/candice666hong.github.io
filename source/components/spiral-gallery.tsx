"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export type GalleryMode = "spiral" | "list";
export type GalleryProject = { id: string; number: string; title: string; image: string; alt: string; category: string; description: string; summary?: string };
const SEGMENTS = 12;
const COPIES = 4;
const TAU = Math.PI * 2;

/** A gently curved image surface, with native buttons for pointer and keyboard access. */
function CurvedCover({ project }: { project: GalleryProject }) {
  return <span className="spiral-cover" aria-hidden="true">{Array.from({ length: SEGMENTS }, (_, index) => {
    const angle = ((index + 0.5) / SEGMENTS - 0.5) * 0.5;
    return <span className="spiral-slice" key={index} style={{
      "--slice-x": Math.sin(angle) * 2,
      "--slice-z": (Math.cos(angle) - 1) * 2,
      "--slice-angle": `${angle}rad`,
      "--slice-index": index,
    } as CSSProperties}><img src={`/images/${project.image}`} alt="" draggable={false} decoding="async" /></span>;
  })}</span>;
}

export function SpiralGallery({ projects, mode, enabled, paused, soundOn, onSound, onOpen, onAbout }: {
  projects: GalleryProject[];
  mode: GalleryMode;
  enabled: boolean;
  paused: boolean;
  soundOn: boolean;
  onSound: () => void;
  onOpen: (id: string) => void;
  onAbout: () => void;
}) {
  const { t } = useLocale();
  const viewport = useRef<HTMLDivElement>(null);
  const axis = useRef<HTMLDivElement>(null);
  const angle = useRef(0.05);
  const wasDragged = useRef(false);
  const [stopped, setStopped] = useState(false);
  const [hovered, setHovered] = useState<GalleryProject | null>(null);

  useEffect(() => {
    const stage = viewport.current;
    const cylinder = axis.current;
    if (!stage || !cylinder || mode !== "spiral") return;
    const cards = Array.from(cylinder.querySelectorAll<HTMLElement>(".spiral-card"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, previous = 0, velocity = 0, width = 0, height = 0;
    let hovering = false, focused = false;
    let drag: { id: number; x: number; y: number; startX: number; startY: number } | null = null;
    const canMove = () => enabled && !paused && !document.hidden;
    const auto = () => canMove() && !stopped && !reduced.matches && !hovering && !focused && !drag;
    const render = () => {
      const mobile = width <= 700;
      const step = TAU / (mobile ? 6 : 8);
      const cycle = cards.length * step;
      const cardWidth = mobile ? Math.min(width * 0.43, 250) : Math.min(width * 0.19, height * 0.43, 440);
      const radius = mobile ? width * 0.3 : cardWidth * 1.35;
      const pitch = height * (mobile ? 0.92 : 0.88);
      stage.style.setProperty("--card-width", `${cardWidth}px`);
      stage.style.setProperty("--scene-perspective", `${Math.max(900, height * 2.25)}px`);
      cards.forEach((card, index) => {
        const theta = ((index * step + angle.current + cycle / 2) % cycle + cycle) % cycle - cycle / 2;
        const x = Math.sin(theta) * radius;
        const y = theta / TAU * pitch;
        const z = Math.cos(theta) * radius;
        card.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${theta.toFixed(5)}rad)`;
        card.style.setProperty("--card-light", `${0.34 + (Math.cos(theta) + 1) * 0.33}`);
        // The two outer turns wrap beyond the visible area, never across the screen.
        card.style.visibility = Math.abs(y) > height * 1.35 ? "hidden" : "visible";
      });
    };
    const tick = (time: number) => {
      frame = 0;
      const dt = previous ? Math.min((time - previous) / 1000, 0.04) : 0;
      previous = time;
      if (!canMove()) return;
      if (auto()) angle.current += dt * 0.34;
      angle.current += velocity * dt;
      velocity *= Math.exp(-dt * 5.5);
      render();
      if (auto() || Math.abs(velocity) > 0.005) frame = requestAnimationFrame(tick);
    };
    const wake = () => { if (!frame && canMove()) { previous = 0; frame = requestAnimationFrame(tick); } };
    const resize = () => { width = stage.clientWidth; height = stage.clientHeight; render(); wake(); };
    const wheel = (event: WheelEvent) => {
      if (!canMove()) return;
      event.preventDefault();
      const delta = (event.deltaY + event.deltaX) * (event.deltaMode === 1 ? 16 : 1);
      velocity = Math.max(-5, Math.min(5, velocity + delta * 0.007));
      wake();
    };
    const down = (event: PointerEvent) => {
      if (!canMove() || event.button !== 0) return;
      wasDragged.current = false;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
      velocity = 0;
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) {
        wasDragged.current = true;
        stage.setPointerCapture(event.pointerId);
        stage.dataset.dragging = "true";
        setHovered(null);
      }
      if (wasDragged.current) {
        const change = (event.clientX - drag.x - (event.clientY - drag.y) * 0.7) * 0.005;
        angle.current += change;
        velocity = Math.max(-3, Math.min(3, change * 20));
        render();
      }
      drag.x = event.clientX; drag.y = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      drag = null; delete stage.dataset.dragging;
      hovering = false;
      wake();
    };
    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch" || drag) return;
      const card = (event.target as Element).closest<HTMLElement>(".spiral-card");
      hovering = !!card;
      setHovered(card ? projects.find(project => project.id === card.dataset.project) ?? null : null);
      if (!hovering) wake();
    };
    const leave = () => { hovering = false; setHovered(null); wake(); };
    const focus = () => { focused = true; };
    const blur = () => { focused = false; wake(); };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake(); };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    stage.addEventListener("wheel", wheel, { passive: false });
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("pointerover", over);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("focusin", focus);
    stage.addEventListener("focusout", blur);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", wake);
    resize();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      stage.removeEventListener("wheel", wheel); stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up); stage.removeEventListener("pointerover", over);
      stage.removeEventListener("pointerleave", leave); stage.removeEventListener("focusin", focus);
      stage.removeEventListener("focusout", blur); document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", wake);
    };
  }, [enabled, mode, paused, stopped, projects]);

  return <section id="gallery" className="gallery-screen" data-mode={mode} aria-label={t("精选作品")}>
    <h1 className="gallery-title sr-only" tabIndex={-1}>{t("Candice Hong — Selected work")}</h1>
    {mode === "spiral" ? <div className="spiral-viewport" ref={viewport}>
      <div className="spiral-arrival"><div className="spiral-axis" ref={axis}>
        {Array.from({ length: projects.length * COPIES }, (_, index) => {
          const project = projects[index % projects.length];
          return <button className={`spiral-card spiral-${project.id}`} key={index} data-project={project.id}
            tabIndex={-1} aria-hidden="true" aria-label={t("查看 {title} 项目详情", { title: project.title })} onClick={() => { if (!wasDragged.current) onOpen(project.id); }}>
            <CurvedCover project={project} />
          </button>;
        })}
      </div></div>
      <div className="gallery-keyboard-projects">{projects.map(project => <button key={project.id} onClick={() => onOpen(project.id)}>{t("查看 {title} 项目详情", { title: project.title })}</button>)}</div>
      <div className="gallery-hover-label" data-visible={!!hovered}>{hovered?.title}<ArrowUpRight size={14} /></div>
    </div> : <div className="gallery-list">{projects.map(project => <button className="gallery-list-item" key={project.id} onClick={() => onOpen(project.id)}>
      <span className="gallery-list-number">{project.number}</span><img src={`/images/${project.image}`} alt={project.alt} />
      <span className="gallery-list-copy"><span className="gallery-list-category">{project.category}</span><span className="gallery-list-name">{project.title}</span><span className="gallery-list-description">{project.summary ?? project.description}</span></span><ArrowUpRight className="gallery-list-arrow" strokeWidth={1.2} />
    </button>)}</div>}
    <div className="gallery-bottom">
      <button className="gallery-about" onClick={onAbout} aria-label={t("About me · Candice Hong")}>
        <span className="gallery-about-mark" aria-hidden="true"><span>C</span><span>H</span></span>
        <span className="gallery-about-label">{t("about me")}</span>
        <ArrowUpRight className="gallery-about-arrow" size={16} aria-hidden="true" />
      </button>
      {mode === "spiral" && <span className="gallery-instruction"><span className="desktop-instruction">{t("scroll or drag")}</span><span className="touch-instruction">{t("swipe to explore")}</span><ArrowDown size={12} /></span>}
      <div className="gallery-controls">{mode === "spiral" && <button className="gallery-pause" onClick={() => setStopped(!stopped)} aria-label={t(stopped ? "继续旋转作品" : "暂停旋转作品")} aria-pressed={stopped}>{stopped ? <Play size={14} /> : <Pause size={14} />}</button>}<button className="gallery-sound" aria-label={t(soundOn ? "关闭音效" : "开启音效")} aria-pressed={soundOn} onClick={onSound}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div>
    </div>
  </section>;
}
