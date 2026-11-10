import { Crown, Plus } from 'lucide-react';
import { useState } from 'react';
import { deliveryCandidates } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import type { DeliveryRole } from '../../types';
import { Button, Input, Sheet, Tabs, cn } from '../../ui';

/** Escolha das entregas do dia, a partir dos projetos. Bloqueia a 4ª entrega. */
export function DeliveryPicker({ open, onClose, initialRole }: { open: boolean; onClose: () => void; initialRole: DeliveryRole }) {
  const state = useMive();
  const [role, setRole] = useState<DeliveryRole>(initialRole);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [minutes, setMinutes] = useState('');
  const candidates = deliveryCandidates(state);
  const projectName = (id?: string) => state.projects.find(project => project.id === id)?.name ?? 'Sem projeto';
  const choose = (taskId: string) => { const message = state.planDelivery(taskId, role); if (message) setError(message); else { setError(''); onClose(); } };
  return <Sheet open={open} onClose={onClose} title="Escolher entrega" eyebrow="Regra das 3 entregas">
    <Tabs label="Tipo de entrega" value={role} onChange={value => { setRole(value); setError(''); }} options={[{ value: 'magna', label: 'Prioridade Magna' }, { value: 'secundaria', label: 'Secundária' }]} />
    {error && <p role="alert" className="mt-4 rounded-2xl bg-lilas/25 p-3 text-sm font-semibold text-violeta dark:text-lilas">{error}</p>}
    <ul className="mt-5 grid gap-2">{candidates.map(task => <li key={task.id}><button type="button" onClick={() => choose(task.id)} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-line/10 px-4 py-3 text-left transition hover:border-magenta/40">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', role === 'magna' ? 'bg-magenta text-white' : 'bg-rosa text-magenta dark:bg-white/10')}>{role === 'magna' ? <Crown size={16} strokeWidth={1.75} /> : <Plus size={16} strokeWidth={1.75} />}</span>
      <span className="min-w-0 flex-1"><span className="block font-semibold">{task.title}</span><span className="block text-sm text-muted">{projectName(task.projectId)}{task.estimateMin ? ` · ${task.estimateMin} min` : ''}</span></span>
    </button></li>)}</ul>
    {!candidates.length && <p className="mt-5 text-ink-soft">Todas as tarefas abertas já estão no dia. Crie uma nova abaixo.</p>}
    <form className="mt-6 grid gap-3 rounded-3xl border border-dashed border-lilas/60 p-4" onSubmit={event => { event.preventDefault(); if (!title.trim()) return; const task = state.addTask({ title: title.trim(), projectId: projectId || undefined, estimateMin: Number(minutes) || undefined }); choose(task.id); setTitle(''); setMinutes(''); }}>
      <p className="font-semibold">Nova entrega física</p>
      <Input label="O que vai ficar pronto?" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Enviar a proposta para o fornecedor" />
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-2"><span className="text-sm font-semibold">Projeto</span><select value={projectId} onChange={event => setProjectId(event.target.value)} className="h-12 rounded-2xl border border-line/15 bg-white/80 px-3 text-sm font-medium dark:bg-white/5"><option value="">Sem projeto</option>{state.projects.filter(project => project.status === 'active').map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <Input label="Minutos" type="number" min={5} step={5} value={minutes} onChange={event => setMinutes(event.target.value)} placeholder="25" />
      </div>
      <Button type="submit" disabled={!title.trim()}>Criar e escolher</Button>
    </form>
  </Sheet>;
}
