import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type PropsWithChildren } from 'react';
import { createEntity, emptySnapshot, touch, type AreaDiagnostic, type AreaNote, type CalendarEvent, type Collection, type Draft, type EntityId, type EntityOf, type ExecutionRecord, type Goal, type GoalHorizon, type LifeAssessment, type LifeSnapshot, type Project, type Task } from '../domain/models';
import { completionOf } from '../domain/selectors';
import type { AuthUser, DataService } from '../services/repository';

/**
 * Single source of state for every module. Areas, Execução, Central and Agenda all read
 * the same snapshot, so an action created inside an Area is the same Task shown in Execução.
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
    case 'hydrate': return { status: 'ready', user: action.user, snapshot: action.snapshot };
    case 'status': return { ...state, status: action.status, syncIssue: action.message };
    case 'syncIssue': return { ...state, syncIssue: action.message };
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

export interface NewTask { title: string; areaId?: EntityId; projectId?: EntityId; goalId?: EntityId; dueAt?: string; dueHasTime?: boolean; priority?: Task['priority']; origin?: Task['origin']; }
export interface NewEvent { title: string; startsAt: string; endsAt: string; areaId?: EntityId; projectId?: EntityId; }

export interface LifeStore extends LifeState {
  mode: DataService['mode'];
  signIn(): Promise<void>;
  captureDemand(title: string): Task;
  addTask(input: NewTask): Task;
  /** Records or withdraws the completion fact. The Task itself is never changed. */
  toggleTaskCompletion(taskId: EntityId): void;
  addGoal(areaId: EntityId, title: string, horizon: GoalHorizon): Goal;
  addProject(areaId: EntityId, title: string): Project;
  addEvent(input: NewEvent): CalendarEvent;
  setAreaDiagnostic(areaId: EntityId, diagnostic: AreaDiagnostic): void;
  setAreaNote(areaId: EntityId, content: string): void;
  saveAssessment(period: string, scores: Record<EntityId, number>): LifeAssessment;
}

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

  const discard = useCallback((collection: Collection, userId: EntityId, id: EntityId) => {
    dispatch({ type: 'remove', collection, id });
    service.remove(collection, userId, id).catch(error => { console.error(error); dispatch({ type: 'syncIssue', message: syncMessage }); });
  }, [service]);

  const actions = useMemo(() => {
    const userId = () => { const id = stateRef.current.user?.id; if (!id) throw new Error('Nenhuma pessoa autenticada.'); return id; };
    const snapshot = () => stateRef.current.snapshot;
    const create = <C extends Collection>(collection: C, draft: Draft<EntityOf<C>>) => { const entity = createEntity<EntityOf<C>>(userId(), draft); persist(collection, entity); return entity; };

    const addTask = (input: NewTask) => create('tasks', { origin: 'planned', priority: 'normal', ...input, title: input.title.trim() });

    return {
      signIn: () => service.auth.signInWithGoogle(),
      addTask,
      captureDemand: (title: string) => addTask({ title, origin: 'captured' }),
      toggleTaskCompletion(taskId: EntityId) {
        const current = snapshot();
        const task = current.tasks.find(item => item.id === taskId);
        if (!task) return;
        const completion = completionOf(taskId, current.executions);
        if (completion) return discard('executions', completion.userId, completion.id);
        create('executions', { kind: 'completion', taskId: task.id, areaId: task.areaId, projectId: task.projectId, occurredAt: new Date().toISOString() } satisfies Draft<ExecutionRecord>);
      },
      addGoal: (areaId: EntityId, title: string, horizon: GoalHorizon) => create('goals', { areaId, title: title.trim(), horizon, status: 'active' }),
      addProject: (areaId: EntityId, title: string) => create('projects', { areaId, title: title.trim(), status: 'active' }),
      addEvent: (input: NewEvent) => create('events', { ...input, title: input.title.trim(), status: 'planned', source: 'manual' }),
      setAreaDiagnostic(areaId: EntityId, diagnostic: AreaDiagnostic) {
        const area = snapshot().areas.find(item => item.id === areaId);
        if (area) persist('areas', touch(area, { diagnostic }));
      },
      setAreaNote(areaId: EntityId, content: string) {
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
      saveAssessment: (period: string, scores: Record<EntityId, number>) => create('assessments', { period, scores, assessedAt: new Date().toISOString() })
    };
  }, [persist, discard, service]);

  const value = useMemo<LifeStore>(() => ({ ...state, mode: service.mode, ...actions }), [state, actions, service.mode]);
  return <LifeContext.Provider value={value}>{children}</LifeContext.Provider>;
}

export function useLife(): LifeStore {
  const store = useContext(LifeContext);
  if (!store) throw new Error('useLife precisa estar dentro de <LifeProvider>.');
  return store;
}
