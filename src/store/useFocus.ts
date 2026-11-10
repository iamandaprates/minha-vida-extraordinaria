import { create } from 'zustand';
import { useMive } from './useMive';

/**
 * Timer de foco (estado de sessão, fica acima das rotas para não parar ao trocar de guia).
 * Cada início, pausa, retomada e fim vira um evento no log comportamental.
 */
export type FocusStatus = 'idle' | 'running' | 'paused' | 'ended';
interface FocusState {
  status: FocusStatus;
  label: string;
  taskId?: string;
  plannedMin: number;
  startedAt?: number;
  elapsedMs: number;
  pauses: number;
  start(label: string, minutes: number, taskId?: string): void;
  pause(): void;
  resume(): void;
  /** Encerra a contagem e abre o fechamento da sessão. */
  finish(): void;
  /** Fecha a sessão. `completed` conclui a tarefa ligada. */
  close(save: boolean, completed?: boolean): void;
  elapsed(): number;
}
const log = () => useMive.getState().logBehavior;

export const useFocus = create<FocusState>()((set, get) => ({
  status: 'idle', label: '', plannedMin: 25, elapsedMs: 0, pauses: 0,
  elapsed: () => { const state = get(); return state.elapsedMs + (state.status === 'running' && state.startedAt ? Date.now() - state.startedAt : 0); },
  start: (label, minutes, taskId) => {
    set({ status: 'running', label, taskId, plannedMin: minutes, startedAt: Date.now(), elapsedMs: 0, pauses: 0 });
    log()('task_started', { taskId, meta: { minutes, label } });
  },
  pause: () => { const state = get(); if (state.status !== 'running') return; set({ status: 'paused', elapsedMs: state.elapsed(), startedAt: undefined, pauses: state.pauses + 1 }); log()('session_paused', { taskId: state.taskId }); },
  resume: () => { const state = get(); if (state.status !== 'paused') return; set({ status: 'running', startedAt: Date.now() }); log()('session_resumed', { taskId: state.taskId }); },
  finish: () => { const state = get(); if (state.status === 'idle' || state.status === 'ended') return; set({ status: 'ended', elapsedMs: Math.min(state.elapsed(), state.plannedMin * 60_000), startedAt: undefined }); },
  close: (save, completed = false) => {
    const state = get();
    log()('session_ended', { taskId: state.taskId, meta: { plannedMin: state.plannedMin, focusedMin: save ? Math.round(state.elapsedMs / 60_000) : 0, pauses: state.pauses, saved: save } });
    if (save && completed && state.taskId) useMive.getState().completeTask(state.taskId);
    set({ status: 'idle', label: '', taskId: undefined, elapsedMs: 0, pauses: 0, startedAt: undefined });
  }
}));

export const formatClock = (ms: number) => { const total = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; };
