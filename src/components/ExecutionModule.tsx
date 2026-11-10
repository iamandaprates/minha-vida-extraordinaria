import { useEffect, useState } from 'react';
import type { ExecutionView } from '../app/navigation';
import { originLabel } from '../domain/catalog';
import { fromISODate, toISODate, type LifeSnapshot, type Task } from '../domain/models';
import { areaOf, byRelevance, completionIndex, completionOf, daysBetween, formatDay, formatDue, formatTime, isDueByToday, isDueThisWeek, openTasks } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { AreaDot, AreaSelect, Dialog, EmptyState, Field, PageIntro, SectionHeading } from './ui';

/* ── Task line, shared by Central, Execução and Áreas ───────────────────── */

export function TaskLine({ task, snapshot, onToggle, onOpen, compact }: { task: Task; snapshot: LifeSnapshot; onToggle: () => void; onOpen?: () => void; compact?: boolean }) {
  const completion = completionOf(task.id, snapshot.executions);
  const area = areaOf(snapshot, task.areaId);
  const meta = [area?.name ?? 'Sem área', originLabel[task.origin], task.priority === 'high' ? 'Prioridade' : undefined].filter(Boolean).join(' · ');
  const when = completion ? `Concluída ${formatDay(completion.occurredAt).toLowerCase()} · ${formatTime(completion.occurredAt)}` : formatDue(task);
  const copy = <><small><AreaDot color={area?.color} />{meta}</small><strong>{task.title}</strong>{!compact && <span className={!completion && task.dueAt && daysBetween(new Date(), new Date(task.dueAt)) < 0 ? 'is-late' : ''}>{when}</span>}</>;
  return <div className={`task-line ${completion ? 'is-done' : ''} ${compact ? 'is-compact' : ''}`}>
    <button type="button" className="check" aria-label={`${completion ? 'Reabrir' : 'Concluir'} ${task.title}`} aria-pressed={Boolean(completion)} onClick={onToggle}>{completion ? '✓' : ''}</button>
    {onOpen ? <button type="button" className="task-copy" onClick={onOpen}>{copy}</button> : <div className="task-copy">{copy}</div>}
    {onOpen && <span className="task-arrow" aria-hidden="true">→</span>}
  </div>;
}

/* ── New action ─────────────────────────────────────────────────────────── */

export function TaskDialog({ onClose, defaults }: { onClose: () => void; defaults?: { areaId?: string; goalId?: string; projectId?: string; date?: string } }) {
  const { snapshot, addTask } = useLife();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState(defaults?.areaId ?? '');
  const [goalId, setGoalId] = useState(defaults?.goalId ?? '');
  const [date, setDate] = useState(defaults?.date ?? '');
  const [time, setTime] = useState('');
  const [high, setHigh] = useState(false);
  const submit = () => {
    if (!title.trim()) return;
    const goal = snapshot.goals.find(item => item.id === goalId);
    const due = date ? new Date(`${date}T${time || '12:00'}`) : undefined;
    addTask({ title, areaId: areaId || goal?.areaId || undefined, goalId: goalId || undefined, projectId: defaults?.projectId, dueAt: due?.toISOString(), dueHasTime: Boolean(date && time), priority: high ? 'high' : 'normal' });
    onClose();
  };
  return <Dialog eyebrow="NOVA AÇÃO" title="O que vai entrar em movimento?" onClose={onClose} onSubmit={submit} submitLabel="Adicionar ação">
    <Field label="Ação"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Estudar para a PRF · Bloco 2" /></Field>
    <div className="field-row"><Field label="Área"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} /></Field><Field label="Meta"><select value={goalId} onChange={event => setGoalId(event.target.value)}><option value="">Sem meta</option>{snapshot.goals.filter(goal => goal.status === 'active').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field></div>
    <div className="field-row"><Field label="Dia"><input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field><Field label="Horário"><input type="time" value={time} onChange={event => setTime(event.target.value)} disabled={!date} /></Field></div>
    <label className="toggle"><input type="checkbox" checked={high} onChange={event => setHigh(event.target.checked)} /><span>Prioridade</span></label>
  </Dialog>;
}

/* ── Focus session ──────────────────────────────────────────────────────── */

export function FocusSession({ task, onClose }: { task: Task; onClose: () => void }) {
  const { recordSession } = useLife();
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000); return () => clearInterval(timer); }, [startedAt]);
  const minutes = Math.floor(elapsed / 60000);
  const clock = `${String(minutes).padStart(2, '0')}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}`;
  const finish = (complete: boolean) => { recordSession(task.id, Math.round(elapsed / 60000), complete); onClose(); };
  return <Dialog eyebrow="SESSÃO DE FOCO" title={task.title} onClose={onClose}>
    <div className="focus-session"><div className="focus-clock" aria-live="polite">{clock}</div><p>{task.estimateMinutes ? `Planejado: ${task.estimateMinutes} minutos.` : 'Sem pressa. Um bloco de cada vez.'} O tempo só vira registro quando você encerra.</p></div>
    <div className="dialog-actions"><Button variant="primary" onClick={() => finish(true)}>Concluir ação ✓</Button><Button onClick={() => finish(false)}>Pausar e registrar tempo</Button><Button variant="ghost" onClick={onClose}>Descartar sessão</Button></div>
  </Dialog>;
}

/* ── Page ───────────────────────────────────────────────────────────────── */

const views: { key: ExecutionView; label: string }[] = [{ key: 'today', label: 'Meu dia' }, { key: 'week', label: 'Semana' }, { key: 'all', label: 'Tudo' }];

export function ExecutionModule({ view, onViewChange, onCapture }: { view: ExecutionView; onViewChange: (view: ExecutionView) => void; onCapture: () => void }) {
  const { snapshot, mode, toggleTaskCompletion } = useLife();
  const [taskOpen, setTaskOpen] = useState(false);
  const now = new Date();
  const pending = openTasks(snapshot);
  const visible = view === 'today' ? pending.filter(task => isDueByToday(task, now) || (!task.dueAt && task.priority === 'high')) : view === 'week' ? pending.filter(task => isDueThisWeek(task, now)) : pending;
  const completions = completionIndex(snapshot.executions);
  const done = snapshot.tasks.filter(task => completions.has(task.id)).sort((a, b) => completions.get(b.id)!.occurredAt.localeCompare(completions.get(a.id)!.occurredAt)).slice(0, 12);
  const groups = view === 'week' ? groupByDay(visible, now) : [{ key: 'list', label: '', tasks: visible }];
  const unscheduled = view === 'week' ? pending.filter(task => !task.dueAt).sort(byRelevance) : [];

  return <>
    <PageIntro eyebrow="ORGANIZAR" title="Execução" text="Tudo o que você planejou, venha de onde vier: demandas, ações das áreas, passos dos projetos e metas." action={<><Button onClick={onCapture}>Captura rápida</Button><Button variant="primary" onClick={() => setTaskOpen(true)}>Nova ação ＋</Button></>} />
    {mode === 'demo' && <p className="note">Modo demonstração. As alterações ficam somente nesta sessão.</p>}
    <div className="segmented" role="tablist">{views.map(item => <button key={item.key} type="button" role="tab" aria-selected={view === item.key} className={view === item.key ? 'selected' : ''} onClick={() => onViewChange(item.key)}>{item.label}</button>)}</div>
    {groups.map(group => <section key={group.key} className="task-group">{group.label && <h3 className="group-title">{group.label}</h3>}<Card className="task-list">{group.tasks.length ? group.tasks.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => toggleTaskCompletion(task.id)} />) : <EmptyState>{view === 'today' ? 'Nada pendente para hoje. Respire, isso também é movimento.' : 'Nada por aqui.'}</EmptyState>}</Card></section>)}
    {view === 'week' && <section className="task-group"><h3 className="group-title">Sem data · distribua na semana</h3><Card className="task-list">{unscheduled.length ? unscheduled.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => toggleTaskCompletion(task.id)} />) : <EmptyState>Todas as ações têm um dia.</EmptyState>}</Card></section>}
    {done.length > 0 && <><SectionHeading label="REALIZADO" title="O que já aconteceu" /><Card className="task-list">{done.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => toggleTaskCompletion(task.id)} />)}</Card><p className="fine-print">Concluir registra um fato com data e hora. Reabrir não apaga a história: cria um novo registro de correção.</p></>}
    {taskOpen && <TaskDialog onClose={() => setTaskOpen(false)} defaults={view === 'today' ? { date: toISODate(now) } : undefined} />}
  </>;
}

function groupByDay(tasks: Task[], now: Date) {
  const late = tasks.filter(task => daysBetween(now, new Date(task.dueAt!)) < 0);
  const days = Array.from({ length: 7 }, (_, offset) => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)));
  return [
    ...(late.length ? [{ key: 'late', label: 'Em atraso', tasks: late }] : []),
    ...days.map(day => ({ key: day, label: `${formatDay(day, now)} · ${new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(fromISODate(day))}`, tasks: tasks.filter(task => toISODate(new Date(task.dueAt!)) === day) }))
  ];
}
