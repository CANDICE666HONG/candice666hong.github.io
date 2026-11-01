import { useEffect, useRef, useState } from 'react';
import { Sun, MoonStars, Eye, EyeSlash, Pause, Play, ArrowCounterClockwise, Waves, FishSimple, Shuffle, BookOpen } from '@phosphor-icons/react';
import { createSimulation, WORLD_WIDTH, WORLD_HEIGHT, shorelineX } from './game/simulation.js';
import { createWaterRenderer } from './game/water.js';
import { createSceneRenderer } from './game/scene.js';
import { loadAssets } from './game/assets.js';
import { makeSelection, screenToWorld, randomCreatureType, SUPPORTED_CREATURE_TYPES } from './game/placement.js';
import { FishingGame } from './FishingGame.jsx';
import { CollectionBook } from './CollectionBook.jsx';
import { restoreCollection, recordCatch } from './game/collection.js';

const SAVE_KEY = 'desktop-tides-v1';
const COLLECTION_KEY = 'desktop-tides-collection-v1';
const PLACEMENT_HINT = '左键框选水域，松开随机放入一个生物';
function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
function readCollection() {
  try { return restoreCollection(JSON.parse(localStorage.getItem(COLLECTION_KEY) || 'null')); }
  catch { return restoreCollection(null); }
}

export function App() {
  const initial = useRef(readSave());
  const [mode, setMode] = useState(initial.current?.night === true ? 'night' : 'day');
  const [paused, setPaused] = useState(false), [quiet, setQuiet] = useState(false);
  const [placement, setPlacement] = useState('random'), [ready, setReady] = useState(false);
  const [overlay, setOverlay] = useState(null);
  const fishingOpen = overlay === 'fishing', collectionOpen = overlay === 'collection';
  const [collection, setCollection] = useState(readCollection);
  const collectionRef = useRef(collection), bookButtonRef = useRef(null), lastOverlay = useRef(null);
  const [discovery, setDiscovery] = useState(null);
  const [error, setError] = useState(''), [hint, setHint] = useState(PLACEMENT_HINT);
  const waterRef = useRef(null), sceneRef = useRef(null), hostRef = useRef(null), simRef = useRef(null);
  const state = useRef({ mode, paused, placement, quiet, overlay });
  const pointer = useRef({ x: 0, y: 0, inside: false, down: false, moved: false, id: null });
  const selection = useRef(null), hintTimer = useRef(null);
  const size = useRef({ width: 1, height: 1, view: { scale: 1, offsetX: 0, offsetY: 0 } });
  state.current = { mode, paused, placement, quiet, overlay };

  function whisper(message, duration = 2500) {
    clearTimeout(hintTimer.current); setHint(message);
    hintTimer.current = setTimeout(() => setHint(''), duration);
  }
  function save() {
    if (!simRef.current) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, night: state.current.mode === 'night',
      creatures: simRef.current.creatures.map(c => ({ type: c.type, x: c.x, y: c.y, angle: c.angle, size: c.size, variant: c.variant, baseSpeed: c.baseSpeed, phase: c.phase })) }));
    } catch { /* Storage is optional; the bay keeps running. */ }
  }
  function toWorld(clientX, clientY) {
    return screenToWorld({ clientX, clientY }, sceneRef.current.getBoundingClientRect(), size.current.view);
  }
  function place(type, pos) {
    if (!simRef.current || !pos.inside) return;
    if (pos.x < shorelineX(pos.y)) { whisper('放进水里吧'); return; }
    const creatureType = type === 'random' ? randomCreatureType() : type;
    const added = simRef.current.addCreature(creatureType, pos.x, pos.y, { exactPosition: true });
    if (!added) { whisper('海湾已经很热闹了'); return; }
    if (state.current.paused) added.spawnAge = 10;
    simRef.current.addRipple(pos.x, pos.y);
    setHint(''); save();
  }
  function choose(type) {
    cancelGesture();
    setPlacement(type); state.current.placement = type;
    whisper(type ? PLACEMENT_HINT : '轻点起涟漪，拖动拨水');
  }
  function cancelGesture() {
    const id = pointer.current.id;
    pointer.current.down = false; pointer.current.id = null; selection.current = null;
    if (id != null && sceneRef.current?.hasPointerCapture(id)) sceneRef.current.releasePointerCapture(id);
  }
  function toggleNight() {
    setMode(value => value === 'day' ? 'night' : 'day');
  }
  function toggleQuiet() {
    cancelGesture();
    setQuiet(value => !value);
  }
  function openFishing() {
    cancelGesture(); setHint(''); setQuiet(false); setPaused(false); setOverlay('fishing'); state.current.overlay = 'fishing';
  }
  function closeFishing() {
    setOverlay(null); state.current.overlay = null;
  }
  function openCollection() {
    cancelGesture(); setHint(''); setQuiet(false); setOverlay('collection'); state.current.overlay = 'collection';
  }
  function closeCollection() {
    setOverlay(null); state.current.overlay = null;
  }
  function fishingResult(result, snapshot, encounter) {
    if (result !== 'caught') return;
    simRef.current?.addRipple(950, 420);
    const recorded = recordCatch(collectionRef.current, encounter);
    collectionRef.current = recorded.collection;
    setCollection(recorded.collection);
    let saved = true;
    try { localStorage.setItem(COLLECTION_KEY, JSON.stringify(recorded.collection)); }
    catch { saved = false; }
    if (recorded.isNew || !saved) {
      setDiscovery({
        title: recorded.isNew ? `新发现 · ${encounter.name}` : '钓获记录',
        detail: saved ? '' : '本次记录暂未保存',
      });
    }
  }
  function pointerDown(event) {
    if (!ready || state.current.overlay || (event.pointerType === 'mouse' && event.button !== 0) || pointer.current.down) return;
    event.preventDefault();
    const pos = toWorld(event.clientX, event.clientY);
    sceneRef.current.focus({ preventScroll: true });
    pointer.current = { ...pos, start: pos, species: state.current.placement, down: true, moved: false, id: event.pointerId };
    sceneRef.current.setPointerCapture(event.pointerId);
    if (state.current.placement) {
      selection.current = makeSelection(pos, pos);
      whisper(PLACEMENT_HINT);
    } else {
      simRef.current.addRipple(pos.x, pos.y);
      setHint('');
    }
  }
  function pointerMove(event) {
    if (!ready || state.current.overlay) return;
    if (pointer.current.down && pointer.current.id !== event.pointerId) return;
    const pos = toWorld(event.clientX, event.clientY), p = pointer.current;
    if (p.down && p.id === event.pointerId && p.species) {
      selection.current = makeSelection(p.start, pos);
    } else if (p.down && p.id === event.pointerId && !state.current.paused) {
      const dx = pos.x - p.x, dy = pos.y - p.y, distance = Math.hypot(dx, dy);
      if (distance > 2) {
        const steps = Math.min(6, Math.ceil(distance / 14));
        for (let i = 1; i <= steps; i++) simRef.current.addCurrent(p.x + dx * i / steps, p.y + dy * i / steps, dx, dy, Math.min(1.4, .55 + distance / 55));
        p.moved = true;
      }
    }
    pointer.current = { ...p, ...pos };
  }
  function pointerUp(event) {
    if (pointer.current.id !== event.pointerId) return;
    const p = pointer.current;
    if (p.species && !state.current.overlay) {
      const box = makeSelection(p.start, toWorld(event.clientX, event.clientY));
      if (box.valid) place(p.species, { x: box.centerX, y: box.centerY, inside: true });
      else whisper('请在水域内框选');
    }
    cancelGesture();
  }

  useEffect(() => {
    let disposed = false, frame = 0, water, scene, last = 0, lastDraw = 0, saveElapsed = 0, statsElapsed = 0, frames = 0, renderedTime = 0;
    const sim = createSimulation(), stored = initial.current;
    if (stored?.version === 1 && Array.isArray(stored.creatures) && stored.creatures.length > 0) {
      const valid = stored.creatures.slice(0, 96).filter(c => c && SUPPORTED_CREATURE_TYPES.includes(c.type) && Number.isFinite(c.x) && Number.isFinite(c.y));
      if (valid.length) {
        sim.creatures.length = 0;
        for (const c of valid) {
          const animal = sim.addCreature(c.type, c.x, c.y); animal.spawnAge = 10;
          if (Number.isFinite(c.size) && c.size >= 40 && c.size <= 180) animal.size = c.size;
          if (Number.isInteger(c.variant) && c.variant >= 0 && c.variant <= 3) animal.variant = c.variant;
          if (Number.isFinite(c.baseSpeed) && c.baseSpeed >= 3 && c.baseSpeed <= 32) animal.baseSpeed = c.baseSpeed;
          if (Number.isFinite(c.phase) && c.phase >= 0 && c.phase < 1e9) animal.phase = c.phase;
          if (Number.isFinite(c.angle)) { animal.angle = c.angle; animal.vx = Math.cos(c.angle) * animal.baseSpeed; animal.vy = Math.sin(c.angle) * animal.baseSpeed; }
        }
      }
    }
    simRef.current = sim;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => sim.setReducedMotion(media.matches);
    motion(); media.addEventListener('change', motion);
    const resize = () => {
      if (!hostRef.current) return;
      const { width, height } = hostRef.current.getBoundingClientRect();
      const scale = Math.max(width / WORLD_WIDTH, height / WORLD_HEIGHT);
      // Keep the shore visible in a narrow desktop side panel.
      const anchorX = width / height < 1.35 ? .12 : .5;
      size.current = { width, height, view: { scale, offsetX: (width - WORLD_WIDTH * scale) * anchorX, offsetY: (height - WORLD_HEIGHT * scale) / 2 } };
    };
    const observer = new ResizeObserver(resize); observer.observe(hostRef.current); resize();
    let night = state.current.mode === 'night' ? 1 : 0;
    const visibility = () => { last = 0; lastDraw = 0; if (document.hidden) save(); };
    document.addEventListener('visibilitychange', visibility);
    const key = event => {
      if (state.current.overlay || event.defaultPrevented || event.repeat || event.isComposing) return;
      if (event.target.isContentEditable || event.target.closest?.('input, textarea, select')) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLButtonElement && [' ', 'Enter'].includes(event.key)) return;
      if (event.code === 'Space') { event.preventDefault(); setPaused(v => !v); }
      if (event.key.toLowerCase() === 'n') toggleNight();
      if (event.key.toLowerCase() === 'h') toggleQuiet();
      if (event.key.toLowerCase() === 'b' && simRef.current) openCollection();
      if (event.key === '1') choose('random');
      if (event.key === '2') choose(null);
      if (event.key === 'Escape') { cancelGesture(); setPlacement(null); setQuiet(false); setHint(''); }
      if (event.key === 'Enter' && event.target === sceneRef.current) {
        const { width, height, view } = size.current;
        const point = { x: (width * .53 - view.offsetX) / view.scale, y: (height * .53 - view.offsetY) / view.scale, inside: true };
        if (state.current.placement) place(state.current.placement, point); else sim.addRipple(point.x, point.y);
      }
    };
    window.addEventListener('keydown', key); window.addEventListener('beforeunload', save);
    hintTimer.current = setTimeout(() => setHint(''), 9000);
    loadAssets().then(assets => {
      if (disposed) return;
      water = createWaterRenderer(waterRef.current, assets); scene = createSceneRenderer(sceneRef.current, assets); setReady(true);
      const loop = timestamp => {
        if (disposed) return;
        frame = requestAnimationFrame(loop);
        if (document.hidden) return;
        const settlingNight = Math.abs(night - (state.current.mode === 'night' ? 1 : 0)) > .001;
        const interval = state.current.paused && !settlingNight && !state.current.placement ? 100 : 1000 / 60;
        if (timestamp - lastDraw < interval) return;
        lastDraw = timestamp - (timestamp - lastDraw) % interval;
        const dt = last ? Math.min((timestamp - last) / 1000, .06) : 1 / 60; last = timestamp;
        if (!state.current.paused) sim.update(dt);
        night += ((state.current.mode === 'night' ? 1 : 0) - night) * Math.min(1, dt * 1.45);
        if (Math.abs(night - (state.current.mode === 'night' ? 1 : 0)) < .0005) night = state.current.mode === 'night' ? 1 : 0;
        const args = { ...size.current, time: sim.time, night, ripples: sim.ripples, currents: sim.currents, reducedMotion: media.matches };
        water.render(args); scene.render({ ...args, simulation: sim, pointer: pointer.current, placement: state.current.placement, selection: selection.current });
        saveElapsed += dt; statsElapsed += dt; renderedTime += dt; frames++;
        if (statsElapsed > .2) {
          const node = sceneRef.current;
          Object.assign(node.dataset, { creatures: String(sim.creatures.length), ripples: String(sim.ripples.length), currents: String(sim.currents.length),
            simTime: sim.time.toFixed(2), night: night.toFixed(3), renderer: water.kind, fps: String(Math.round(frames / renderedTime)),
            selection: selection.current ? (selection.current.valid ? 'valid' : 'invalid') : 'none', tool: state.current.placement || 'water' });
          statsElapsed = 0;
        }
        if (saveElapsed > 20) { save(); saveElapsed = 0; }
      };
      frame = requestAnimationFrame(loop);
    }).catch(e => { if (!disposed) setError(e.message); });
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); media.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', save);
      clearTimeout(hintTimer.current); water?.dispose(); scene?.dispose();
    };
  }, []);

  useEffect(() => {
    const hidden = () => { if (document.hidden) cancelGesture(); };
    window.addEventListener('blur', cancelGesture); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', cancelGesture); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  useEffect(() => { if (ready) save(); }, [mode, ready]);
  useEffect(() => { if (quiet && !overlay) sceneRef.current?.focus({ preventScroll: true }); }, [quiet, overlay]);
  useEffect(() => {
    if (ready && !overlay) (lastOverlay.current === 'collection' ? bookButtonRef.current : sceneRef.current)?.focus({ preventScroll: true });
    lastOverlay.current = overlay;
  }, [overlay, ready]);
  useEffect(() => {
    if (!discovery || quiet || collectionOpen) return;
    const timer = setTimeout(() => setDiscovery(null), 4600);
    return () => clearTimeout(timer);
  }, [discovery, quiet, collectionOpen]);

  const bayControls = quiet ? (
    <button className="restore-button" aria-label="显示界面" title="显示界面 · H" onClick={toggleQuiet}><Eye size={20} weight="light" /></button>
  ) : (
    <div className="top-controls ui" role="group" aria-label="海湾控制">
      <button className="icon-button theme-button" aria-label={mode === 'day' ? '切换月夜' : '切换日光'} title={mode === 'day' ? '月夜 · N' : '日光 · N'} onClick={toggleNight}>
        {mode === 'day' ? <Sun size={22} weight="light" /> : <MoonStars size={22} weight="light" />}</button>
      <button className="icon-button pause-button" aria-label={paused ? '继续游动' : '暂停游动'} aria-pressed={paused} data-hint={paused ? '继续 · 空格' : '暂停 · 空格'} onClick={() => setPaused(value => !value)}>
        {paused ? <Play size={19} weight="fill" /> : <Pause size={19} weight="light" />}</button>
      <button className="icon-button" aria-label="隐藏界面" title="静静看海 · H" onClick={toggleQuiet}><EyeSlash size={21} weight="light" /></button>
    </div>
  );

  return (
    <div className="desktop-shell">
    <main ref={hostRef} className={`tide-app ${mode} ${quiet ? 'quiet' : ''} ${ready ? 'ready' : ''} ${fishingOpen ? 'is-fishing' : ''} ${collectionOpen ? 'is-collecting' : ''}`}>
      <canvas ref={waterRef} className="water-layer" aria-hidden="true" />
      <canvas ref={sceneRef} className={`life-layer ${placement ? 'placing' : ''}`} tabIndex={0} role="application" inert={Boolean(overlay)}
        aria-label="互动海湾。左键框选水域，松开随机放入一个生物。选择水波工具可以拨水。数字一随机投放，数字二选择水波，N切换日夜，空格暂停，H隐藏界面。"
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture}
        onPointerLeave={() => { if (!pointer.current.down) pointer.current.inside = false; }} />
      <header className="identity ui"><span className="wordmark">桌边潮汐</span></header>
      {!overlay && <>
      {bayControls}
      <div className="creature-dock ui" role="toolbar" aria-label="选择海湾工具" inert={quiet}>
        <button className={`creature-button water-tool ${placement === null ? 'selected' : ''}`} aria-label="拨动水流" aria-pressed={placement === null} title="水波 · 2 · 点击或拖动" onClick={() => choose(null)}><Waves size={23} weight="light" /><span className="creature-label">水波</span></button>
        <button className={`creature-button random-tool ${placement === 'random' ? 'selected' : ''}`} aria-label="随机放入一个生物" aria-pressed={placement === 'random'}
          title="随机投放 · 1 · 左键框选后松开" disabled={!ready} onClick={() => choose('random')}>
          <Shuffle size={23} weight="light" /><span className="creature-label">随机投放</span></button>
        <button ref={bookButtonRef} className="creature-button collection-entry" aria-label="打开海湾图鉴" title="海湾图鉴 · B" onClick={openCollection} disabled={!ready}>
          <BookOpen size={23} weight="light" /><span className="creature-label">图鉴</span></button>
      </div>
      <button className="fishing-start ui" onClick={openFishing} disabled={!ready} inert={quiet} aria-label="开始钓鱼"><FishSimple size={19} weight="light" /><span>开始钓鱼</span></button>
      <p className={`gesture-hint ${hint && !quiet ? 'visible' : ''}`} aria-live="polite">{hint}</p>
      </>}
      {discovery && !quiet && !collectionOpen && <div className="discovery-note" role="status" data-testid="discovery-note">
        <span>{discovery.title}</span>{discovery.detail && <small>{discovery.detail}</small>}
      </div>}
      <div className={`loading ${ready ? 'loaded' : ''}`} aria-live="polite"><span className="loading-name">桌边潮汐</span><span className="loading-caption">{error ? '海湾暂时没有载入' : '潮水正在靠岸'}</span>
        {error && <button className="retry" onClick={() => window.location.reload()} aria-label="重新载入"><ArrowCounterClockwise size={20} />重试</button>}</div>
      {fishingOpen && <FishingGame night={mode === 'night'} paused={paused} quiet={quiet}
        onToggleNight={toggleNight} onToggleQuiet={toggleQuiet} onClose={closeFishing}
        onResult={fishingResult}>
        {bayControls}
      </FishingGame>}
      {collectionOpen && <CollectionBook collection={collection} onClose={closeCollection} />}
    </main>
    </div>
  );
}
