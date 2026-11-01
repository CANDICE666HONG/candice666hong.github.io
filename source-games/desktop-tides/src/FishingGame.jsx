import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, ArrowLeft, X } from '@phosphor-icons/react';
import { createEncounter, formatWeight } from './game/encounter.js';
import { createFishingGame } from './game/fishing.js';
import './fishing.css';

const unknownFishImage = `${import.meta.env.BASE_URL}assets/fish.webp`;

export function FishingGame({ night, paused, quiet, onClose, onResult, onToggleNight, onToggleQuiet, children }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const controlRef = useRef(null);
  const seedRef = useRef(Date.now() >>> 0);
  const gameRef = useRef(null);
  if (!gameRef.current) gameRef.current = createFishingGame({ seed: seedRef.current });
  const [view, setView] = useState(() => gameRef.current.snapshot());
  const [encounter, setEncounter] = useState(() => createEncounter(night));
  const [round, setRound] = useState(0);
  const [held, setHeld] = useState(false);
  const pointerId = useRef(null);
  const keyboardHeld = useRef(false);
  const heldRef = useRef(false);
  const notified = useRef(false);
  const current = useRef(null);
  current.current = { paused, quiet, onClose, onResult, onToggleNight, onToggleQuiet, encounter };

  function syncHeld() {
    const next = gameRef.current.status === 'playing' && (pointerId.current !== null || keyboardHeld.current);
    heldRef.current = next;
    setHeld(next);
  }

  function clearInput() {
    const activePointer = pointerId.current;
    pointerId.current = null;
    keyboardHeld.current = false;
    heldRef.current = false;
    setHeld(false);
    const panel = panelRef.current;
    if (activePointer !== null && panel?.hasPointerCapture(activePointer)) panel.releasePointerCapture(activePointer);
  }

  function close() {
    clearInput();
    current.current.onClose?.();
  }

  function retry() {
    clearInput();
    seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
    gameRef.current = createFishingGame({ seed: seedRef.current });
    setEncounter(createEncounter(night));
    notified.current = false;
    setView(gameRef.current.snapshot());
    setRound(value => value + 1);
    panelRef.current?.focus({ preventScroll: true });
  }

  function press(event) {
    event.stopPropagation();
    if (paused || quiet || event.button !== 0 || event.target.closest('button') || gameRef.current.status !== 'playing' || pointerId.current !== null) return;
    event.preventDefault();
    pointerId.current = event.pointerId;
    panelRef.current.setPointerCapture(event.pointerId);
    controlRef.current?.focus({ preventScroll: true });
    syncHeld();
  }

  function release(event) {
    event.stopPropagation();
    if (event.pointerId !== pointerId.current) return;
    const activePointer = pointerId.current;
    pointerId.current = null;
    if (panelRef.current?.hasPointerCapture(activePointer)) panelRef.current.releasePointerCapture(activePointer);
    syncHeld();
  }

  useEffect(() => {
    const image = new Image();
    image.src = encounter.image;
  }, [encounter.image]);

  useLayoutEffect(() => {
    if (paused || quiet) clearInput();
  }, [paused, quiet]);

  useLayoutEffect(() => {
    const target = quiet ? panelRef.current?.querySelector('.restore-button') : panelRef.current;
    target?.focus({ preventScroll: true });
  }, [view.status, quiet]);

  useEffect(() => {
    let frame = 0, previous = 0, disposed = false;
    const animate = now => {
      if (disposed) return;
      if (document.hidden || current.current.paused || current.current.quiet) {
        previous = 0;
        frame = requestAnimationFrame(animate);
        return;
      }
      const dt = previous ? Math.min((now - previous) / 1000, .06) : 0;
      previous = now;
      const game = gameRef.current;
      game.update(dt, heldRef.current);
      const snapshot = game.snapshot();
      setView(snapshot);
      if (snapshot.status !== 'playing') {
        clearInput();
        if (!notified.current) {
          notified.current = true;
          current.current.onResult?.(snapshot.status, snapshot, current.current.encounter);
        }
        return;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { disposed = true; cancelAnimationFrame(frame); };
  }, [round]);

  useEffect(() => {
    const keyDown = event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      // This modal owns game keys; they must not pause or edit the bay underneath.
      event.stopPropagation();
      const key = event.key.toLowerCase();
      if (key === 'n' || key === 'h') {
        event.preventDefault();
        if (!event.repeat) {
          if (key === 'n') current.current.onToggleNight?.();
          else current.current.onToggleQuiet?.();
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (event.repeat) return;
        if (current.current.quiet) current.current.onToggleQuiet?.();
        else close();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = [...panelRef.current.querySelectorAll('button:not([disabled]), [tabindex="0"]')]
          .filter(node => node.tabIndex >= 0 && !node.closest('[inert], [hidden]') && node.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
        return;
      }
      if (event.code === 'Space' && !event.target.closest?.('button')) {
        event.preventDefault();
        if (!current.current.paused && !current.current.quiet && gameRef.current.status === 'playing') { keyboardHeld.current = true; syncHeld(); }
      }
    };
    const keyUp = event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.stopPropagation();
      if (event.code === 'Space' && keyboardHeld.current) {
        event.preventDefault(); keyboardHeld.current = false; syncHeld();
      }
    };
    const visibility = () => { if (document.hidden) clearInput(); };
    const loseFocus = () => clearInput();
    document.addEventListener('keydown', keyDown, true);
    document.addEventListener('keyup', keyUp, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', loseFocus);
    return () => {
      document.removeEventListener('keydown', keyDown, true);
      document.removeEventListener('keyup', keyUp, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', loseFocus);
      const activePointer = pointerId.current;
      pointerId.current = null; keyboardHeld.current = false; heldRef.current = false;
      if (activePointer !== null && panelRef.current?.hasPointerCapture(activePointer)) panelRef.current.releasePointerCapture(activePointer);
    };
  }, []);

  const playing = view.status === 'playing';
  const caught = view.status === 'caught';
  const progress = Math.max(0, Math.min(100, Math.round(view.progress * 100)));

  return (
    <section ref={panelRef} className="fishing-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
      onPointerDown={press} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
      onPointerMove={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onContextMenu={event => event.preventDefault()}>
      {children}
      <div className={`fishing-panel ${playing ? 'is-playing' : caught ? 'is-caught' : 'is-escaped'} ${held ? 'is-held' : ''}`} hidden={quiet}
        data-testid="fishing-game" data-status={view.status} data-held={held ? 'true' : 'false'}
        data-fish-y={view.fishY.toFixed(4)} data-bar-y={view.barY.toFixed(4)} data-progress={view.progress.toFixed(4)} data-covered={view.covered ? 'true' : 'false'}>
        <header className="fishing-heading">
          <h2 id={titleId}>{playing ? '轻钓' : caught ? '钓到了' : '鱼溜走了'}</h2>
          <button className="fishing-close" aria-label="收竿返回海湾" title="收竿 · Esc" onClick={close}><X size={21} weight="light" /></button>
        </header>

        {playing ? <>
          <div ref={controlRef} className="fishing-control" tabIndex={paused ? -1 : 0} role="group" aria-label="钓鱼控制区，按住鼠标左键或空格让绿色条上升，松开下降" aria-keyshortcuts="Space">
            <div className={`fishing-track ${view.covered ? 'is-covered' : ''}`} aria-hidden="true">
              <div className="fishing-catch-zone" style={{ top: `${view.barY * 100}%`, height: `${view.barHeight * 100}%` }} />
              <img className="fishing-target-fish is-unknown" src={unknownFishImage} alt="" draggable="false"
                style={{ top: `${view.fishY * 100}%`, height: `${view.fishHeight * 100}%` }} />
            </div>
            <div className="fishing-progress" role="progressbar" aria-label="钓鱼进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div className="fishing-progress-fill" style={{ height: `${view.progress * 100}%` }} />
            </div>
          </div>
          {view.covered && <p className="fishing-feedback">保持住</p>}
        </> : <div className="fishing-result">
          <div className="fishing-result-picture">
            <img className={caught ? '' : 'is-unknown'} src={caught ? encounter.image : unknownFishImage} alt={caught ? encounter.name : ''} draggable="false" />
          </div>
          {caught && <div className="fishing-catch-details"><h3>{encounter.name}</h3><p>{formatWeight(encounter.grams)}</p></div>}
          <div className="fishing-result-actions">
            <button className="fishing-retry" onClick={retry}><ArrowCounterClockwise size={19} weight="regular" />再钓一次</button>
            <button className="fishing-return" onClick={close}><ArrowLeft size={18} weight="light" />返回海湾</button>
          </div>
        </div>}
      </div>
    </section>
  );
}
