import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { Check, ChevronLeft, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { formatDay, fromISODate, hhmm, minutesOf, toISODate, todayISO } from '../../lib/dates';
import { blocksOn, deliveriesOf, isOpen } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import type { AgendaBlock, Task } from '../../types';
import { Button, GlassCard, Input, Modal, Tabs, cn } from '../../ui';
import { Page, PageHeader } from '../GuidePage';

type View = 'hoje' | 'semana' | 'mes';
const START_HOUR = 6; const END_HOUR = 23; const HOUR_PX = 64;
const weekOpts = { weekStartsOn: 1 as const };

export function AgendaPage() {
  const [view, setView] = useState<View>('hoje');
  const [day, setDay] = useState(todayISO());
  const [editing, setEditing] = useState<{ block?: AgendaBlock; date: string; start?: string; task?: Task } | null>(null);
  const date = fromISODate(day);
  const shift = (direction: 1 | -1) => setDay(toISODate(view === 'hoje' ? addDays(date, direction) : view === 'semana' ? addDays(date, 7 * direction) : addMonths(date, direction)));
  const title = view === 'hoje' ? formatDay(day) : view === 'semana' ? `${formatDay(startOfWeek(date, weekOpts), "d 'de' MMM")} a ${formatDay(endOfWeek(date, weekOpts), "d 'de' MMM")}` : formatDay(date, "MMMM 'de' yyyy");
  const openDay = (iso: string) => { setDay(iso); setView('hoje'); };

  return <Page>
    <PageHeader eyebrow="Agenda" title="Planejamento" subtitle="Cada bloco de tempo tem dono. Arraste uma tarefa para o horário em que ela vai acontecer." />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Tabs label="Visão da agenda" value={view} onChange={setView} options={[{ value: 'hoje', label: 'Hoje' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]} />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => shift(-1)} aria-label="Anterior" className="grid h-11 w-11 place-items-center rounded-full border border-line/10 hover:text-magenta"><ChevronLeft size={20} strokeWidth={1.75} /></button>
        <span className="min-w-[150px] text-center text-sm font-semibold first-letter:uppercase">{title}</span>
        <button type="button" onClick={() => shift(1)} aria-label="Próximo" className="grid h-11 w-11 place-items-center rounded-full border border-line/10 hover:text-magenta"><ChevronRight size={20} strokeWidth={1.75} /></button>
        <Button variant="ghost" size="sm" onClick={() => setDay(todayISO())}>Hoje</Button>
      </div>
    </div>
    {view === 'hoje' && <DayView day={day} onEdit={setEditing} />}
    {view === 'semana' && <WeekView day={day} onOpenDay={openDay} />}
    {view === 'mes' && <MonthView day={day} onOpenDay={openDay} />}
    <button type="button" onClick={() => setEditing({ date: day })} className="fixed bottom-28 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-grad-magenta text-white shadow-magenta transition hover:scale-105 md:bottom-8 md:right-8" aria-label="Novo bloco na agenda"><Plus size={26} strokeWidth={2} /></button>
    {editing && <BlockModal {...editing} onClose={() => setEditing(null)} />}
  </Page>;
}

function DayView({ day, onEdit }: { day: string; onEdit: (value: { block?: AgendaBlock; date: string; start?: string; task?: Task }) => void }) {
  const state = useMive();
  const blocks = blocksOn(state, day);
  const scheduled = new Set(state.blocks.filter(block => block.date === day && block.taskId).map(block => block.taskId));
  const deliveries = deliveriesOf(state).all.filter(isOpen);
  const candidates = [...deliveries, ...state.tasks.filter(task => isOpen(task) && !deliveries.includes(task))].filter(task => !scheduled.has(task.id));
  const [over, setOver] = useState<number | null>(null);
  const now = new Date();
  const nowTop = day === todayISO() ? (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_PX : -1;

  const dropAt = (event: DragEvent<HTMLDivElement>, hour: number) => {
    event.preventDefault(); setOver(null);
    const half = event.nativeEvent.offsetY > HOUR_PX / 2 ? 30 : 0;
    const start = hhmm(hour * 60 + half);
    const blockId = event.dataTransfer.getData('mive/block');
    const taskId = event.dataTransfer.getData('mive/task');
    if (blockId) state.updateBlock(blockId, { start, date: day });
    else if (taskId) { const task = state.tasks.find(item => item.id === taskId); if (task) state.addBlock({ title: task.title, date: day, start, durationMin: task.estimateMin ?? 30, taskId: task.id }); }
  };

  return <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
    <GlassCard padded={false} className="overflow-hidden">
      <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_PX }}>
        {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => { const hour = START_HOUR + index; return <div key={hour} onDragOver={event => { event.preventDefault(); setOver(hour); }} onDragLeave={() => setOver(current => current === hour ? null : current)} onDrop={event => dropAt(event, hour)} onDoubleClick={() => onEdit({ date: day, start: hhmm(hour * 60) })} className={cn('absolute inset-x-0 border-t border-line/10 pl-16 transition', over === hour && 'bg-magenta/10')} style={{ top: index * HOUR_PX, height: HOUR_PX }}>
          <span className="absolute left-3 top-1.5 text-xs font-semibold tabular-nums text-muted">{hhmm(hour * 60)}</span>
        </div>; })}
        {nowTop > 0 && <div className="pointer-events-none absolute left-14 right-2 z-10 h-0.5 bg-magenta shadow-magenta" style={{ top: nowTop }}><span className="absolute -left-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-magenta" /></div>}
        {blocks.map(block => { const top = (minutesOf(block.start) / 60 - START_HOUR) * HOUR_PX; const height = Math.max(44, (block.durationMin / 60) * HOUR_PX - 4); const compact = block.durationMin < 45; return <div key={block.id} draggable onDragStart={event => event.dataTransfer.setData('mive/block', block.id)} className={cn('absolute left-16 right-2 z-[5] flex cursor-grab items-start gap-2 overflow-hidden rounded-2xl border px-2 py-1.5 shadow-glass active:cursor-grabbing', block.doneAt ? 'border-magenta/30 bg-rosa/90 dark:bg-magenta/20' : 'border-white/70 bg-white/90 dark:border-lilas/20 dark:bg-violeta/60')} style={{ top: Math.max(0, top) + 2, height }}>
          <button type="button" onClick={() => state.toggleBlock(block.id)} aria-pressed={Boolean(block.doneAt)} aria-label={`${block.doneAt ? 'Reabrir' : 'Concluir'} ${block.title}`} className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2', block.doneAt ? 'border-magenta bg-magenta text-white' : 'border-magenta/50')}>{block.doneAt && <Check size={15} strokeWidth={2.5} />}</button>
          <button type="button" onClick={() => onEdit({ block, date: block.date })} className={cn('min-w-0 flex-1 text-left', compact && 'flex items-baseline gap-2 pt-1')}><span className={cn('block truncate text-sm font-semibold', block.doneAt && 'text-muted line-through decoration-magenta/50')}>{block.title}</span><span className="block shrink-0 text-xs text-muted">{block.start} a {hhmm(minutesOf(block.start) + block.durationMin)}</span></button>
        </div>; })}
      </div>
    </GlassCard>
    <GlassCard className="order-first content-start lg:order-none lg:sticky lg:top-28 lg:self-start">
      <p className="eyebrow">Tarefas para encaixar</p>
      <p className="mt-1 text-sm text-ink-soft"><span className="hidden md:inline">Arraste para um horário. </span>Toque para escolher a hora.</p>
      <ul className="mt-4 grid max-h-[240px] gap-2 overflow-y-auto lg:max-h-[420px]">{candidates.map(task => <li key={task.id}><button type="button" draggable onDragStart={event => event.dataTransfer.setData('mive/task', task.id)} onClick={() => onEdit({ date: day, task })} className="flex min-h-[48px] w-full cursor-grab items-center gap-2 rounded-2xl border border-line/10 bg-white/60 px-3 py-2 text-left text-sm font-semibold transition hover:border-magenta/40 dark:bg-white/5">
        <GripVertical size={16} strokeWidth={1.75} className="shrink-0 text-muted" /><span className="flex-1">{task.title}</span>{task.estimateMin && <span className="text-xs font-medium text-muted">{task.estimateMin} min</span>}
      </button></li>)}</ul>
      {!candidates.length && <p className="mt-4 text-sm text-muted">Nada pendente para encaixar.</p>}
    </GlassCard>
  </div>;
}

function WeekView({ day, onOpenDay }: { day: string; onOpenDay: (iso: string) => void }) {
  const state = useMive();
  const days = eachDayOfInterval({ start: startOfWeek(fromISODate(day), weekOpts), end: endOfWeek(fromISODate(day), weekOpts) });
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">{days.map(date => { const iso = toISODate(date); const blocks = blocksOn(state, iso); return <GlassCard key={iso} padded={false} className={cn('p-3', iso === todayISO() && 'ring-2 ring-magenta/50')}>
    <button type="button" onClick={() => onOpenDay(iso)} className="mb-2 flex w-full items-baseline justify-between rounded-xl px-1 text-left"><span className="text-sm font-semibold capitalize">{formatDay(date, 'EEE')}</span><span className={cn('text-xl font-bold', iso === todayISO() && 'text-magenta')}>{formatDay(date, 'd')}</span></button>
    <ul className="grid gap-1.5">{blocks.map(block => <li key={block.id} className="flex items-center gap-2 rounded-xl bg-white/60 px-2 py-1.5 text-xs dark:bg-white/5">
      <button type="button" onClick={() => state.toggleBlock(block.id)} aria-label={`${block.doneAt ? 'Reabrir' : 'Concluir'} ${block.title}`} className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md border-2', block.doneAt ? 'border-magenta bg-magenta text-white' : 'border-magenta/50')}>{block.doneAt && <Check size={13} strokeWidth={2.5} />}</button>
      <span className="min-w-0"><span className="block font-semibold tabular-nums text-muted">{block.start}</span><span className={cn('block truncate font-semibold', block.doneAt && 'line-through opacity-60')}>{block.title}</span></span>
    </li>)}</ul>
    {!blocks.length && <p className="px-1 text-xs text-muted">Livre</p>}
  </GlassCard>; })}</div>;
}

function MonthView({ day, onOpenDay }: { day: string; onOpenDay: (iso: string) => void }) {
  const state = useMive();
  const base = fromISODate(day);
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(base), weekOpts), end: endOfWeek(endOfMonth(base), weekOpts) });
  return <GlassCard padded={false} className="p-3 sm:p-5">
    <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wider text-muted">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(label => <span key={label}>{label}</span>)}</div>
    <div className="grid grid-cols-7 gap-1 sm:gap-2">{days.map(date => { const iso = toISODate(date); const blocks = blocksOn(state, iso); const done = blocks.filter(block => block.doneAt).length; return <button key={iso} type="button" onClick={() => onOpenDay(iso)} className={cn('grid min-h-[56px] content-start justify-items-center gap-1 rounded-2xl p-1.5 transition hover:bg-rosa/70 sm:min-h-[84px] dark:hover:bg-white/5', !isSameMonth(date, base) && 'opacity-40', iso === todayISO() && 'bg-rosa dark:bg-magenta/15')} aria-label={`${formatDay(date)} · ${blocks.length} blocos`}>
      <span className={cn('text-sm font-semibold', iso === todayISO() && 'text-magenta')}>{formatDay(date, 'd')}</span>
      {blocks.length > 0 && <span className="flex flex-wrap justify-center gap-0.5">{blocks.slice(0, 4).map(block => <i key={block.id} className={cn('h-1.5 w-1.5 rounded-full', block.doneAt ? 'bg-magenta' : 'bg-lilas')} />)}</span>}
      {blocks.length > 0 && <span className="hidden text-[11px] font-medium text-muted sm:block">{done}/{blocks.length}</span>}
    </button>; })}</div>
  </GlassCard>;
}

function BlockModal({ block, date, start, task, onClose }: { block?: AgendaBlock; date: string; start?: string; task?: Task; onClose: () => void }) {
  const state = useMive();
  const [title, setTitle] = useState(block?.title ?? task?.title ?? '');
  const [day, setDay] = useState(block?.date ?? date);
  const [time, setTime] = useState(block?.start ?? start ?? '09:00');
  const [minutes, setMinutes] = useState(String(block?.durationMin ?? task?.estimateMin ?? 30));
  const [taskId, setTaskId] = useState(block?.taskId ?? task?.id ?? '');
  const save = () => {
    if (!title.trim() || !day || !time) return;
    const draft = { title: title.trim(), date: day, start: time, durationMin: Math.max(5, Number(minutes) || 30), taskId: taskId || undefined };
    if (block) state.updateBlock(block.id, draft); else state.addBlock(draft);
    onClose();
  };
  return <Modal open onClose={onClose} title={block ? 'Editar bloco' : task ? 'Encaixar na agenda' : 'Novo bloco'} eyebrow="Agenda">
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); save(); }}>
      <Input label="O que vai acontecer" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Treino · pernas" autoFocus={!task} />
      <div className="grid grid-cols-3 gap-3"><Input label="Dia" type="date" value={day} onChange={event => setDay(event.target.value)} /><Input label="Início" type="time" value={time} onChange={event => setTime(event.target.value)} /><Input label="Minutos" type="number" min={5} step={5} value={minutes} onChange={event => setMinutes(event.target.value)} /></div>
      <label className="grid gap-2"><span className="text-sm font-semibold">Tarefa ligada</span><select value={taskId} onChange={event => { setTaskId(event.target.value); const linked = state.tasks.find(item => item.id === event.target.value); if (linked && !title.trim()) setTitle(linked.title); }} className="h-12 rounded-2xl border border-line/15 bg-white/80 px-3 font-medium dark:bg-white/5"><option value="">Nenhuma</option>{state.tasks.filter(item => isOpen(item) || item.id === taskId).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!title.trim()}>{block ? 'Salvar' : 'Adicionar à agenda'}</Button>{block && <Button variant="ghost" onClick={() => { state.deleteBlock(block.id); onClose(); }}><Trash2 size={16} strokeWidth={1.75} /> Remover</Button>}</div>
    </form>
  </Modal>;
}
