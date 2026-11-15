import { AnimatePresence, m } from 'framer-motion';
import { Check, Sparkles, X, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LifeArea } from '../domain/models';
import { percent } from '../domain/selectors';
import { Button } from './Button';
import { Icon } from './icons';

/* ── Layout ─────────────────────────────────────────────────────────────── */

export function PageIntro({ eyebrow, title, text, action }: { eyebrow: string; title: ReactNode; text?: string; action?: ReactNode }) {
  return <header className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>{action && <div className="page-actions">{action}</div>}</header>;
}
export function SectionHeading({ label, title, action }: { label: string; title: string; action?: ReactNode }) {
  return <div className="section-heading"><div><span className="label">{label}</span><h2>{title}</h2></div>{action}</div>;
}
/**
 * Empty module: an invitation, never a reprimand. `title` is the encouraging line,
 * the children say what happens next and `action` offers the first step.
 */
export function EmptyState({ icon = Sparkles, title, action, children }: PropsWithChildren<{ icon?: LucideIcon; title?: string; action?: ReactNode }>) {
  return <div className="empty-state"><span className="empty-icon"><Icon as={icon} size={20} /></span>{title && <strong>{title}</strong>}{children && <p>{children}</p>}{action && <div className="empty-action">{action}</div>}</div>;
}
export function LinkButton({ children, onClick }: PropsWithChildren<{ onClick: () => void }>) {
  return <button type="button" className="link-button" onClick={onClick}>{children}</button>;
}
export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { key: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  const list = useRef<HTMLDivElement>(null);
  // On narrow screens the tabs scroll sideways: keep the selected one in sight.
  useEffect(() => { const row = list.current; const selected = row?.querySelector<HTMLElement>('.selected'); if (row && selected && row.scrollWidth > row.clientWidth) row.scrollTo({ left: selected.offsetLeft - (row.clientWidth - selected.offsetWidth) / 2, behavior: 'smooth' }); }, [value]);
  return <div ref={list} className="segmented" role="tablist" aria-label={label}>{options.map(option => <button key={option.key} type="button" role="tab" aria-selected={value === option.key} className={value === option.key ? 'selected' : ''} onClick={() => onChange(option.key)}>{option.label}</button>)}</div>;
}

/* ── Progress ───────────────────────────────────────────────────────────── */

/** Ring for a 0 to 1 value. Without a value it shows an empty ring and a dot, never a fake number. */
export function ProgressRing({ value, size = 132, stroke = 12, label }: { value?: number; size?: number; stroke?: number; label?: string }) {
  const id = useId();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return <div className="progress-ring" style={{ width: size, height: size }}>
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={value === undefined ? 'Sem registros suficientes' : `${percent(value)}%`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--pink)" /><stop offset="55%" stopColor="var(--magenta)" /><stop offset="100%" stopColor="var(--violet)" /></linearGradient></defs>
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
      {value !== undefined && <circle className="ring-value" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} stroke={`url(#${id})`} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
    </svg>
    <div className="ring-center"><b>{value === undefined ? '·' : `${percent(value)}%`}</b>{label && <small>{label}</small>}</div>
  </div>;
}
export function ProgressBar({ value, color, label }: { value?: number; color?: string; label?: string }) {
  return <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === undefined ? undefined : percent(value)} aria-label={label}>
    <i style={{ width: `${percent(value ?? 0)}%`, ...(color ? { background: color } : {}) }} />
  </div>;
}

/* ── Assistant orb ──────────────────────────────────────────────────────── */

export function Orb({ size = 'md', speaking = false }: { size?: 'sm' | 'md' | 'lg'; speaking?: boolean }) {
  return <div className={`mive-orb orb-${size} ${speaking ? 'is-speaking' : ''}`} aria-hidden="true"><span className="orb-core" /><span className="orb-wave w1" /><span className="orb-wave w2" /><span className="orb-wave w3" /><span className="orb-bars">{[0, 1, 2, 3, 4].map(index => <i key={index} />)}</span></div>;
}

/* ── Check mark ─────────────────────────────────────────────────────────── */

/** The tick of a task, habit or delivery. It springs in when done and shrinks out when reopened. */
export function CheckMark({ done, size = 14, strokeWidth = 2.2 }: { done: boolean; size?: number; strokeWidth?: number }) {
  return <AnimatePresence initial={false}>{done && <m.span className="check-mark" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.2, opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 24 }}><Icon as={Check} size={size} strokeWidth={strokeWidth} /></m.span>}</AnimatePresence>;
}

/* ── Dialog, drawer and fields ──────────────────────────────────────────── */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** Open overlays, bottom to top. Only the top one answers Escape and traps Tab. */
const overlayStack: symbol[] = [];

/**
 * Behaviour shared by dialogs and drawers: rendered in <body> (so a glass parent never clips
 * them), Escape and backdrop close with an exit transition, focus stays inside and goes back
 * to where it was, and the page behind does not scroll.
 */
function useOverlay(onClose: () => void) {
  const [open, setOpen] = useState(true);
  const panel = useRef<HTMLElement | null>(null);
  const latestClose = useRef(onClose); latestClose.current = onClose;
  const requestClose = useCallback(() => setOpen(false), []);
  const finishClose = useCallback(() => latestClose.current(), []);
  const setPanel = useCallback((node: HTMLElement | null) => { panel.current = node; }, []);

  useEffect(() => {
    const id = Symbol('overlay');
    const previous = document.activeElement as HTMLElement | null;
    overlayStack.push(id);
    if (overlayStack.length === 1) document.documentElement.style.setProperty('--scrollbar-width', `${window.innerWidth - document.documentElement.clientWidth}px`);
    document.documentElement.classList.add('has-overlay');
    const node = panel.current;
    if (node && !node.contains(document.activeElement)) node.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (overlayStack[overlayStack.length - 1] !== id) return;
      if (event.key === 'Escape') { event.stopPropagation(); requestClose(); return; }
      if (event.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(item => item.offsetParent !== null);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0]; const last = items[items.length - 1]; const active = document.activeElement;
      if (!panel.current.contains(active)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && (active === first || active === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      overlayStack.splice(overlayStack.indexOf(id), 1);
      if (!overlayStack.length) document.documentElement.classList.remove('has-overlay');
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [requestClose]);

  return { open, requestClose, finishClose, setPanel };
}

const backdropMotion = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } } as const;
const panelSpring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;
const isSheet = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

export function Dialog({ eyebrow, title, onClose, onSubmit, children, submitLabel, wide }: PropsWithChildren<{ eyebrow: string; title: string; onClose: () => void; onSubmit?: () => void; submitLabel?: string; wide?: boolean }>) {
  const { open, requestClose, finishClose, setPanel } = useOverlay(onClose);
  const titleId = useId();
  const submit = (event: FormEvent) => { event.preventDefault(); event.stopPropagation(); onSubmit?.(); };
  const body = <><button type="button" className="dialog-close" onClick={requestClose} aria-label="Fechar"><Icon as={X} /></button><span className="label">{eyebrow}</span><h2 id={titleId}>{title}</h2>{children}{onSubmit && <Button variant="primary" type="submit" className="dialog-submit">{submitLabel ?? 'Salvar'}</Button>}</>;
  const shared = { ref: setPanel, className: `dialog ${wide ? 'dialog-wide' : ''}`, role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, tabIndex: -1, onMouseDown: (event: { stopPropagation(): void }) => event.stopPropagation(), initial: { opacity: 0, y: 16, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 10, scale: 0.98 }, transition: panelSpring } as const;
  return createPortal(<AnimatePresence onExitComplete={finishClose}>{open && <m.div key="backdrop" className="dialog-backdrop" role="presentation" onMouseDown={requestClose} {...backdropMotion}>
    {onSubmit ? <m.form {...shared} onSubmit={submit}>{body}</m.form> : <m.section {...shared}>{body}</m.section>}
  </m.div>}</AnimatePresence>, document.body);
}

/** Glass drawer from the right (desktop) or bottom sheet (mobile). */
export function Drawer({ title, eyebrow, onClose, children }: PropsWithChildren<{ title: string; eyebrow?: string; onClose: () => void }>) {
  const { open, requestClose, finishClose, setPanel } = useOverlay(onClose);
  const titleId = useId();
  const [sheet] = useState(isSheet);
  const hidden = sheet ? { y: '100%', opacity: 1 } : { x: 48, opacity: 0 };
  return createPortal(<AnimatePresence onExitComplete={finishClose}>{open && <m.div key="backdrop" className="drawer-backdrop" role="presentation" onMouseDown={requestClose} {...backdropMotion}>
    <m.aside ref={setPanel} className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onMouseDown={event => event.stopPropagation()} initial={hidden} animate={{ x: 0, y: 0, opacity: 1 }} exit={hidden} transition={panelSpring}>
      <header className="drawer-head"><div>{eyebrow && <span className="label">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div><button type="button" className="dialog-close" onClick={requestClose} aria-label="Fechar"><Icon as={X} /></button></header>
      <div className="drawer-body">{children}</div>
    </m.aside>
  </m.div>}</AnimatePresence>, document.body);
}

export function Field({ label, hint, children, tone }: PropsWithChildren<{ label: string; hint?: string; tone?: 'warn' }>) {
  return <label className="field"><span>{label}</span>{children}{hint && <small className={tone === 'warn' ? 'is-warn' : ''}>{hint}</small>}</label>;
}
export function AreaSelect({ areas, value, onChange, allowEmpty = true }: { areas: LifeArea[]; value: string; onChange: (value: string) => void; allowEmpty?: boolean }) {
  return <select value={value} onChange={event => onChange(event.target.value)}>{allowEmpty && <option value="">Sem área</option>}{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select>;
}
export function AreaDot({ color }: { color?: string }) { return <i className="area-dot" style={{ background: color ?? 'var(--muted)' }} />; }
export function Tag({ tone = 'neutral', children }: PropsWithChildren<{ tone?: string }>) { return <span className={`tag tag-${tone}`}>{children}</span>; }
