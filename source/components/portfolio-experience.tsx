"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Asterisk, ArrowUpRight, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LanguageSwitch } from "@/components/language-switch";
import { useLocale } from "@/lib/i18n";
import { getSoundEnabled, mountInterfaceAudio, setSoundEnabled, subscribeSound } from "../../assets/audio/interface-audio.js";

export type EntryPhase = "prelude" | "intro" | "transition" | "complete";
// The uploaded reference switches from the geometric greeting to its orb at about 1.9 s.
const GREETING_DURATION_MS = 1900;
// The second recording drops the entry cluster, then opens the spiral in about 1.15 s.
const ENTRY_TRANSITION_MS = 1150;

export function RollingText({ children }: { children: string }) {
  return <span className="rolling-text"><span className="sr-only">{children}</span><span aria-hidden="true">{Array.from(children).map((letter, index) => <span className="rolling-letter" key={index} style={{ "--letter": index } as CSSProperties}><span>{letter === " " ? "\u00a0" : letter}<br />{letter === " " ? "\u00a0" : letter}</span></span>)}</span></span>;
}

export function useInterfaceAudio() {
  const soundOn = useSyncExternalStore(subscribeSound, getSoundEnabled, () => false);
  const setSound = useCallback((on: boolean, entry = false) => setSoundEnabled(on, entry ? "enter" : "click"), []);
  useEffect(() => mountInterfaceAudio(), []);
  return { soundOn, setSound };
}

export function IntroOrb() {
  return <div className="intro-orb" aria-hidden="true"><span className="orb-surface"><Asterisk strokeWidth={1.7} /></span></div>;
}

function GreetingPrelude() {
  const { t } = useLocale();
  return <div className="greeting-stage" aria-hidden="true" style={{ "--greeting-duration": `${GREETING_DURATION_MS}ms` } as CSSProperties}>
    <div className="greeting-mark"><div className="greeting-pattern"><span className="greeting-lavender" /><span className="greeting-navy" /><span className="greeting-green" /><span className="greeting-orange" /></div></div>
    <span className="greeting-hey">{t("hey !")}</span>
    <span className="greeting-name">{Array.from(t("I’m Candice")).map((letter, index) => <span key={index} style={{ "--letter": index } as CSSProperties}>{letter === " " ? "\u00a0" : letter}</span>)}</span>
  </div>;
}

function PointerEffects() {
  const { t } = useLocale();
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let targetX = 0, targetY = 0, x = 0, y = 0;
    let card: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;
    const clearCard = () => { card?.style.removeProperty("--tilt-x"); card?.style.removeProperty("--tilt-y"); card = null; };
    const clearMagnet = () => { magnet?.style.removeProperty("translate"); magnet = null; };
    const reset = () => { clearCard(); clearMagnet(); cursor.current?.classList.remove("is-active"); cancelAnimationFrame(frame); frame = 0; };
    const draw = () => {
      x += (targetX - x) * 0.22; y += (targetY - y) * 0.22;
      if (cursor.current) cursor.current.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.2) frame = requestAnimationFrame(draw); else frame = 0;
    };
    const move = (event: PointerEvent) => {
      if (!query.matches || event.pointerType === "touch" || window.innerWidth <= 700) { reset(); return; }
      const target = event.target as Element;
      const next = target.closest<HTMLElement>(".project-card");
      if (next !== card) { clearCard(); card = next; x = event.clientX; y = event.clientY; }
      cursor.current?.classList.toggle("is-active", !!card);
      if (card) {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--tilt-x", `${((event.clientY - bounds.top) / bounds.height - 0.5) * -5}deg`);
        card.style.setProperty("--tilt-y", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 5}deg`);
        targetX = event.clientX; targetY = event.clientY;
        if (!frame) frame = requestAnimationFrame(draw);
      }
      const nextMagnet = target.closest<HTMLElement>("[data-magnetic]");
      if (nextMagnet !== magnet) { clearMagnet(); magnet = nextMagnet; }
      if (magnet) {
        const bounds = magnet.getBoundingClientRect();
        const dx = Math.max(-5, Math.min(5, (event.clientX - bounds.left - bounds.width / 2) * 0.1));
        const dy = Math.max(-5, Math.min(5, (event.clientY - bounds.top - bounds.height / 2) * 0.1));
        magnet.style.translate = `${dx}px ${dy}px`;
      }
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", reset, { passive: true });
    document.addEventListener("pointerleave", reset);
    window.addEventListener("scroll", reset, { passive: true });
    window.addEventListener("blur", reset);
    query.addEventListener("change", reset);
    return () => { reset(); document.removeEventListener("pointermove", move); document.removeEventListener("pointerdown", reset); document.removeEventListener("pointerleave", reset); window.removeEventListener("scroll", reset); window.removeEventListener("blur", reset); query.removeEventListener("change", reset); };
  }, []);
  return <div className="project-cursor" ref={cursor} aria-hidden="true"><span>{t("view")} <ArrowUpRight size={17} /></span></div>;
}

export function PortfolioExperience({ phase, onPhaseChange, onSound }: { phase: EntryPhase; onPhaseChange: (phase: EntryPhase) => void; onSound: (on: boolean, entry?: boolean) => Promise<void> }) {
  const { t } = useLocale();
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setHydrated(true);
    if (window.location.hash || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onPhaseChange("complete");
    } else {
      timer.current = setTimeout(() => onPhaseChange("intro"), GREETING_DURATION_MS);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [onPhaseChange]);
  const finish = () => { if (timer.current) clearTimeout(timer.current); onPhaseChange("complete"); };
  const skip = () => { void onSound(false); finish(); };
  const enter = (withSound: boolean) => {
    if (phase !== "intro") return;
    void onSound(withSound, true);
    onPhaseChange("transition");
    timer.current = setTimeout(finish, ENTRY_TRANSITION_MS);
  };
  return <>
    {!hydrated && <div className="entry-preload" aria-hidden="true" />}
    {hydrated && <Dialog open={phase !== "complete"} onOpenChange={open => { if (!open) skip(); }}>
      {/* Reset the primitive's axis utilities: production CSS may fold translate:none into transform:none. */}
      <DialogContent className="entry-dialog top-0 left-0 translate-x-0 translate-y-0" data-phase={phase} showCloseButton={false}
        onInteractOutside={event => event.preventDefault()}
        onOpenAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => document.querySelector<HTMLElement>(".entry-dialog")?.focus({ preventScroll: true })); }}
        onCloseAutoFocus={event => { event.preventDefault(); if (!window.location.hash) document.querySelector<HTMLElement>(".gallery-title")?.focus({ preventScroll: true }); }}>
        <div className="entry-curtain" aria-hidden="true" />
        <div className="entry-corner entry-name">candice hong.</div>
        <div className="entry-language" data-sound="none"><LanguageSwitch /></div>
        <button className="entry-skip" data-sound="none" onClick={skip}>{t("skip intro")} <ArrowUpRight size={14} /></button>
        <div className="entry-center">
          <div className="entry-artwork">{phase === "prelude" ? <GreetingPrelude /> : <div className="entry-orb-arrival"><IntroOrb /></div>}</div>
          <DialogTitle className="entry-title">{t("interaction & visual designer")}<br />{t("based in guangzhou")}</DialogTitle>
          <DialogDescription className="sr-only">{t("洪宇欣的个人作品集。简短问候动画后可选择有声或静音进入，按 Escape 可跳过开屏。")}</DialogDescription>
          <button id="enter-with-sound" className="entry-button" data-sound="none" data-magnetic disabled={phase !== "intro"} onClick={() => enter(true)}><RollingText>{t("enter with sound")}</RollingText><Volume2 size={14} /></button>
        </div>
        <button className="entry-silent" data-sound="none" disabled={phase !== "intro"} onClick={() => enter(false)}><RollingText>{t("enter without sound")}</RollingText></button>
      </DialogContent>
    </Dialog>}
    {phase === "complete" && <PointerEffects />}
  </>;
}
