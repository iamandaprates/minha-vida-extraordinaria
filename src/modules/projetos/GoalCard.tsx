import { motion } from 'framer-motion';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { areaName, areas } from '../../data/areas';
import { goalProgress } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import type { AreaId, Goal } from '../../types';
import { Button, GlassCard, Input, Modal, ProgressRing, Select, Tag, cn } from '../../ui';

/** Meta com marcos: cada marco concluído vira um checkpoint magenta na trilha. */
export function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: (goal: Goal) => void }) {
  const state = useMive();
  const [draft, setDraft] = useState('');
  const progress = goalProgress(goal);
  const add = () => { if (!draft.trim()) return; state.addMilestone(goal.id, draft); setDraft(''); };
  return <GlassCard className="grid gap-4">
    <div className="flex items-start gap-4">
      <ProgressRing value={progress} size={64} stroke={7} label={progress === undefined ? 'Sem marcos' : `${Math.round(progress * 100)}% dos marcos`}><span className="text-sm font-bold">{progress === undefined ? '·' : `${Math.round(progress * 100)}%`}</span></ProgressRing>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold leading-snug">{goal.title}</h3>
        <div className="mt-1 flex flex-wrap gap-2"><Tag tone="lilas">{areaName(goal.areaId)}</Tag></div>
        {goal.why && <p className="mt-2 text-sm text-ink-soft">{goal.why}</p>}
      </div>
      <button type="button" onClick={() => onEdit(goal)} aria-label={`Editar meta ${goal.title}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:text-magenta"><Pencil size={17} strokeWidth={1.75} /></button>
    </div>
    <ol className="relative grid gap-1 pl-1">
      {goal.milestones.map((milestone, index) => <li key={milestone.id} className="group relative flex items-center gap-3">
        {index < goal.milestones.length - 1 && <span aria-hidden className={cn('absolute left-[21px] top-[34px] h-[calc(100%-20px)] w-0.5', milestone.doneAt ? 'bg-magenta/60' : 'bg-line/10')} />}
        <button type="button" onClick={() => state.toggleMilestone(goal.id, milestone.id)} aria-pressed={Boolean(milestone.doneAt)} aria-label={`${milestone.doneAt ? 'Reabrir' : 'Concluir'} marco ${milestone.title}`} className="relative grid h-11 w-11 shrink-0 place-items-center">
          <motion.span key={String(Boolean(milestone.doneAt))} initial={{ scale: milestone.doneAt ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className={cn('grid h-7 w-7 place-items-center rounded-full border-2', milestone.doneAt ? 'border-magenta bg-magenta text-white shadow-magenta' : 'border-magenta/40 bg-white/70 dark:bg-white/5')}>{milestone.doneAt && <Check size={15} strokeWidth={2.75} />}</motion.span>
        </button>
        <span className={cn('flex-1 text-[15px] font-medium', milestone.doneAt && 'text-ink-soft')}>{milestone.title}</span>
        <button type="button" onClick={() => state.removeMilestone(goal.id, milestone.id)} aria-label={`Remover marco ${milestone.title}`} className="grid h-11 w-11 place-items-center rounded-full text-muted opacity-60 hover:text-magenta hover:opacity-100"><X size={16} strokeWidth={1.75} /></button>
      </li>)}
    </ol>
    <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); add(); }}>
      <label className="sr-only" htmlFor={`marco-${goal.id}`}>Novo marco para {goal.title}</label>
      <input id={`marco-${goal.id}`} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Novo marco" className="h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/70 px-4 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" />
      <Button type="submit" variant="secondary" size="icon" aria-label="Adicionar marco" disabled={!draft.trim()}><Plus size={18} strokeWidth={2} /></Button>
    </form>
  </GlassCard>;
}

/** Cria ou edita uma meta, com marcos iniciais opcionais. */
export function GoalModal({ goal, projectId, areaId: defaultArea, onClose }: { goal?: Goal; projectId?: string; areaId?: AreaId; onClose: () => void }) {
  const state = useMive();
  const project = state.projects.find(item => item.id === (goal?.projectId ?? projectId));
  const [title, setTitle] = useState(goal?.title ?? '');
  const [why, setWhy] = useState(goal?.why ?? '');
  const [areaId, setAreaId] = useState<AreaId>(goal?.areaId ?? project?.areaId ?? defaultArea ?? 'profissional');
  const [linked, setLinked] = useState(goal?.projectId ?? projectId ?? '');
  const [milestones, setMilestones] = useState('');
  const save = () => {
    if (!title.trim()) return;
    const change = { title: title.trim(), why: why.trim() || undefined, areaId, projectId: linked || undefined };
    if (goal) state.updateGoal(goal.id, change);
    else {
      const created = state.addGoal({ ...change, milestones: [] });
      milestones.split('\n').map(line => line.trim()).filter(Boolean).forEach(line => state.addMilestone(created.id, line));
    }
    onClose();
  };
  return <Modal open onClose={onClose} title={goal ? 'Editar meta' : 'Nova meta'} eyebrow="Metas">
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); save(); }}>
      <Input label="Meta" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Primeiras 10 vendas" autoFocus />
      <Input label="Por que importa" value={why} onChange={event => setWhy(event.target.value)} placeholder="Opcional" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Área da vida" value={areaId} onChange={event => setAreaId(event.target.value as AreaId)} options={areas.map(area => ({ value: area.id, label: area.name }))} />
        <Select label="Projeto" value={linked} onChange={event => setLinked(event.target.value)} options={[{ value: '', label: 'Nenhum' }, ...state.projects.map(item => ({ value: item.id, label: item.name }))]} />
      </div>
      {!goal && <label className="grid gap-2"><span className="text-sm font-semibold">Marcos (um por linha)</span><textarea value={milestones} onChange={event => setMilestones(event.target.value)} rows={3} placeholder={'Lançar a coleção\nPrimeira venda'} className="rounded-2xl border border-line/15 bg-white/80 px-4 py-3 text-base font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" /></label>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!title.trim()}>{goal ? 'Salvar' : 'Criar meta'}</Button>{goal && <Button variant="ghost" onClick={() => { state.deleteGoal(goal.id); onClose(); }}><Trash2 size={16} strokeWidth={1.75} /> Excluir meta</Button>}</div>
    </form>
  </Modal>;
}
