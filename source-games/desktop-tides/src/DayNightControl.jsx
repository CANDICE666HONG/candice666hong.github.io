import { useEffect, useId, useRef, useState } from 'react';
import { Sun, MoonStars, Clock } from '@phosphor-icons/react';

const options = [{ value: 'auto', label: '自动' }, { value: 'day', label: '日光' }, { value: 'night', label: '月夜' }];

export function DayNightControl({ mode, preference, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null), choices = useRef([]);
  const menuId = useId();
  const current = useRef(null);
  current.current = { preference, onChange };
  const light = mode === 'day' ? '日光' : '月夜';
  const label = preference === 'auto' ? `自动，当前${light}` : light;

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus({ preventScroll: true });
  }
  function choose(value) { current.current.onChange(value); close(); }

  useEffect(() => {
    if (!open) return;
    choices.current[options.findIndex(option => option.value === current.current.preference)]?.focus({ preventScroll: true });
    const outside = event => {
      if (root.current?.contains(event.target)) return;
      // The first outside press dismisses this menu without spawning or reeling.
      event.preventDefault(); event.stopPropagation(); close();
    };
    const key = event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (event.key === 'Tab') { close(); return; }
      // Window capture runs before the fishing dialog's document-level key handler.
      event.preventDefault(); event.stopPropagation();
      if (event.repeat && ['Escape', 'Enter', ' '].includes(event.key)) return;
      if (event.key === 'Escape') { close(); return; }
      const index = Math.max(0, choices.current.indexOf(document.activeElement));
      if (event.key === 'Enter' || event.key === ' ') { choose(options[index].value); return; }
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = options.length - 1;
      choices.current[next]?.focus({ preventScroll: true });
    };
    const blur = () => close(false);
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('keydown', key, true);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('blur', blur);
    };
  }, [open]);

  return <div ref={root} className="day-night-control" onPointerDown={event => event.stopPropagation()}>
    <button ref={trigger} className="icon-button theme-button" aria-label={`昼夜设置，${label}`}
      title={`昼夜：${label} · N 手动切换`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      data-time-mode={preference} onClick={() => setOpen(value => !value)}>
      {mode === 'day' ? <Sun size={22} weight="light" /> : <MoonStars size={22} weight="light" />}
      {preference === 'auto' && <span className="theme-auto-mark" aria-hidden="true"><Clock size={10} weight="bold" /></span>}
    </button>
    {open && <div id={menuId} className="day-night-options" role="menu" aria-label="昼夜模式">
      {options.map((option, index) => <button key={option.value} ref={node => { choices.current[index] = node; }}
        type="button" role="menuitemradio" aria-checked={preference === option.value} tabIndex={-1}
        title={option.value === 'auto' ? '本机时间 6:00–18:00 为日光，其余为月夜' : `固定${option.label}`}
        onClick={() => choose(option.value)}>{option.label}</button>)}
    </div>}
  </div>;
}
