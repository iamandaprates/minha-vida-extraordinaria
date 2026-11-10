import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type PropsWithChildren } from 'react';
import { createEntity, cycleLabel, cycleOf, emptySnapshot, toISODate, touch, type AreaDiagnostic, type AreaNote, type BodyMeasurement, type CalendarEvent, type CheckupKind, type Collection, type Draft, type EntityId, type EntityOf, type ExecutionRecord, type FactCollection, type FinanceEntry, type Goal, type GoalHorizon, type Habit, type HabitCheckIn, type HealthCheckup, type IdentityManifest, type IdentityVersion, type ISODate, type LifeAssessment, type LifeSnapshot, type PlanCollection, type Project, type Task, type Vision } from '../domain/models';
import { completionOf, isHabitDone } from '../domain/selectors';
import type { AuthUser, DataService } from '../services/repository';

/**
 * Single source of state. Central, Áreas, Agenda, Execução, Hábitos, Metas, Saúde and Finanças
 * read the same snapshot, so one record is shown everywhere and changes everywhere at once.
 *
 * Two kinds of writes:
 * - `plan(...)`  creates or edits planning records (upsert).
 * - `fact(...)`  appends a reality record. Facts are never edited or removed; corrections are
 *   new facts (a `reversal`, a check-in with `done: false`).
 * Writes are optimistic: the snapshot updates at once and the data service persists after.
 */

type Status = 'loading' | 'ready' | 'signed-out' | 'error';
interface LifeState { status: Status; user?: AuthUser; snapshot: LifeSnapshot; syncIssue?: string; }

type Action =
  | { type: 'hydrate'; user: AuthUser; snapshot: LifeSnapshot }
  | { type: 'status'; status: Status; message?: string }
  | { type: 'upsert'; collection: Collection; entity: EntityOf<Collection> }
  | { type: 'remove'; collection: Collection; id: EntityId }
  | { type: 'syncIssue'; message?: string };

function reducer(state: LifeState, action: Action): LifeState {
  switch (action.type) {
    case 'hydrate': return { status: 'ready', user: action.user, snapshot: { ...emptySnapshot(), ...action.snapshot } };
    case 'status': return { ...state, status: action.status, syncIssue: action.message };
    case 'syncIssue': return state.syncIssue === action.message ? state : { ...state, syncIssue: action.message };
    case 'upsert': {
      const list = state.snapshot[action.collection] as EntityOf<Collection>[];
      const exists = list.some(item => item.id === action.entity.id);
      const next = exists ? list.map(item => item.id === action.entity.id ? action.entity : item) : [...list, action.entity];
      return { ...state, snapshot: { ...state.snapshot, [action.collection]: next } };
    }
    case 'remove': {
      const list = state.snapshot[action.collection] as EntityOf<Collection>[];
      return { ...state, snapshot: { ...state.snapshot, [action.collection]: list.filter(item => item.id !== action.id) } };
    }
  }
}

export interface NewTask { title: string; areaId?: EntityId; projectId?: EntityId; goalId?: EntityId; dueAt?: string; dueHasTime?: boolean; priority?: Task['priority']; origin?: Task['origin']; estimateMinutes?: number; }
export interface NewEvent { title: string; startsAt: string; endsAt: string; areaId?: EntityId; projectId?: EntityId; }
export interface NewGoal { title: string; areaId: EntityId; horizon: GoalHorizon; why?: string; visionId?: EntityId; }
export interface NewHabit { title: string; areaId: EntityId; goalId?: EntityId; frequency: Habit['frequency']; timesPerWeek?: number; }
export type NewFinanceEntry = Omit<Draft<FinanceEntry>, 'description'> & { description?: string };

export interface LifeActions {
  signIn(): Promise<void>;
  captureDemand(title: string): Task;
  addTask(input: NewTask): Task;
  /** Appends a completion, or a reversal of the active completion. The Task is never changed. */
  toggleTaskCompletion(taskId: EntityId): void;
  /** Appends the time dedicated to a task and, when asked, its completion. */
  recordSession(taskId: EntityId, minutes: number, complete: boolean): void;
  addGoal(input: NewGoal): Goal;
  addProject(areaId: EntityId, title: string, goalId?: EntityId): Project;
  addEvent(input: NewEvent): CalendarEvent;
  addHabit(input: NewHabit): Habit;
  /** Appends a check-in with the opposite state for that day. */
  toggleHabit(habitId: EntityId, date?: ISODate): void;
  recordCheckup(kind: CheckupKind, date: ISODate, note?: string): HealthCheckup;
  recordWeight(weightKg: number, date: ISODate, note?: string): BodyMeasurement;
  addFinanceEntry(input: NewFinanceEntry): FinanceEntry;
  depositToVault(vaultId: EntityId, amountCents: number, date: ISODate): FinanceEntry | undefined;
  setVaultTarget(vaultId: EntityId, targetCents: number): void;
  addVision(input: Draft<Vision>): Vision;
  saveIdentity(manifest: IdentityManifest): IdentityVersion;
  setAreaDiagnostic(areaId: EntityId, diagnostic: AreaDiagnostic): void;
  setAreaNote(areaId: EntityId, content: string): void;
  saveAssessment(scores: Record<EntityId, number>): LifeAssessment;
}
export interface LifeStore extends LifeState, LifeActions { mode: DataService['mode']; }

const LifeContext = createContext<LifeStore | null>(null);
const NOTE_SAVE_DELAY = 700;
const syncMessage = 'Não foi possível sincronizar a última alteração. Ela continua aqui e será enviada na próxima vez.';

export function LifeProvider({ service, children }: PropsWithChildren<{ service: DataService }>) {
  const [state, dispatch] = useReducer(reducer, { status: 'loading', snapshot: emptySnapshot() });
  const stateRef = useRef(state);
  stateRef.current = state;
  const noteTimers = useRef(new Map<EntityId, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await service.auth.currentUser();
        if (!active) return;
        if (!user) return dispatch({ type: 'status', status: 'signed-out' });
        const snapshot = await service.load(user.id);
        if (active) dispatch({ type: 'hydrate', user, snapshot });
      } catch (error) {
        console.error(error);
        if (active) dispatch({ type: 'status', status: 'error', message: 'Não conseguimos abrir seus registros agora. Tente novamente em instantes.' });
      }
    })();
    const timers = noteTimers.current;
    return () => { active = false; timers.forEach(clearTimeout); };
  }, [service]);

  const persist = useCallback(<C extends Collection>(collection: C, entity: EntityOf<C>) => {
    dispatch({ type: 'upsert', collection, entity });
    service.save(collection, entity).then(() => dispatch({ type: 'syncIssue' }), error => { console.error(error); dispatch({ type: 'syncIssue', message: syncMessage }); });
  }, [service]);

  const actions = useMemo<LifeActions>(() => {
    const userId = () => { const id = stateRef.current.user?.id; if (!id) throw new Error('Nenhuma pessoa autenticada.'); return id; };
    const snapshot = () => stateRef.current.snapshot;
    const plan = <C extends PlanCollection>(collection: C, draft: Draft<EntityOf<C>>) => { const entity = createEntity<EntityOf<C>>(userId(), draft); persist(collection, entity); return entity; };
    const fact = <C extends FactCollection>(collection: C, draft: Draft<EntityOf<C>>) => { const entity = createEntity<EntityOf<C>>(userId(), draft); persist(collection, entity); return entity; };
    const now = () => new Date().toISOString();
    const taskContext = (task: Task) => ({ taskId: task.id, areaId: task.areaId, projectId: task.projectId, goalId: task.goalId ?? snapshot().projects.find(project => project.id === task.projectId)?.goalId });
    const addTask = (input: NewTask) => plan('tasks', { origin: 'planned', priority: 'normal', ...input, title: input.title.trim() });
    const addFinanceEntry = (input: NewFinanceEntry) => fact('financeEntries', { ...input, description: input.description?.trim() || '' });

    return {
      signIn: () => service.auth.signInWithGoogle(),
      addTask,
      captureDemand: title => addTask({ title, origin: 'captured' }),
      toggleTaskCompletion(taskId) {
        const task = snapshot().tasks.find(item => item.id === taskId);
        if (!task) return;
        const completion = completionOf(taskId, snapshot().executions);
        if (completion) fact('executions', { ...taskContext(task), kind: 'reversal', reversesId: completion.id, occurredAt: now() } satisfies Draft<ExecutionRecord>);
        else fact('executions', { ...taskContext(task), kind: 'completion', occurredAt: now() } satisfies Draft<ExecutionRecord>);
      },
      recordSession(taskId, minutes, complete) {
        const task = snapshot().tasks.find(item => item.id === taskId);
        if (!task) return;
        if (minutes > 0) fact('executions', { ...taskContext(task), kind: 'session', durationMinutes: Math.round(minutes), occurredAt: now() });
        if (complete && !completionOf(taskId, snapshot().executions)) fact('executions', { ...taskContext(task), kind: 'completion', occurredAt: now() });
      },
      addGoal: input => plan('goals', { ...input, title: input.title.trim(), status: 'active', cycle: input.horizon === 'current' ? cycleOf(new Date()) : undefined }),
      addProject: (areaId, title, goalId) => plan('projects', { areaId, title: title.trim(), goalId, status: 'active' }),
      addEvent: input => plan('events', { ...input, title: input.title.trim(), status: 'planned', source: 'manual' }),
      addHabit: input => plan('habits', { ...input, title: input.title.trim(), active: true }),
      toggleHabit(habitId, date = toISODate(new Date())) {
        fact('habitCheckIns', { habitId, date, done: !isHabitDone(habitId, date, snapshot().habitCheckIns), occurredAt: now() } satisfies Draft<HabitCheckIn>);
      },
      recordCheckup: (kind, date, note) => fact('healthCheckups', { kind, date, note: note?.trim() || undefined }),
      recordWeight: (weightKg, date, note) => fact('bodyMeasurements', { weightKg: Math.round(weightKg * 10) / 10, date, note: note?.trim() || undefined }),
      addFinanceEntry,
      depositToVault(vaultId, amountCents, date) {
        const vault = snapshot().vaults.find(item => item.id === vaultId);
        return vault ? addFinanceEntry({ type: 'vault_deposit', amountCents, date, category: 'vault', vaultId, description: `Aporte · ${vault.name}` }) : undefined;
      },
      setVaultTarget(vaultId, targetCents) {
        const vault = snapshot().vaults.find(item => item.id === vaultId);
        if (vault) persist('vaults', touch(vault, { targetCents }));
      },
      addVision: input => plan('visions', { ...input, title: input.title.trim(), statement: input.statement.trim() }),
      saveIdentity: manifest => fact('identityVersions', { ...manifest, savedAt: now() }),
      setAreaDiagnostic(areaId, diagnostic) {
        const area = snapshot().areas.find(item => item.id === areaId);
        if (area) persist('areas', touch(area, { diagnostic }));
      },
      setAreaNote(areaId, content) {
        const existing = snapshot().areaNotes.find(note => note.areaId === areaId);
        const note: AreaNote = existing ? touch(existing, { content }) : createEntity<AreaNote>(userId(), { areaId, content });
        dispatch({ type: 'upsert', collection: 'areaNotes', entity: note });
        const timers = noteTimers.current;
        clearTimeout(timers.get(areaId));
        timers.set(areaId, setTimeout(() => {
          timers.delete(areaId);
          const latest = stateRef.current.snapshot.areaNotes.find(item => item.areaId === areaId);
          if (latest) persist('areaNotes', latest);
        }, NOTE_SAVE_DELAY));
      },
      saveAssessment(scores) {
        const cycle = cycleOf(new Date());
        return fact('assessments', { cycle, period: cycleLabel(cycle), scores, assessedAt: now() });
      }
    };
  }, [persist, service]);

  const value = useMemo<LifeStore>(() => ({ ...state, mode: service.mode, ...actions }), [state, actions, service.mode]);
  return <LifeContext.Provider value={value}>{children}</LifeContext.Provider>;
}

export function useLife(): LifeStore {
  const store = useContext(LifeContext);
  if (!store) throw new Error('useLife precisa estar dentro de <LifeProvider>.');
  return store;
}
