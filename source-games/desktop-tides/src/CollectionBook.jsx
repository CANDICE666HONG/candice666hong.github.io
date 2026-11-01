import { useEffect, useId, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { FISH_CATALOG } from './game/collection.js';
import { formatWeight } from './game/encounter.js';
import './collection.css';

const shortDate = value => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Shanghai',
}).format(new Date(value));

export function CollectionBook({ collection, onClose }) {
  const titleId = useId(), detailId = useId();
  const panelRef = useRef(null), closeRef = useRef(null), onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [selected, setSelected] = useState(() => {
    const latest = FISH_CATALOG.filter(fish => collection.fish[fish.id])
      .sort((a, b) => collection.fish[b.id].firstCaughtAt - collection.fish[a.id].firstCaughtAt)[0];
    return latest?.id ?? null;
  });
  const discovered = FISH_CATALOG.filter(fish => collection.fish[fish.id]).length;

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const keyDown = event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!event.repeat) onCloseRef.current();
      } else if (event.key === 'Tab') {
        const panel = panelRef.current;
        const controls = [...panel.querySelectorAll('button:not([disabled])')];
        const first = controls[0], last = controls.at(-1);
        const outside = !panel.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || outside)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || outside)) {
          event.preventDefault(); first?.focus();
        }
      } else if (['n', 'h', '1', '2', '3'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    const keyUp = event => event.stopPropagation();
    document.addEventListener('keydown', keyDown, true);
    document.addEventListener('keyup', keyUp, true);
    return () => {
      document.removeEventListener('keydown', keyDown, true);
      document.removeEventListener('keyup', keyUp, true);
    };
  }, []);

  let detail = <span>遇见的新鱼，会留在这里。</span>;
  if (selected) {
    const fish = FISH_CATALOG.find(item => item.id === selected);
    const record = collection.fish[selected];
    detail = record ? <>
      <span>{fish.name}</span>
      <span>初见 {shortDate(record.firstCaughtAt)}</span>
      <span>最大 {formatWeight(record.maxGrams)}</span>
    </> : <span>钓到后揭晓</span>;
  }

  return <section ref={panelRef} className="collection-overlay" role="dialog" aria-modal="true"
    aria-labelledby={titleId} data-testid="collection-book"
    onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}
    onPointerMove={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <div className="collection-page">
      <header className="collection-heading">
        <h2 id={titleId}>海湾图鉴</h2>
        <span className="collection-count" aria-label={`已发现 ${discovered} 种，共 ${FISH_CATALOG.length} 种`}>{discovered} / {FISH_CATALOG.length}</span>
        <button ref={closeRef} className="collection-close" onClick={() => onCloseRef.current()} aria-label="关闭图鉴" title="返回海湾 · Esc"><X size={22} weight="light" /></button>
      </header>
      <div className="collection-scroll">
        <div className="collection-fish-grid" role="group" aria-label="鱼种图鉴">
          {FISH_CATALOG.map((fish, index) => {
            const known = !!collection.fish[fish.id];
            const active = selected === fish.id;
            return <button key={fish.id} className={`collection-fish ${known ? 'is-discovered' : 'is-undiscovered'}`}
              data-fish-id={fish.id} data-discovered={known} aria-pressed={active}
              aria-label={known ? fish.name : `未发现的鱼 ${index + 1}`} aria-describedby={active ? detailId : undefined}
              onClick={() => setSelected(fish.id)}>
              <img src={fish.image} alt="" draggable="false" />
              <span>{known ? fish.name : '未发现'}</span>
            </button>;
          })}
        </div>
        <div className="collection-detail" id={detailId} aria-live="polite" aria-atomic="true">{detail}</div>
      </div>
    </div>
  </section>;
}
