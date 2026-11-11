import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Crown, Lightbulb, Pencil, Plus, Star, Target, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { areaName } from '../../data/areas';
import { todayISO } from '../../lib/dates';
import { deliveriesOf, ideasWithTag, isOpen, tasksOfProject } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import type { Goal, Task } from '../../types';
import { Button, GlassCard, Tag, cn } from '../../ui';
import { Page } from '../GuidePage';
import { GoalCard, GoalModal } from './GoalCard';
import { ProjectModal, statusLabel } from './ProjectModal';

export function ProjetoDetail() {
  const { id } = useParams();
  const state = useMive();
  const project = state.projects.find(item => item.id === id);
  const [editing, setEditing] = useState(false);
  const [goalModal, setGoalModal] = useState<{ goal?: Goal } | null>(null);
  if (!project) return <Navigate to="/projetos" replace />;
  const goals = state.goals.filter(goal => goal.projectId === project.id);

  return <Page>
    <Link to="/projetos" className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink-soft hover:text-magenta"><ArrowLeft size={18} strokeWidth={1.75} /> Projetos & Metas</Link>
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{areaName(project.areaId)}</p>
        <h1 className="mt-2 text-[32px] leading-[1.08] sm:text-[44px]">{project.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2"><Tag tone={project.status === 'active' ? 'magenta' : 'neutral'}>{statusLabel[project.status]}</Tag>{project.tag && <Tag tone="ciano">#{project.tag}</Tag>}</div>
      </div>
      <Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={16} strokeWidth={1.75} /> Editar projeto</Button>
    </header>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <TaskList projectId={project.id} />
      <div className="grid content-start gap-5">
        <section aria-labelledby="metas-projeto" className="grid gap-4">
          <div className="flex items-center justify-between"><h2 id="metas-projeto" className="flex items-center gap-2 text-lg font-semibold"><Target size={20} strokeWidth={1.5} className="text-magenta" /> Metas</h2><Button variant="ghost" size="sm" onClick={() => setGoalModal({})}><Plus size={16} strokeWidth={2} /> Meta</Button></div>
          {goals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={item => setGoalModal({ goal: item })} />)}
          {!goals.length && <GlassCard tone="rosa"><p className="text-sm text-ink-soft">Sem metas ligadas. Uma meta com marcos mostra o caminho até o resultado.</p></GlassCard>}
        </section>
        {project.tag && <IdeasPanel tag={project.tag} />}
      </div>
    </div>
    {editing && <ProjectModal project={project} onClose={() => setEditing(false)} />}
    {goalModal && <GoalModal goal={goalModal.goal} projectId={project.id} onClose={() => setGoalModal(null)} />}
  </Page>;
}

function TaskList({ projectId }: { projectId: string }) {
  const state = useMive();
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('');
  const [message, setMessage] = useState<string>();
  const tasks = tasksOfProject(state, projectId);
  const open = tasks.filter(isOpen);
  const done = tasks.filter(task => !isOpen(task));
  const { magna, secundarias } = deliveriesOf(state);
  const add = () => { if (!title.trim()) return; state.addTask({ title: title.trim(), projectId, estimateMin: Number(minutes) || undefined }); setTitle(''); setMinutes(''); };
  const promote = (task: Task, role: 'magna' | 'secundaria') => { const error = state.planDelivery(task.id, role); setMessage(error ?? (role === 'magna' ? 'Virou a Prioridade Magna de hoje. Vamos executar?' : 'Entrou nas entregas de hoje.')); };

  return <GlassCard className="grid content-start gap-4">
    <div><h2 className="text-lg font-semibold">Tarefas do projeto</h2><p className="text-sm text-ink-soft">Promova uma tarefa para as entregas de hoje: <Crown size={14} strokeWidth={1.75} className="inline text-magenta" /> Magna ou <Star size={14} strokeWidth={1.75} className="inline text-magenta" /> Secundária.</p></div>
    <form className="grid grid-cols-[1fr_88px_auto] items-end gap-2" onSubmit={event => { event.preventDefault(); add(); }}>
      <label className="grid gap-1.5"><span className="text-xs font-semibold">Nova tarefa física</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Verbo + objeto" className="h-11 min-w-0 rounded-2xl border border-line/15 bg-white/80 px-3 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" /></label>
      <label className="grid gap-1.5"><span className="text-xs font-semibold">Minutos</span><input type="number" min={5} step={5} value={minutes} onChange={event => setMinutes(event.target.value)} placeholder="25" className="h-11 min-w-0 rounded-2xl border border-line/15 bg-white/80 px-3 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" /></label>
      <Button type="submit" size="icon" aria-label="Adicionar tarefa" disabled={!title.trim()}><Plus size={18} strokeWidth={2} /></Button>
    </form>
    <AnimatePresence>{message && <motion.p key={message} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="rounded-2xl bg-rosa px-4 py-3 text-sm font-medium text-violeta dark:bg-magenta/15 dark:text-perola">{message}</motion.p>}</AnimatePresence>
    <ul className="grid gap-2">{open.map(task => {
      const today = task.plannedFor === todayISO() ? task.role : undefined;
      return <li key={task.id} className={cn('flex items-center gap-2 rounded-2xl border px-2 py-1.5', today ? 'border-magenta/40 bg-rosa/70 dark:bg-magenta/10' : 'border-line/10 bg-white/50 dark:bg-white/5')}>
        <button type="button" onClick={() => state.completeTask(task.id)} aria-label={`Concluir ${task.title}`} className="grid h-11 w-11 shrink-0 place-items-center"><span className="h-6 w-6 rounded-lg border-2 border-magenta/50" /></button>
        <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold leading-snug">{task.title}</p><p className="text-xs text-muted">{[task.estimateMin && `${task.estimateMin} min`, today === 'magna' && 'Prioridade Magna de hoje', today === 'secundaria' && 'Entrega secundária de hoje'].filter(Boolean).join(' · ') || 'Sem estimativa'}</p></div>
        {today ? <button type="button" onClick={() => { state.unplanDelivery(task.id); setMessage(undefined); }} title="Tirar das entregas de hoje" aria-label={`Tirar ${task.title} das entregas de hoje`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-magenta/10 hover:text-magenta"><X size={18} strokeWidth={1.75} /></button> : <>
          <button type="button" onClick={() => promote(task, 'magna')} disabled={Boolean(magna)} title={magna ? 'A Magna de hoje já foi escolhida' : 'Promover para Prioridade Magna'} aria-label={`Promover ${task.title} para Prioridade Magna`} className="grid h-11 w-11 place-items-center rounded-full text-magenta transition hover:bg-magenta/10 disabled:opacity-30"><Crown size={19} strokeWidth={1.75} /></button>
          <button type="button" onClick={() => promote(task, 'secundaria')} disabled={secundarias.length >= 2} title={secundarias.length >= 2 ? 'As 2 secundárias de hoje já estão definidas' : 'Promover para entrega secundária'} aria-label={`Promover ${task.title} para entrega secundária`} className="grid h-11 w-11 place-items-center rounded-full text-magenta transition hover:bg-magenta/10 disabled:opacity-30"><Star size={19} strokeWidth={1.75} /></button>
          <button type="button" onClick={() => state.deleteTask(task.id)} aria-label={`Excluir ${task.title}`} className="hidden h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta sm:grid"><Trash2 size={17} strokeWidth={1.75} /></button>
        </>}
      </li>;
    })}</ul>
    {!open.length && <p className="text-sm text-muted">Nenhuma tarefa aberta. Qual é o próximo passo físico?</p>}
    {done.length > 0 && <details className="group"><summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-ink-soft">Concluídas · {done.length}</summary>
      <ul className="grid gap-1">{done.map(task => <li key={task.id} className="flex items-center gap-2 text-sm text-muted">
        <button type="button" onClick={() => state.reopenTask(task.id)} aria-label={`Reabrir ${task.title}`} className="grid h-11 w-11 place-items-center"><span className="grid h-6 w-6 place-items-center rounded-lg bg-magenta text-white"><Check size={14} strokeWidth={2.75} /></span></button>
        <span className="line-through decoration-magenta/50">{task.title}</span>
      </li>)}</ul>
    </details>}
  </GlassCard>;
}

function IdeasPanel({ tag }: { tag: string }) {
  const state = useMive();
  const ideas = ideasWithTag(state, tag);
  const [draft, setDraft] = useState('');
  const add = () => { if (!draft.trim()) return; state.addIdea({ title: draft.trim(), tags: [tag] }); setDraft(''); };
  return <section aria-labelledby="ideias-projeto"><GlassCard className="grid gap-3">
    <h2 id="ideias-projeto" className="flex items-center gap-2 text-lg font-semibold"><Lightbulb size={20} strokeWidth={1.5} className="text-ciano" /> Ideias <Tag tone="ciano">#{tag}</Tag></h2>
    <ul className="grid gap-2">{ideas.map(idea => <li key={idea.id} className="rounded-2xl border border-ciano/30 bg-ciano/5 px-4 py-3"><p className="text-[15px] font-semibold">{idea.title}</p>{idea.description && <p className="mt-1 text-sm text-ink-soft">{idea.description}</p>}</li>)}</ul>
    {!ideas.length && <p className="text-sm text-muted">Toda ideia com #{tag} aparece aqui automaticamente.</p>}
    <form className="flex gap-2" onSubmit={event => { event.preventDefault(); add(); }}>
      <label className="sr-only" htmlFor="ideia-projeto">Nova ideia com #{tag}</label>
      <input id="ideia-projeto" value={draft} onChange={event => setDraft(event.target.value)} placeholder={`Capturar ideia #${tag}`} className="h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/70 px-4 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" />
      <Button type="submit" variant="secondary" size="icon" aria-label="Salvar ideia" disabled={!draft.trim()}><Plus size={18} strokeWidth={2} /></Button>
    </form>
  </GlassCard></section>;
}
