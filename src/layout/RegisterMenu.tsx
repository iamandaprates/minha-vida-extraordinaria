import { ListChecks, Plus, Scale, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../ui';

/** "+ Registrar": ação rápida global. Cada registro ganha vida na fase do seu módulo. */
const actions: { label: string; icon: LucideIcon; phase: number }[] = [
  { label: 'Demanda rápida', icon: Zap, phase: 2 },
  { label: 'Check-in de hábitos', icon: ListChecks, phase: 2 },
  { label: 'Transação financeira', icon: Wallet, phase: 4 },
  { label: 'Registro de peso', icon: Scale, phase: 4 }
];

export function RegisterMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, [open]);
  return <div className="relative" ref={ref}>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" className={cn('flex h-11 items-center gap-2 rounded-full bg-grad-magenta font-semibold text-white shadow-magenta transition hover:brightness-105', compact ? 'w-11 justify-center' : 'px-5 text-sm')}>
      <Plus size={18} strokeWidth={2} />{!compact && 'Registrar'}
    </button>
    {open && <div role="menu" className="glass-strong absolute right-0 top-14 z-50 w-64 rounded-3xl p-2">
      {actions.map(action => <button key={action.label} type="button" role="menuitem" disabled className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-ink disabled:cursor-default">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-rosa text-magenta dark:bg-white/10"><action.icon size={17} strokeWidth={1.75} /></span>
        <span className="flex-1">{action.label}</span><span className="text-[11px] font-medium text-muted">Fase {action.phase}</span>
      </button>)}
    </div>}
  </div>;
}
