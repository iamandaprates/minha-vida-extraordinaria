import { Pause, Play, Square, Timer } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { toISODate } from '../domain/models';
import { isTaskCompleted, todayFocus } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './icons';
import { Dialog, Field } from './ui';

/**
 * Modo Execução. The timer lives above the pages, so it keeps running across guides.
 * Nothing is recorded while it runs: minutes become a fact only when the session ends.
 */
export interface TimerTarget { kind: 'task' | 'study' | 'free'; id?: string; label: string; }
interface TimerState { target?: TimerTarget; durationMinutes: number; startedAt?: number; elapsedBefore: number; running: boolean; ended: boolean; }
interface TimerApi extends TimerState { remainingMs: number; elapsedMs: number; start(target: TimerTarget, minutes?: number): void; pause(): void; resume(): void; stop(): void; reset(): void; }

const TimerContext = createContext<TimerApi | null>(null);
export const DEFAULT_SESSION_MINUTES = 50;
export const formatClock = (ms: number) => { const total = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; };

export function FocusTimerProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<TimerState>({ durationMinutes: DEFAULT_SESSION_MINUTES, elapsedBefore: 0, running: false, ended: false });
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { if (!state.running) return; const timer = setInterval(() => setTick(Date.now()), 500); return () => clearInterval(timer); }, [state.running]);
  const elapsedMs = state.elapsedBefore + (state.running && state.startedAt ? tick - state.startedAt : 0);
  const remainingMs = state.durationMinutes * 60_000 - elapsedMs;
  useEffect(() => { if (state.running && remainingMs <= 0) setState(current => ({ ...current, running: false, ended: true, elapsedBefore: current.durationMinutes * 60_000, startedAt: undefined })); }, [remainingMs, state.running]);

  const start = useCallback((target: TimerTarget, minutes = DEFAULT_SESSION_MINUTES) => { const now = Date.now(); setTick(now); setState({ target, durationMinutes: minutes, startedAt: now, elapsedBefore: 0, running: true, ended: false }); }, []);
  const pause = useCallback(() => setState(current => current.running && current.startedAt ? { ...current, running: false, elapsedBefore: current.elapsedBefore + Date.now() - current.startedAt, startedAt: undefined } : current), []);
  const resume = useCallback(() => { const now = Date.now(); setTick(now); setState(current => current.target && !current.running ? { ...current, running: true, startedAt: now } : current); }, []);
  const stop = useCallback(() => setState(current => ({ ...current, running: false, ended: true, elapsedBefore: current.elapsedBefore + (current.running && current.startedAt ? Date.now() - current.startedAt : 0), startedAt: undefined })), []);
  const reset = useCallback(() => setState({ durationMinutes: DEFAULT_SESSION_MINUTES, elapsedBefore: 0, running: false, ended: false }), []);
  const api = useMemo<TimerApi>(() => ({ ...state, elapsedMs, remainingMs, start, pause, resume, stop, reset }), [state, elapsedMs, remainingMs, start, pause, resume, stop, reset]);
  return <TimerContext.Provider value={api}>{children}{state.ended && state.target && <SessionEndDialog />}</TimerContext.Provider>;
}

export function useFocusTimer(): TimerApi {
  const timer = useContext(TimerContext);
  if (!timer) throw new Error('useFocusTimer precisa estar dentro de <FocusTimerProvider>.');
  return timer;
}

/** End of session: the minutes, the questions (for study) and the completion become facts. */
function SessionEndDialog() {
  const { target, elapsedMs, reset } = useFocusTimer();
  const { snapshot, recordSession, addStudySession } = useLife();
  const minutes = Math.max(1, Math.round(elapsedMs / 60_000));
  const [questions, setQuestions] = useState('');
  const [correct, setCorrect] = useState('');
  const [complete, setComplete] = useState(true);
  if (!target) return null;
  const subject = target.kind === 'study' ? snapshot.studySubjects.find(item => item.id === target.id) : undefined;
  const save = () => {
    if (target.kind === 'study' && subject) addStudySession({ subjectId: subject.id, minutes, questions: Number(questions) || undefined, correct: Number(questions) ? Math.min(Number(correct) || 0, Number(questions)) : undefined, date: toISODate(new Date()) });
    else recordSession({ taskId: target.kind === 'task' ? target.id : undefined, minutes }, target.kind === 'task' && complete);
    reset();
  };
  return <Dialog eyebrow="SESSÃO ENCERRADA" title={`${minutes} min em ${target.label}`} onClose={reset} onSubmit={save} submitLabel="Salvar no histórico →">
    {target.kind === 'study' && <div className="field-row"><Field label="Questões resolvidas"><input type="number" min={0} value={questions} onChange={event => setQuestions(event.target.value)} placeholder="0" /></Field><Field label="Acertos"><input type="number" min={0} value={correct} onChange={event => setCorrect(event.target.value)} placeholder="0" /></Field></div>}
    {target.kind === 'task' && <label className="toggle"><input type="checkbox" checked={complete} onChange={event => setComplete(event.target.checked)} /><span>Concluí esta ação</span></label>}
    <p className="fine-print">Fechar sem salvar descarta a sessão. Salvar grava os minutos como um registro do que aconteceu.</p>
  </Dialog>;
}

/** Timer card used on Início and Estudos. */
export function TimerCard({ defaultTrack }: { defaultTrack?: 'prf' | 'english' }) {
  const timer = useFocusTimer();
  const { snapshot } = useLife();
  const focus = todayFocus(snapshot);
  const options = [
    ...focus.pinned.filter(task => !isTaskCompleted(task.id, snapshot.executions)).map(task => ({ value: `task:${task.id}`, label: task.title, target: { kind: 'task' as const, id: task.id, label: task.title } })),
    ...snapshot.studySubjects.filter(subject => !defaultTrack || subject.track === defaultTrack).map(subject => ({ value: `study:${subject.id}`, label: `${subject.track === 'prf' ? 'PRF' : 'Inglês'} · ${subject.name}`, target: { kind: 'study' as const, id: subject.id, label: subject.name } })),
    { value: 'free', label: 'Foco livre', target: { kind: 'free' as const, label: 'foco livre' } }
  ];
  const [choice, setChoice] = useState(options[0]?.value ?? 'free');
  const [minutes, setMinutes] = useState(DEFAULT_SESSION_MINUTES);
  const active = Boolean(timer.target) && !timer.ended;
  const total = (active ? timer.durationMinutes : minutes) * 60_000;
  const remaining = active ? timer.remainingMs : total;
  const ratio = Math.min(1, Math.max(0, 1 - remaining / total));
  const radius = 64; const circumference = 2 * Math.PI * radius;
  return <Card className="timer-card">
    <div className="card-head"><div><span className="label">MODO EXECUÇÃO</span><h2>{active ? timer.target!.label : 'Foco profundo'}</h2></div><Icon as={Timer} size={20} /></div>
    <div className="timer-body">
      <div className={`timer-dial ${timer.running ? 'is-running' : ''}`}>
        <svg viewBox="0 0 150 150" aria-hidden="true"><circle className="ring-track" cx="75" cy="75" r={radius} strokeWidth="8" /><circle className="ring-value timer-value" cx="75" cy="75" r={radius} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} transform="rotate(-90 75 75)" /></svg>
        <b aria-live="polite">{formatClock(remaining)}</b>
      </div>
      <div className="timer-controls">
        {!active ? <>
          <Field label="No que você vai focar"><select value={choice} onChange={event => setChoice(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <div className="chip-row">{[25, 50, 90].map(value => <button key={value} type="button" className={`chip ${minutes === value ? 'selected' : ''}`} onClick={() => setMinutes(value)}>{value} min</button>)}</div>
          <Button variant="primary" onClick={() => timer.start(options.find(option => option.value === choice)?.target ?? { kind: 'free', label: 'foco livre' }, minutes)}><Icon as={Play} size={16} /> Iniciar Sessão</Button>
        </> : <>
          <p className="fine-print">{timer.running ? 'Celular longe, uma aba aberta. Só isso agora.' : 'Sessão pausada.'}</p>
          <div className="dialog-actions">{timer.running ? <Button onClick={timer.pause}><Icon as={Pause} size={16} /> Pausar</Button> : <Button variant="primary" onClick={timer.resume}><Icon as={Play} size={16} /> Retomar</Button>}<Button variant="ghost" onClick={timer.stop}><Icon as={Square} size={15} /> Encerrar</Button></div>
        </>}
      </div>
    </div>
  </Card>;
}

/** Small running indicator for the top bar. */
export function TimerBadge({ onClick }: { onClick: () => void }) {
  const timer = useFocusTimer();
  if (!timer.target || timer.ended) return null;
  return <button type="button" className={`timer-badge ${timer.running ? 'is-running' : ''}`} onClick={onClick} aria-label="Ver sessão de foco"><Icon as={Timer} size={15} />{formatClock(timer.remainingMs)}</button>;
}
