import { ListChecks, Plus, Scale, Wallet, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toISODate } from '../domain/models';
import { isHabitDone } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { EntryDialog } from './FinancePanel';
import { WeightDialog } from './HealthPanel';
import { Icon, iconByName } from './icons';
import { CheckMark, Dialog, Field } from './ui';

type Kind = 'transaction' | 'weight' | 'demand' | 'habits';
const options: { kind: Kind; label: string; icon: typeof Plus }[] = [
  { kind: 'transaction', label: 'Transação Financeira', icon: Wallet },
  { kind: 'weight', label: 'Registro de Peso', icon: Scale },
  { kind: 'demand', label: 'Demanda Rápida', icon: Zap },
  { kind: 'habits', label: 'Check-in de Hábitos', icon: ListChecks }
];

/** "+ Registrar": the four quick records of the day. */
export function RegisterMenu({ compact = false }: { compact?: boolean }) {
  const { snapshot, toggleHabit } = useLife();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) { setOpen(false); setKind(current => current === 'habits' ? null : current); } }; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); setKind(current => current === 'habits' ? null : current); } }; document.addEventListener('mousedown', close); document.addEventListener('keydown', onKey); return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); }; }, [open]);
  const today = toISODate(new Date());
  const habits = snapshot.habits.filter(habit => habit.active);
  return <div className="register" ref={ref}>
    <button type="button" className={`register-button ${compact ? 'is-compact' : ''}`} onClick={() => { setOpen(!open); setKind(null); }} aria-expanded={open} aria-haspopup="menu" aria-label="Registrar"><Icon as={Plus} size={16} strokeWidth={2} />{!compact && <span>Registrar</span>}</button>
    {open && <div className="register-menu" role="menu">
      {kind === 'habits' ? <>
        <span className="menu-title">Hábitos de hoje · {habits.filter(habit => isHabitDone(habit.id, today, snapshot.habitCheckIns)).length} de {habits.length}</span>
        {!habits.length && <span className="menu-empty">Crie o primeiro hábito em Projetos & Metas.</span>}
        {habits.map(habit => { const done = isHabitDone(habit.id, today, snapshot.habitCheckIns); return <button key={habit.id} type="button" role="menuitemcheckbox" aria-checked={done} className={`habit-quick ${done ? 'is-done' : ''}`} onClick={() => toggleHabit(habit.id)}><span className="check"><CheckMark done={done} size={13} strokeWidth={2.4} /></span><Icon as={iconByName(habit.icon)} size={15} />{habit.title}</button>; })}
        <button type="button" className="menu-back" onClick={() => setKind(null)}>← Voltar</button>
      </> : options.map(option => <button key={option.kind} type="button" role="menuitem" onClick={() => { setKind(option.kind); if (option.kind !== 'habits') setOpen(false); }}><Icon as={option.icon} size={16} />{option.label}</button>)}
    </div>}
    {kind === 'transaction' && <EntryDialog onClose={() => setKind(null)} />}
    {kind === 'weight' && <WeightDialog onClose={() => setKind(null)} />}
    {kind === 'demand' && <DemandDialog onClose={() => setKind(null)} />}
  </div>;
}

function DemandDialog({ onClose }: { onClose: () => void }) {
  const { captureDemand } = useLife();
  const [title, setTitle] = useState('');
  return <Dialog eyebrow="DEMANDA RÁPIDA" title="O que precisa da sua atenção?" onClose={onClose} onSubmit={() => { if (title.trim()) { captureDemand(title); onClose(); } }} submitLabel="Registrar →">
    <Field label="Demanda" hint="Ela entra na lista de execução e pode virar entrega de um dia."><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Pagar o boleto do contador" /></Field>
  </Dialog>;
}
