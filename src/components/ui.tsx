import { Sparkles, X, type LucideIcon } from 'lucide-react';
import { useEffect, useId, type FormEvent, type PropsWithChildren, type ReactNode } from 'react';
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
export function EmptyState({ icon = Sparkles, children }: PropsWithChildren<{ icon?: LucideIcon }>) {
  return <div className="empty-state"><Icon as={icon} size={20} /><p>{children}</p></div>;
}
export function LinkButton({ children, onClick }: PropsWithChildren<{ onClick: () => void }>) {
  return <button type="button" className="link-button" onClick={onClick}>{children}</button>;
}
export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { key: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return <div className="segmented" role="tablist" aria-label={label}>{options.map(option => <button key={option.key} type="button" role="tab" aria-selected={value === option.key} className={value === option.key ? 'selected' : ''} onClick={() => onChange(option.key)}>{option.label}</button>)}</div>;
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

/* ── Dialog, drawer and fields ──────────────────────────────────────────── */

function useEscape(onClose: () => void) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
}

export function Dialog({ eyebrow, title, onClose, onSubmit, children, submitLabel, wide }: PropsWithChildren<{ eyebrow: string; title: string; onClose: () => void; onSubmit?: () => void; submitLabel?: string; wide?: boolean }>) {
  useEscape(onClose);
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit?.(); };
  const body = <><button type="button" className="dialog-close" onClick={onClose} aria-label="Fechar"><Icon as={X} /></button><span className="label">{eyebrow}</span><h2>{title}</h2>{children}{onSubmit && <Button variant="primary" type="submit" className="dialog-submit">{submitLabel ?? 'Salvar'}</Button>}</>;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    {onSubmit ? <form className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} onMouseDown={event => event.stopPropagation()}>{body}</form>
      : <section className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>{body}</section>}
  </div>;
}

/** Glass drawer from the right (desktop) or from the bottom (mobile). */
export function Drawer({ title, eyebrow, onClose, children }: PropsWithChildren<{ title: string; eyebrow?: string; onClose: () => void }>) {
  useEscape(onClose);
  return <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
    <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>
      <header className="drawer-head"><div>{eyebrow && <span className="label">{eyebrow}</span>}<h2>{title}</h2></div><button type="button" className="dialog-close" onClick={onClose} aria-label="Fechar"><Icon as={X} /></button></header>
      <div className="drawer-body">{children}</div>
    </aside>
  </div>;
}

export function Field({ label, hint, children, tone }: PropsWithChildren<{ label: string; hint?: string; tone?: 'warn' }>) {
  return <label className="field"><span>{label}</span>{children}{hint && <small className={tone === 'warn' ? 'is-warn' : ''}>{hint}</small>}</label>;
}
export function AreaSelect({ areas, value, onChange, allowEmpty = true }: { areas: LifeArea[]; value: string; onChange: (value: string) => void; allowEmpty?: boolean }) {
  return <select value={value} onChange={event => onChange(event.target.value)}>{allowEmpty && <option value="">Sem área</option>}{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select>;
}
export function AreaDot({ color }: { color?: string }) { return <i className="area-dot" style={{ background: color ?? 'var(--muted)' }} />; }
export function Tag({ tone = 'neutral', children }: PropsWithChildren<{ tone?: string }>) { return <span className={`tag tag-${tone}`}>{children}</span>; }
