import { ArrowLeft, Check, Lightbulb, ListChecks, Plus, Scale, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { todayISO } from '../lib/dates';
import { habitDone } from '../lib/selectors';
import { useMive } from '../store/useMive';
import { TransactionModal } from '../modules/financas/FinancasPanel';
import { QuickCapture } from '../modules/ideias/IdeiasPage';
import { WeightModal } from '../modules/saude/SaudePanel';
import { Button, Input, Modal, cn } from '../ui';

type Action = 'demanda' | 'habitos';
const actions: { key: Action | 'financas' | 'peso' | 'ideia'; label: string; icon: LucideIcon; phase?: number }[] = [
  { key: 'demanda', label: 'Demanda rápida', icon: Zap },
  { key: 'ideia', label: 'Ideia rápida', icon: Lightbulb },
  { key: 'habitos', label: 'Check-in de hábitos', icon: ListChecks },
  { key: 'financas', label: 'Transação financeira', icon: Wallet },
  { key: 'peso', label: 'Registro de peso', icon: Scale }
];

/** "+ Registrar": ação rápida global. */
export function RegisterMenu({ compact = false }: { compact?: boolean }) {
  const state = useMive();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'habitos'>('menu');
  const [demand, setDemand] = useState(false);
  const [modal, setModal] = useState<'financas' | 'peso' | 'ideia' | null>(null);
  const [title, setTitle] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (ref.current && ref.current.offsetParent !== null && !ref.current.contains(event.target as Node)) { setOpen(false); setView('menu'); } }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, [open]);
  const today = todayISO();
  const done = state.habits.filter(habit => habitDone(state, habit.id, today)).length;
  return <div className="relative" ref={ref}>
    <button type="button" onClick={() => { setOpen(!open); setView('menu'); }} aria-expanded={open} aria-haspopup="menu" aria-label="Registrar" className={cn('flex h-11 items-center gap-2 rounded-full bg-grad-magenta font-semibold text-white shadow-magenta transition hover:brightness-105', compact ? 'w-11 justify-center' : 'px-5 text-sm')}>
      <Plus size={18} strokeWidth={2} />{!compact && 'Registrar'}
    </button>
    {open && <div role="menu" className="glass-strong absolute right-0 top-14 z-50 w-72 rounded-3xl p-2">
      {view === 'menu' ? actions.map(action => <button key={action.key} type="button" role="menuitem" disabled={Boolean(action.phase)} onClick={() => { if (action.key === 'habitos') setView('habitos'); if (action.key === 'demanda') { setOpen(false); setDemand(true); } if (action.key === 'financas' || action.key === 'peso' || action.key === 'ideia') { setOpen(false); setModal(action.key); } }} className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-rosa/70 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent dark:hover:bg-white/5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-rosa text-magenta dark:bg-white/10"><action.icon size={17} strokeWidth={1.75} /></span>
        <span className="flex-1">{action.label}</span>{action.phase && <span className="text-[11px] font-medium text-muted">Fase {action.phase}</span>}
      </button>) : <>
        <button type="button" onClick={() => setView('menu')} className="flex h-11 items-center gap-2 px-3 text-sm font-semibold text-magenta"><ArrowLeft size={16} strokeWidth={1.75} /> Hábitos de hoje · {done} de {state.habits.length}</button>
        {state.habits.map(habit => { const checked = habitDone(state, habit.id, today); return <button key={habit.id} type="button" role="menuitemcheckbox" aria-checked={checked} onClick={() => state.toggleHabit(habit.id)} className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold hover:bg-rosa/70 dark:hover:bg-white/5">
          <span className={cn('grid h-7 w-7 place-items-center rounded-lg border-2 transition', checked ? 'border-magenta bg-magenta text-white' : 'border-lilas')}>{checked && <Check size={15} strokeWidth={2.5} />}</span>
          <span className={cn(checked && 'text-muted')}>{habit.title}</span>
        </button>; })}
      </>}
    </div>}
    <Modal open={demand} onClose={() => setDemand(false)} title="O que precisa da sua atenção?" eyebrow="Demanda rápida">
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); if (!title.trim()) return; state.addTask({ title: title.trim() }); setTitle(''); setDemand(false); }}>
        <Input label="Demanda" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Pagar o boleto do contador" autoFocus hint="Fica nas tarefas sem projeto. Pode virar entrega quando você quiser." />
        <Button type="submit" disabled={!title.trim()}>Registrar</Button>
      </form>
    </Modal>
    {modal === 'financas' && <TransactionModal onClose={() => setModal(null)} />}
    {modal === 'peso' && <WeightModal onClose={() => setModal(null)} />}
    <Modal open={modal === 'ideia'} onClose={() => setModal(null)} title="Qual é a ideia?" eyebrow="Geladeira de Potencial">
      <QuickCapture autoFocus onSaved={() => setModal(null)} />
      <p className="mt-3 text-sm text-muted">Use #tag no texto para organizar. Ex.: Coleção praia #CAVU</p>
    </Modal>
  </div>;
}
