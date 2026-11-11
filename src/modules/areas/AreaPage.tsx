import { ArrowLeft, ArrowRight, BookOpen, Check, Flame, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { areaTools, type AreaSection } from '../../data/areaTools';
import { areas } from '../../data/areas';
import { formatDay, todayISO } from '../../lib/dates';
import { habitDone, habitStreak } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import type { AreaId, Goal } from '../../types';
import { Button, GlassCard, cn } from '../../ui';
import { Page } from '../GuidePage';
import { FinancasPanel } from '../financas/FinancasPanel';
import { GoalCard, GoalModal } from '../projetos/GoalCard';
import { SaudePanel } from '../saude/SaudePanel';
import { RituaisPanel } from './RituaisPanel';

const inputClass = 'h-11 min-w-0 rounded-2xl border border-line/15 bg-white/70 px-4 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5';

export function AreaPage() {
  const { id } = useParams();
  const area = areas.find(item => item.id === id);
  if (!area) return <Navigate to="/areas" replace />;
  const tool = areaTools[area.id];
  return <Page>
    <Link to="/areas" className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink-soft hover:text-magenta"><ArrowLeft size={18} strokeWidth={1.75} /> Áreas da Vida</Link>
    <header className="mb-6 flex items-center gap-4">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-grad-magenta text-white shadow-magenta"><area.icon size={26} strokeWidth={1.5} /></span>
      <div><h1 className="text-[30px] leading-[1.08] sm:text-[40px]">{area.name}</h1><p className="mt-1 text-ink-soft">{tool.tagline}</p></div>
    </header>
    <div className="grid gap-5">
      {area.id === 'financeiro' && <FinancasPanel />}
      {area.id === 'saude' && <SaudePanel />}
      {area.id === 'bem-estar' && <RituaisPanel />}
      {area.id === 'intelectual' && <Link to="/estudos" className="group block rounded-3xl"><GlassCard tone="rosa" className="flex items-center gap-4"><BookOpen size={26} strokeWidth={1.5} className="text-magenta" /><div className="flex-1"><p className="font-semibold">Estudos e flashcards</p><p className="text-sm text-ink-soft">Trilhas PRF, Administração e Inglês com revisão espaçada.</p></div><ArrowRight size={20} strokeWidth={1.75} className="text-magenta transition group-hover:translate-x-1" /></GlassCard></Link>}
      <HabitsPanel areaId={area.id} label={tool.habitsLabel} />
      {tool.sections.length > 0 && <div className="grid gap-5 lg:grid-cols-2">{tool.sections.map(section => <SectionCard key={section.key} areaId={area.id} section={section} />)}</div>}
      <AreaGoals areaId={area.id} />
    </div>
  </Page>;
}

/** Hábitos da área com check de hoje e sequência de dias. */
function HabitsPanel({ areaId, label }: { areaId: AreaId; label?: string }) {
  const state = useMive();
  const [title, setTitle] = useState('');
  const habits = state.habits.filter(habit => habit.areaId === areaId);
  if (!label && !habits.length) return null;
  return <GlassCard className="grid gap-4">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles size={20} strokeWidth={1.5} className="text-magenta" /> {label ?? 'Hábitos'}</h2>
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{habits.map(habit => { const done = habitDone(state, habit.id); const streak = habitStreak(state, habit.id); return <li key={habit.id} className={cn('group flex items-center gap-2 rounded-2xl border px-2 py-1.5 transition', done ? 'border-magenta/40 bg-rosa/70 dark:bg-magenta/10' : 'border-line/10 bg-white/50 dark:bg-white/5')}>
      <button type="button" onClick={() => state.toggleHabit(habit.id)} aria-pressed={done} aria-label={`${done ? 'Desmarcar' : 'Marcar'} ${habit.title} hoje`} className="grid h-11 w-11 shrink-0 place-items-center"><span className={cn('grid h-7 w-7 place-items-center rounded-lg border-2 transition', done ? 'border-magenta bg-magenta text-white' : 'border-magenta/50')}>{done && <Check size={15} strokeWidth={2.5} />}</span></button>
      <span className="flex-1 text-[15px] font-semibold">{habit.title}</span>
      <span className={cn('flex items-center gap-1 text-sm font-bold tabular-nums', streak ? 'text-magenta' : 'text-muted')} title="Dias seguidos"><Flame size={16} strokeWidth={1.75} />{streak}</span>
      <button type="button" onClick={() => state.deleteHabit(habit.id)} aria-label={`Remover hábito ${habit.title}`} className="grid h-11 w-9 place-items-center text-muted opacity-60 hover:text-magenta hover:opacity-100"><Trash2 size={15} strokeWidth={1.75} /></button>
    </li>; })}</ul>
    <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (!title.trim()) return; state.addHabit(title, areaId); setTitle(''); }}>
      <label className="sr-only" htmlFor={`habito-${areaId}`}>Novo hábito</label>
      <input id={`habito-${areaId}`} value={title} onChange={event => setTitle(event.target.value)} placeholder="Nova prática diária" className={cn(inputClass, 'flex-1')} />
      <Button type="submit" variant="secondary" size="icon" aria-label="Adicionar hábito" disabled={!title.trim()}><Plus size={18} strokeWidth={2} /></Button>
    </form>
  </GlassCard>;
}

/** Uma ferramenta da área: lista com check ou registro datado. */
function SectionCard({ areaId, section }: { areaId: AreaId; section: AreaSection }) {
  const state = useMive();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState(section.mode === 'log' ? todayISO() : '');
  const entries = state.areaEntries.filter(entry => entry.areaId === areaId && entry.section === section.key);
  const sorted = section.mode === 'log' ? [...entries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')) : [...entries].sort((a, b) => Number(Boolean(a.doneAt)) - Number(Boolean(b.doneAt)) || (a.date ?? '9').localeCompare(b.date ?? '9'));
  const datedForm = section.mode === 'log' || section.withDate;
  const add = () => { if (!title.trim()) return; state.addAreaEntry({ areaId, section: section.key, title: title.trim(), body: body.trim() || undefined, date: date || undefined }); setTitle(''); setBody(''); if (section.mode !== 'log') setDate(''); };
  return <GlassCard className="grid content-start gap-4">
    <h2 className="text-lg font-semibold">{section.label}</h2>
    <form className="grid gap-2" onSubmit={event => { event.preventDefault(); add(); }}>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`${areaId}-${section.key}`}>{section.label}</label>
        <input id={`${areaId}-${section.key}`} value={title} onChange={event => setTitle(event.target.value)} placeholder={section.placeholder} className={cn(inputClass, 'flex-1')} />
        <Button type="submit" size="icon" aria-label={`Adicionar em ${section.label}`} disabled={!title.trim()}><Plus size={18} strokeWidth={2} /></Button>
      </div>
      {title.trim() && (section.bodyLabel || datedForm) && <div className="grid gap-2 sm:grid-cols-[1fr_170px]">
        {section.bodyLabel ? <label className="grid gap-1"><span className="text-xs font-semibold">{section.bodyLabel}</span><textarea value={body} onChange={event => setBody(event.target.value)} rows={2} className="rounded-2xl border border-line/15 bg-white/70 px-3 py-2 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" /></label> : <span />}
        {datedForm && <label className="grid content-start gap-1"><span className="text-xs font-semibold">Data</span><input type="date" value={date} onChange={event => setDate(event.target.value)} className={inputClass} /></label>}
      </div>}
    </form>
    <ul className="grid gap-2">{sorted.map(entry => <li key={entry.id} className="flex items-start gap-2 rounded-2xl border border-line/10 bg-white/50 px-2 py-2 dark:bg-white/5">
      {section.mode === 'list' ? <button type="button" onClick={() => state.updateAreaEntry(entry.id, { doneAt: entry.doneAt ? undefined : new Date().toISOString() })} aria-pressed={Boolean(entry.doneAt)} aria-label={`${entry.doneAt ? 'Desmarcar' : 'Marcar'} ${entry.title}${section.checkLabel ? ` como ${section.checkLabel}` : ''}`} className="grid h-11 w-11 shrink-0 place-items-center"><span className={cn('grid h-6 w-6 place-items-center rounded-lg border-2', entry.doneAt ? 'border-magenta bg-magenta text-white' : 'border-magenta/50')}>{entry.doneAt && <Check size={14} strokeWidth={2.75} />}</span></button>
        : <span className="grid w-11 shrink-0 justify-items-center pt-1 text-center leading-tight"><span className="text-lg font-bold">{entry.date ? formatDay(entry.date, 'd') : '·'}</span><span className="text-[11px] font-semibold uppercase text-muted">{entry.date ? formatDay(entry.date, 'MMM') : ''}</span></span>}
      <div className="min-w-0 flex-1 py-1.5"><p className={cn('text-[15px] font-semibold leading-snug', entry.doneAt && 'text-muted line-through decoration-magenta/50')}>{entry.title}</p>
        {section.mode === 'list' && entry.date && <p className="text-xs font-medium text-magenta">{formatDay(entry.date, "d 'de' MMMM 'de' yyyy")}</p>}
        {entry.body && <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{entry.body}</p>}</div>
      <button type="button" onClick={() => state.deleteAreaEntry(entry.id)} aria-label={`Excluir ${entry.title}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:text-magenta"><Trash2 size={15} strokeWidth={1.75} /></button>
    </li>)}</ul>
    {!sorted.length && <p className="text-sm text-muted">Comece com um registro curto. Pequeno e feito vale mais que perfeito e parado.</p>}
  </GlassCard>;
}

function AreaGoals({ areaId }: { areaId: AreaId }) {
  const state = useMive();
  const [modal, setModal] = useState<{ goal?: Goal } | null>(null);
  const goals = state.goals.filter(goal => goal.areaId === areaId);
  const projects = state.projects.filter(project => project.areaId === areaId);
  return <section aria-labelledby={`metas-${areaId}`} className="grid gap-4">
    <div className="flex items-center justify-between"><h2 id={`metas-${areaId}`} className="flex items-center gap-2 text-lg font-semibold"><Target size={20} strokeWidth={1.5} className="text-magenta" /> Metas e projetos da área</h2><Button variant="ghost" size="sm" onClick={() => setModal({})}><Plus size={16} strokeWidth={2} /> Meta</Button></div>
    {projects.length > 0 && <div className="flex flex-wrap gap-2">{projects.map(project => <Link key={project.id} to={`/projetos/${project.id}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ciano/40 bg-ciano/10 px-4 text-sm font-semibold hover:border-ciano">{project.name} <ArrowRight size={15} strokeWidth={1.75} /></Link>)}</div>}
    {goals.length ? <div className="grid gap-4 lg:grid-cols-2">{goals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={item => setModal({ goal: item })} />)}</div>
      : <GlassCard tone="rosa"><p className="text-sm text-ink-soft">Nenhuma meta nesta área ainda. Uma meta com dois marcos já dá direção.</p></GlassCard>}
    {modal && <GoalModal goal={modal.goal} areaId={areaId} onClose={() => setModal(null)} />}
  </section>;
}
