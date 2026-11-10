import { Award, CalendarPlus, Lightbulb, ListPlus, Plus, Scale, Wallet, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ideaCategories } from '../domain/catalog';
import { toISODate, type IdeaCategory } from '../domain/models';
import { EventDialog } from '../pages/AgendaPage';
import { useLife } from '../state/LifeStore';
import { EntryDialog } from './FinancePanel';
import { WeightDialog } from './HealthPanel';
import { Icon } from './icons';
import { TaskDialog } from './tasks';
import { Dialog, Field } from './ui';

type Kind = 'action' | 'demand' | 'idea' | 'income' | 'expense' | 'weight' | 'event' | 'evidence';
const options: { kind: Kind; label: string; icon: typeof Plus }[] = [
  { kind: 'action', label: 'Ação física', icon: ListPlus },
  { kind: 'demand', label: 'Demanda rápida', icon: Zap },
  { kind: 'idea', label: 'Ideia', icon: Lightbulb },
  { kind: 'income', label: 'Transação', icon: Wallet },
  { kind: 'weight', label: 'Peso', icon: Scale },
  { kind: 'event', label: 'Compromisso', icon: CalendarPlus },
  { kind: 'evidence', label: 'Evidência', icon: Award }
];

/** "+ Registrar": one entry point for every kind of record. */
export function RegisterMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, [open]);
  const pick = (next: Kind) => { setKind(next); setOpen(false); };
  return <div className="register" ref={ref}>
    <button type="button" className={`register-button ${compact ? 'is-compact' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"><Icon as={Plus} size={16} strokeWidth={2} />{!compact && <span>Registrar</span>}</button>
    {open && <div className="register-menu" role="menu">{options.map(option => <button key={option.kind} type="button" role="menuitem" onClick={() => pick(option.kind)}><Icon as={option.icon} size={16} />{option.label}</button>)}</div>}
    {kind === 'action' && <TaskDialog onClose={() => setKind(null)} />}
    {kind === 'demand' && <QuickDialog kind="demand" onClose={() => setKind(null)} />}
    {kind === 'idea' && <QuickDialog kind="idea" onClose={() => setKind(null)} />}
    {kind === 'evidence' && <QuickDialog kind="evidence" onClose={() => setKind(null)} />}
    {kind === 'income' && <EntryDialog kind="income" onClose={() => setKind(null)} />}
    {kind === 'weight' && <WeightDialog onClose={() => setKind(null)} />}
    {kind === 'event' && <EventDialog initial="" onClose={() => setKind(null)} />}
  </div>;
}

function QuickDialog({ kind, onClose }: { kind: 'demand' | 'idea' | 'evidence'; onClose: () => void }) {
  const { captureDemand, addIdea, addEvidence } = useLife();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('cavu');
  const copy = { demand: { eyebrow: 'DEMANDA RÁPIDA', title: 'O que precisa da sua atenção?', placeholder: 'Ex.: Pagar o boleto do contador' }, idea: { eyebrow: 'NOVA IDEIA', title: 'Qual é a ideia?', placeholder: 'Ex.: Coleção cápsula para o verão' }, evidence: { eyebrow: 'BANCO DE EVIDÊNCIAS', title: 'Qual vitória você viveu?', placeholder: 'Ex.: Treinei 5 dias seguidos' } }[kind];
  const submit = () => { if (!title.trim()) return; if (kind === 'demand') captureDemand(title); if (kind === 'idea') addIdea(title, category); if (kind === 'evidence') addEvidence({ title, date: toISODate(new Date()) }); onClose(); };
  return <Dialog eyebrow={copy.eyebrow} title={copy.title} onClose={onClose} onSubmit={submit} submitLabel="Registrar →">
    <Field label="Título"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder={copy.placeholder} /></Field>
    {kind === 'idea' && <div className="chip-row">{(Object.keys(ideaCategories) as IdeaCategory[]).map(key => <button key={key} type="button" className={`chip ${category === key ? 'selected' : ''}`} onClick={() => setCategory(key)}>{ideaCategories[key].label}</button>)}</div>}
  </Dialog>;
}
