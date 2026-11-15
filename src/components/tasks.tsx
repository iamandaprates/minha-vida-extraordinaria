import { AlertTriangle, ArrowRight, CalendarClock, Clock, Pin, PinOff } from 'lucide-react';
import { useState } from 'react';
import { originLabel, physicalActionIssue } from '../domain/catalog';
import { toISODate, type FocusRole, type LifeSnapshot, type Task } from '../domain/models';
import { areaOf, completionOf, formatDay, formatDue, formatTime, goalOfTask, isStalled, postponementsOf, todayFocus } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Icon } from './icons';
import { AreaSelect, CheckMark, Dialog, Field } from './ui';

const tomorrowAt = (task: Task) => { const base = new Date(); base.setDate(base.getDate() + 1); const due = task.dueAt ? new Date(task.dueAt) : undefined; base.setHours(due && task.dueHasTime ? due.getHours() : 12, due && task.dueHasTime ? due.getMinutes() : 0, 0, 0); return base.toISOString(); };

/** One planned action. Checking appends a completion fact; "Adiar" appends a postponement fact. */
export function TaskLine({ task, snapshot, compact, showFocus = true }: { task: Task; snapshot: LifeSnapshot; compact?: boolean; showFocus?: boolean }) {
  const { toggleTaskCompletion, postponeTask, setFocus } = useLife();
  const [pinOpen, setPinOpen] = useState(false);
  const completion = completionOf(task.id, snapshot.executions);
  const area = areaOf(snapshot, task.areaId);
  const goal = goalOfTask(snapshot, task);
  const stalled = isStalled(task, snapshot);
  const postponed = postponementsOf(task.id, snapshot.executions);
  const today = toISODate(new Date());
  const pinned = task.focusOn === today;
  const meta = [area?.name ?? 'Sem área', goal?.title ?? originLabel[task.origin], task.isMilestone ? 'Marco' : undefined, task.priority === 'high' ? 'Prioridade' : undefined].filter(Boolean).join(' · ');
  const when = completion ? `Concluída ${formatDay(completion.occurredAt).toLowerCase()} · ${formatTime(completion.occurredAt)}` : formatDue(task);
  return <div className={`task-line ${completion ? 'is-done' : ''} ${compact ? 'is-compact' : ''} ${stalled ? 'is-stalled' : ''}`}>
    <button type="button" className="check" aria-label={`${completion ? 'Reabrir' : 'Concluir'} ${task.title}`} aria-pressed={Boolean(completion)} onClick={() => toggleTaskCompletion(task.id)}><CheckMark done={Boolean(completion)} /></button>
    <div className="task-copy">
      <small><i className="area-dot" style={{ background: area?.color ?? 'var(--muted)' }} />{meta}</small>
      <strong>{task.title}</strong>
      {!compact && <span>{when}{task.estimateMinutes ? ` · ${task.estimateMinutes} min` : ''}{stalled ? '' : postponed ? ` · adiada ${postponed}x` : ''}</span>}
      {stalled && <span className="stalled-badge"><Icon as={AlertTriangle} size={13} /> Tarefa parada · adiada {postponed} vezes. Quebre em um passo menor.</span>}
    </div>
    {!completion && <div className="task-actions">
      {showFocus && <button type="button" className="icon-chip" onClick={() => pinned ? setFocus(task.id, undefined) : setPinOpen(true)} aria-label={pinned ? 'Tirar das entregas de hoje' : 'Escolher como entrega de hoje'} title={pinned ? 'Tirar das entregas de hoje' : 'Escolher como entrega de hoje'}><Icon as={pinned ? PinOff : Pin} size={15} /></button>}
      <button type="button" className="icon-chip" onClick={() => postponeTask(task.id, tomorrowAt(task))} aria-label={`Adiar ${task.title} para amanhã`} title="Adiar para amanhã"><Icon as={CalendarClock} size={15} /></button>
    </div>}
    {pinOpen && <FocusPinDialog task={task} onClose={() => setPinOpen(false)} />}
  </div>;
}

/** Choosing a delivery asks for a physical action, an estimate and its role: 1 magna + 2 secondary. */
export function FocusPinDialog({ task, onClose, role: initialRole }: { task: Task; onClose: () => void; role?: FocusRole }) {
  const { snapshot, setFocus, updateTask } = useLife();
  const focus = todayFocus(snapshot);
  const magnaFree = !focus.magna || focus.magna.id === task.id;
  const secondaryFree = focus.openSlots.secondary > 0 || focus.secondary.some(item => item.id === task.id);
  const [role, setRole] = useState<FocusRole>(initialRole ?? (magnaFree ? 'magna' : 'secondary'));
  const [title, setTitle] = useState(task.title);
  const [minutes, setMinutes] = useState(task.estimateMinutes ? String(task.estimateMinutes) : '');
  const issue = physicalActionIssue(title);
  const available = role === 'magna' ? magnaFree : secondaryFree;
  const value = Number(minutes);
  const submit = () => { if (issue || !available || !(value > 0)) return; if (title.trim() !== task.title) updateTask(task.id, { title: title.trim() }); setFocus(task.id, toISODate(new Date()), role, value); onClose(); };
  return <Dialog eyebrow="ENTREGAS DE HOJE" title="Uma entrega física, com tempo" onClose={onClose} onSubmit={submit} submitLabel={available ? 'Escolher como entrega →' : role === 'magna' ? 'A Prioridade Magna de hoje já foi escolhida' : 'As 2 secundárias de hoje já foram escolhidas'}>
    <div className="segmented" role="radiogroup" aria-label="Tipo de entrega">{(['magna', 'secondary'] as const).map(key => <button key={key} type="button" role="radio" aria-checked={role === key} className={role === key ? 'selected' : ''} onClick={() => setRole(key)}>{key === 'magna' ? 'Prioridade Magna' : 'Secundária'}</button>)}</div>
    <Field label="Entrega" hint={issue ?? 'Clara e física. Dá para saber exatamente quando terminou.'} tone={issue ? 'warn' : undefined}><input autoFocus value={title} onChange={event => setTitle(event.target.value)} /></Field>
    <Field label="Tempo estimado em minutos"><input type="number" min={5} max={480} step={5} value={minutes} onChange={event => setMinutes(event.target.value)} placeholder="Ex.: 50" /></Field>
  </Dialog>;
}

export function TaskDialog({ onClose, defaults }: { onClose: () => void; defaults?: { areaId?: string; goalId?: string; projectId?: string; date?: string; focus?: FocusRole } }) {
  const { snapshot, addTask, setFocus } = useLife();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState(defaults?.areaId ?? '');
  const [goalId, setGoalId] = useState(defaults?.goalId ?? '');
  const [projectId, setProjectId] = useState(defaults?.projectId ?? '');
  const [date, setDate] = useState(defaults?.date ?? '');
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState('');
  const [high, setHigh] = useState(false);
  const issue = title.trim() ? physicalActionIssue(title) : undefined;
  const submit = () => {
    if (!title.trim() || issue) return;
    const project = snapshot.projects.find(item => item.id === projectId);
    const goal = snapshot.goals.find(item => item.id === (goalId || project?.goalId));
    const due = date ? new Date(`${date}T${time || '12:00'}`) : undefined;
    const task = addTask({ title, areaId: areaId || project?.areaId || goal?.areaId || undefined, goalId: project ? undefined : goalId || undefined, projectId: projectId || undefined, dueAt: due?.toISOString(), dueHasTime: Boolean(date && time), priority: high ? 'high' : 'normal', estimateMinutes: Number(minutes) > 0 ? Number(minutes) : undefined });
    if (defaults?.focus && Number(minutes) > 0) setFocus(task.id, toISODate(new Date()), defaults.focus, Number(minutes));
    onClose();
  };
  return <Dialog eyebrow="PRÓXIMA AÇÃO FÍSICA" title="O que vai acontecer de fato?" onClose={onClose} onSubmit={submit} submitLabel="Adicionar ação →">
    <Field label="Ação" hint={issue ?? 'Verbo + o quê. Ex.: Enviar mensagem ao fornecedor de tecidos.'} tone={issue ? 'warn' : undefined}><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Resolver 30 questões de Direito Administrativo" /></Field>
    <div className="field-row"><Field label="Projeto"><select value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">Sem projeto</option>{snapshot.projects.filter(project => project.status === 'active').map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></Field><Field label="Meta"><select value={goalId} onChange={event => setGoalId(event.target.value)} disabled={Boolean(projectId)}><option value="">Sem meta</option>{snapshot.goals.filter(goal => goal.status === 'active').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field></div>
    <div className="field-row"><Field label="Área"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} /></Field><Field label="Minutos estimados"><input type="number" min={5} step={5} value={minutes} onChange={event => setMinutes(event.target.value)} placeholder="Ex.: 30" /></Field></div>
    <div className="field-row"><Field label="Dia"><input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field><Field label="Horário"><input type="time" value={time} onChange={event => setTime(event.target.value)} disabled={!date} /></Field></div>
    <label className="toggle"><input type="checkbox" checked={high} onChange={event => setHigh(event.target.checked)} /><span>Prioridade</span></label>
  </Dialog>;
}

export function MinutesPill({ minutes }: { minutes?: number }) { return minutes ? <span className="pill"><Icon as={Clock} size={13} />{minutes} min</span> : null; }
export function ArrowLabel({ children }: { children: string }) { return <>{children} <Icon as={ArrowRight} size={14} /></>; }
