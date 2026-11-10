import { Pause, Play, Square, Timer } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { toISODate } from '../domain/models';
import { isTaskCompleted, todayFocus } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './icons';
import { Dialog, Field } from './ui';

/**
 * Modo Foco. The timer lives above the pages, so it keeps running across guides.
 * Every start, pause, resume and end is a behavioural fact; the focused minutes become an
 * ExecutionRecord (or a StudySession) only when the session ends. Pausing is never penalised.
 */
export interface TimerTarget { kind: 'task' | 'study' | 'free'; id?: string; label: string; }
interface TimerState { sessionId?: string; target?: TimerTarget; durationMinutes: number; startedAt?: number; elapsedBefore: number; running: boolean; ended: boolean; pauses: number; }
interface TimerApi extends TimerState { remainingMs: number; elapsedMs: number; start(target: TimerTarget, minutes?: number): void; pause(reason?: string): void; resume(): void; stop(): void; reset(): void; }

const TimerContext = createContext<TimerApi | null>(null);
export const DEFAULT_SESSION_MINUTES = 50;
export const SESSION_PRESETS = [5, 10, 15, 25, 50];
export const formatClock = (ms: number) => { const total = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; };
const idle: TimerState = { durationMinutes: DEFAULT_SESSION_MINUTES, elapsedBefore: 0, running: false, ended: false, pauses: 0 };

export function FocusTimerProvider({ children }: PropsWithChildren) {
  const { logBehavior } = useLife();
  const [state, setState] = useState<TimerState>(idle);
  const [tick, setTick] = useState(Date.now());
  const stateRef = useRef(state); stateRef.current = state;
  useEffect(() => { if (!state.running) return; const timer = setInterval(() => setTick(Date.now()), 500); return () => clearInterval(timer); }, [state.running]);
  const elapsedMs = state.elapsedBefore + (state.running && state.startedAt ? tick - state.startedAt : 0);
  const remainingMs = state.durationMinutes * 60_000 - elapsedMs;
  useEffect(() => { if (state.running && remainingMs <= 0) setState(current => ({ ...current, running: false, ended: true, elapsedBefore: current.durationMinutes * 60_000, startedAt: undefined })); }, [remainingMs, state.running]);

  const taskId = (target?: TimerTarget) => target?.kind === 'task' ? target.id : undefined;
  const start = useCallback((target: TimerTarget, minutes = DEFAULT_SESSION_MINUTES) => {
    const now = Date.now(); const sessionId = crypto.randomUUID();
    setTick(now); setState({ ...idle, sessionId, target, durationMinutes: minutes, startedAt: now, running: true });
    logBehavior({ kind: 'session_start', sessionId, taskId: taskId(target), plannedMinutes: minutes, note: target.label });
  }, [logBehavior]);
  const pause = useCallback((reason?: string) => {
    const current = stateRef.current;
    if (!current.running || !current.startedAt) return;
    setState({ ...current, running: false, elapsedBefore: current.elapsedBefore + Date.now() - current.startedAt, startedAt: undefined, pauses: current.pauses + 1 });
    logBehavior({ kind: 'session_pause', sessionId: current.sessionId, taskId: taskId(current.target), note: reason });
  }, [logBehavior]);
  const resume = useCallback(() => {
    const current = stateRef.current;
    if (!current.target || current.running || current.ended) return;
    const now = Date.now(); setTick(now); setState({ ...current, running: true, startedAt: now });
    logBehavior({ kind: 'session_resume', sessionId: current.sessionId, taskId: taskId(current.target) });
  }, [logBehavior]);
  const stop = useCallback(() => setState(current => ({ ...current, running: false, ended: true, elapsedBefore: current.elapsedBefore + (current.running && current.startedAt ? Date.now() - current.startedAt : 0), startedAt: undefined })), []);
  const reset = useCallback(() => setState(idle), []);
  const api = useMemo<TimerApi>(() => ({ ...state, elapsedMs, remainingMs, start, pause, resume, stop, reset }), [state, elapsedMs, remainingMs, start, pause, resume, stop, reset]);
  return <TimerContext.Provider value={api}>{children}{state.ended && state.target && <SessionEndDialog />}</TimerContext.Provider>;
}

export function useFocusTimer(): TimerApi {
  const timer = useContext(TimerContext);
  if (!timer) throw new Error('useFocusTimer precisa estar dentro de <FocusTimerProvider>.');
  return timer;
}

/** End of session: minutes, questions (study) and completion become facts. */
function SessionEndDialog() {
  const { target, elapsedMs, durationMinutes, sessionId, pauses, reset } = useFocusTimer();
  const { snapshot, recordSession, addStudySession, logBehavior } = useLife();
  const minutes = Math.max(1, Math.round(elapsedMs / 60_000));
  const [questions, setQuestions] = useState('');
  const [correct, setCorrect] = useState('');
  const [complete, setComplete] = useState(true);
  if (!target) return null;
  const subject = target.kind === 'study' ? snapshot.studySubjects.find(item => item.id === target.id) : undefined;
  const close = (save: boolean) => {
    logBehavior({ kind: 'session_end', sessionId, taskId: target.kind === 'task' ? target.id : undefined, plannedMinutes: durationMinutes, focusedMinutes: save ? Math.round(elapsedMs / 60_000) : 0, note: save ? undefined : 'descartada' });
    if (save) {
      if (target.kind === 'study' && subject) addStudySession({ subjectId: subject.id, minutes, questions: Number(questions) || undefined, correct: Number(questions) ? Math.min(Number(correct) || 0, Number(questions)) : undefined, date: toISODate(new Date()) });
      else recordSession({ taskId: target.kind === 'task' ? target.id : undefined, minutes }, target.kind === 'task' && complete);
    }
    reset();
  };
  return <Dialog eyebrow="SESSÃO ENCERRADA" title={`${minutes} min em ${target.label}`} onClose={() => close(false)} onSubmit={() => close(true)} submitLabel="Salvar no histórico →">
    <p className="dialog-text">{pauses ? `${pauses} ${pauses === 1 ? 'pausa' : 'pausas'} e você voltou. Retomar também conta.` : 'Sessão sem interrupções.'}</p>
    {target.kind === 'study' && <div className="field-row"><Field label="Questões resolvidas"><input type="number" min={0} value={questions} onChange={event => setQuestions(event.target.value)} placeholder="0" /></Field><Field label="Acertos"><input type="number" min={0} value={correct} onChange={event => setCorrect(event.target.value)} placeholder="0" /></Field></div>}
    {target.kind === 'task' && <label className="toggle"><input type="checkbox" checked={complete} onChange={event => setComplete(event.target.checked)} /><span>Concluí esta entrega</span></label>}
  </Dialog>;
}

export function TimerCard({ deckId }: { deckId?: string }) {
  const timer = useFocusTimer();
  const { snapshot } = useLife();
  const focus = todayFocus(snapshot);
  const options = [
    ...focus.deliveries.filter(task => !isTaskCompleted(task.id, snapshot.executions)).map(task => ({ value: `task:${task.id}`, label: task.title, target: { kind: 'task' as const, id: task.id, label: task.title } })),
    ...snapshot.studySubjects.filter(subject => !deckId || subject.deckId === deckId).map(subject => ({ value: `study:${subject.id}`, label: `${snapshot.studyDecks.find(deck => deck.id === subject.deckId)?.name ?? 'Estudo'} · ${subject.name}`, target: { kind: 'study' as const, id: subject.id, label: subject.name } })),
    { value: 'free', label: 'Foco livre', target: { kind: 'free' as const, label: 'foco livre' } }
  ];
  const [choice, setChoice] = useState(options[0]?.value ?? 'free');
  const [minutes, setMinutes] = useState(DEFAULT_SESSION_MINUTES);
  const [reason, setReason] = useState('');
  const active = Boolean(timer.target) && !timer.ended;
  const total = (active ? timer.durationMinutes : minutes) * 60_000;
  const remaining = active ? timer.remainingMs : total;
  const ratio = Math.min(1, Math.max(0, 1 - remaining / total));
  const radius = 64; const circumference = 2 * Math.PI * radius;
  return <Card className="timer-card">
    <div className="card-head"><div><span className="label">MODO FOCO</span><h2>{active ? timer.target!.label : minutes <= 15 ? 'Micro-sprint' : 'Bloco de foco'}</h2></div><Icon as={Timer} size={20} /></div>
    <div className="timer-body">
      <div className={`timer-dial ${timer.running ? 'is-running' : ''}`}>
        <svg viewBox="0 0 150 150" aria-hidden="true"><circle className="ring-track" cx="75" cy="75" r={radius} strokeWidth="8" /><circle className="ring-value timer-value" cx="75" cy="75" r={radius} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} transform="rotate(-90 75 75)" /></svg>
        <b aria-live="polite">{formatClock(remaining)}</b>
      </div>
      <div className="timer-controls">
        {!active ? <>
          <Field label="No que você vai focar"><select value={choice} onChange={event => setChoice(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <div className="chip-row">{SESSION_PRESETS.map(value => <button key={value} type="button" className={`chip ${minutes === value ? 'selected' : ''}`} onClick={() => setMinutes(value)}>{value} min</button>)}</div>
          <Button variant="primary" onClick={() => timer.start(options.find(option => option.value === choice)?.target ?? { kind: 'free', label: 'foco livre' }, minutes)}><Icon as={Play} size={16} /> Iniciar sessão</Button>
        </> : timer.running ? <>
          <p className="support">Celular longe, uma aba aberta. Só isso agora.</p>
          <div className="pause-row"><select value={reason} onChange={event => setReason(event.target.value)} aria-label="Motivo da pausa"><option value="">Motivo da pausa (opcional)</option><option>Interrupção externa</option><option>Celular ou notificação</option><option>Cansaço</option><option>Pausa planejada</option></select></div>
          <div className="dialog-actions"><Button onClick={() => { timer.pause(reason || undefined); setReason(''); }}><Icon as={Pause} size={16} /> Pausar</Button><Button variant="ghost" onClick={timer.stop}><Icon as={Square} size={15} /> Encerrar</Button></div>
        </> : <>
          <p className="support">Sessão pausada. Voltar não tem custo: retomar é o que conta.</p>
          <div className="dialog-actions"><Button variant="primary" onClick={timer.resume}><Icon as={Play} size={16} /> Retomar</Button><Button variant="ghost" onClick={timer.stop}><Icon as={Square} size={15} /> Encerrar</Button></div>
        </>}
      </div>
    </div>
  </Card>;
}

export function TimerBadge({ onClick }: { onClick: () => void }) {
  const timer = useFocusTimer();
  if (!timer.target || timer.ended) return null;
  return <button type="button" className={`timer-badge ${timer.running ? 'is-running' : ''}`} onClick={onClick} aria-label="Ver sessão de foco"><Icon as={Timer} size={15} />{formatClock(timer.remainingMs)}</button>;
}
