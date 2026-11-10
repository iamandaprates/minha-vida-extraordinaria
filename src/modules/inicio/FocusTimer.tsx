import { Pause, Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deliveriesOf } from '../../lib/selectors';
import { formatClock, useFocus } from '../../store/useFocus';
import { useMive } from '../../store/useMive';
import { Button, GlassCard, Modal, ProgressRing, cn } from '../../ui';

export const SESSION_PRESETS = [5, 10, 15, 25, 50];

/** Atualiza a tela enquanto o timer roda e encerra sozinho ao chegar a zero. */
export function useFocusTick() {
  const status = useFocus(state => state.status);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => { const state = useFocus.getState(); if (state.elapsed() >= state.plannedMin * 60_000) state.finish(); setTick(value => value + 1); }, 500);
    return () => clearInterval(timer);
  }, [status]);
}

/** Timer de Foco: blocos de 5 a 50 min, anel animado, pausa sem culpa. */
export function FocusTimer() {
  useFocusTick();
  const focus = useFocus();
  const tasks = useMive(state => state.tasks);
  const deliveries = deliveriesOf({ tasks }).all.filter(task => !task.completedAt);
  const [minutes, setMinutes] = useState(25);
  const [target, setTarget] = useState('');
  const active = focus.status === 'running' || focus.status === 'paused';
  const planned = (active ? focus.plannedMin : minutes) * 60_000;
  const elapsed = active ? focus.elapsed() : 0;
  const chosen = deliveries.find(task => task.id === target) ?? deliveries[0];

  return <GlassCard className="grid justify-items-center gap-5 text-center">
    <div><p className="eyebrow">Timer de foco</p><h2 className="mt-1 text-xl">{active ? focus.label : minutes <= 15 ? 'Micro-sprint' : 'Foco profundo'}</h2></div>
    <ProgressRing value={active ? elapsed / planned : undefined} size={196} stroke={14} label="Tempo de foco">
      <span className="text-[42px] font-bold leading-none tracking-tight text-ink">{formatClock(planned - elapsed)}</span>
      <span className="mt-1 text-sm font-medium text-muted">{focus.status === 'paused' ? 'Pausado' : active ? 'Em foco' : `${minutes} minutos`}</span>
    </ProgressRing>
    {!active ? <>
      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Duração">{SESSION_PRESETS.map(value => <button key={value} type="button" role="radio" aria-checked={minutes === value} onClick={() => setMinutes(value)} className={cn('h-10 rounded-full px-4 text-sm font-semibold transition', minutes === value ? 'bg-grad-magenta text-white shadow-magenta' : 'border border-line/10 text-ink-soft hover:border-magenta/40')}>{value} min</button>)}</div>
      {deliveries.length > 0 && <label className="grid w-full gap-1 text-left"><span className="text-sm font-semibold">Focar em</span><select value={chosen?.id ?? ''} onChange={event => setTarget(event.target.value)} className="h-11 rounded-2xl border border-line/15 bg-white/80 px-3 text-sm font-medium dark:bg-white/5">{deliveries.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}<option value="free">Foco livre</option></select></label>}
      <button type="button" onClick={() => { const task = target === 'free' ? undefined : chosen; focus.start(task?.title ?? 'Foco livre', minutes, task?.id); }} className="grid h-16 w-16 place-items-center rounded-full bg-grad-magenta text-white shadow-magenta transition hover:scale-105 active:scale-95" aria-label="Iniciar sessão de foco"><Play size={26} strokeWidth={2} className="ml-1" /></button>
    </> : <>
      {focus.status === 'paused' && <p className="max-w-xs text-sm font-medium text-ink-soft">Pausar faz parte. Respire e volte quando estiver pronta: retomar já é uma vitória.</p>}
      <div className="flex gap-3">
        {focus.status === 'running' ? <Button variant="secondary" onClick={focus.pause}><Pause size={18} strokeWidth={1.75} /> Pausar</Button> : <Button onClick={focus.resume}><Play size={18} strokeWidth={1.75} /> Retomar</Button>}
        <Button variant="ghost" onClick={focus.finish}><Square size={16} strokeWidth={1.75} /> Encerrar</Button>
      </div>
    </>}
  </GlassCard>;
}

/** Fechamento da sessão: grava o tempo focado e, se for o caso, a conclusão. */
export function SessionEnd() {
  const focus = useFocus();
  const [completed, setCompleted] = useState(true);
  const minutes = Math.max(1, Math.round(focus.elapsedMs / 60_000));
  return <Modal open={focus.status === 'ended'} onClose={() => focus.close(false)} title={`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} de foco`} eyebrow="Sessão encerrada">
    <p className="text-ink-soft">{focus.label}{focus.pauses ? ` · ${focus.pauses} ${focus.pauses === 1 ? 'pausa' : 'pausas'} e você voltou.` : ' · sem interrupções.'}</p>
    {focus.taskId && <label className="mt-5 flex items-center gap-3 font-semibold"><input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} className="h-5 w-5 accent-magenta" /> Concluí esta entrega</label>}
    <div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => focus.close(true, completed)}>Salvar no histórico</Button><Button variant="ghost" onClick={() => focus.close(false)}>Descartar sessão</Button></div>
  </Modal>;
}
