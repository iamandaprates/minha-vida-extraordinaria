import { useSyncExternalStore } from 'react';
import { semesterLabel } from '../domain/dates';
import { newId } from '../domain/ids';
import type { AreaDiagnostic, AreaNote, AreaState, CalendarEvent, EntityId, Goal, Idea, LifeAssessment, OwnedEntity, Project, Task } from '../domain/models';
import { LocalStorageRepository, STORAGE_PREFIX } from './localRepository';
import type { CloudRepository } from './repository';

/** Single local user until the authentication batch exists. Every record already carries a userId. */
export const LOCAL_USER_ID = 'local-user';

export type AreasData = { assessments: LifeAssessment[]; states: AreaState[]; notes: AreaNote[]; goals: Goal[]; ideas: Idea[]; projects: Project[]; tasks: Task[]; events: CalendarEvent[] };
export type AreasSnapshot = AreasData & { ready: boolean; persistenceError: string | null };
type Collection = keyof AreasData;
type Item<K extends Collection> = AreasData[K][number];
type Draft<T extends OwnedEntity> = Omit<T, keyof OwnedEntity> & { id?: EntityId };

/** To move to the cloud, replace the LocalStorageRepository instances below with API-backed CloudRepository implementations. */
const repositories: { [K in Collection]: CloudRepository<Item<K>> } = {
  assessments: new LocalStorageRepository<LifeAssessment>('life-assessments'),
  states: new LocalStorageRepository<AreaState>('area-states'),
  notes: new LocalStorageRepository<AreaNote>('area-notes'),
  goals: new LocalStorageRepository<Goal>('goals'),
  ideas: new LocalStorageRepository<Idea>('ideas'),
  projects: new LocalStorageRepository<Project>('projects'),
  tasks: new LocalStorageRepository<Task>('tasks'),
  events: new LocalStorageRepository<CalendarEvent>('events')
};

const SAVE_ERROR = 'Não foi possível salvar no navegador. Suas alterações mais recentes podem se perder ao recarregar.';
let snapshot: AreasSnapshot = { assessments: [], states: [], notes: [], goals: [], ideas: [], projects: [], tasks: [], events: [], ready: false, persistenceError: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => snapshot;

export const useAreasData = (): AreasSnapshot => useSyncExternalStore(subscribe, getSnapshot);

function setError(message: string | null) { if (snapshot.persistenceError !== message) { snapshot = { ...snapshot, persistenceError: message }; emit(); } }

/** In-memory state updates immediately (the UI never waits); the repository write follows. */
function commit<K extends Collection>(key: K, entity: Item<K>) {
  const list = snapshot[key] as Item<K>[];
  const next = list.some(item => item.id === entity.id) ? list.map(item => item.id === entity.id ? entity : item) : [...list, entity];
  snapshot = { ...snapshot, [key]: next } as AreasSnapshot;
  emit();
  repositories[key].save(LOCAL_USER_ID, entity).then(() => setError(null), () => setError(SAVE_ERROR));
}

function drop(key: Collection, id: EntityId) {
  snapshot = { ...snapshot, [key]: (snapshot[key] as OwnedEntity[]).filter(item => item.id !== id) } as AreasSnapshot;
  emit();
  repositories[key].remove(LOCAL_USER_ID, id).then(() => setError(null), () => setError(SAVE_ERROR));
}

function build<T extends OwnedEntity>(existing: T[], draft: Draft<T>): T {
  const previous = draft.id ? existing.find(item => item.id === draft.id) : undefined;
  const now = new Date().toISOString();
  return { ...draft, id: draft.id ?? newId(), userId: LOCAL_USER_ID, createdAt: previous?.createdAt ?? now, updatedAt: now } as unknown as T;
}

function touchProject(projectId?: EntityId) {
  const project = projectId ? snapshot.projects.find(item => item.id === projectId) : undefined;
  if (project) commit('projects', build(snapshot.projects, { ...project, lastActivityAt: new Date().toISOString() }));
}

function saveTask(draft: Draft<Task>) {
  const previous = draft.id ? snapshot.tasks.find(item => item.id === draft.id) : undefined;
  const completedAt = draft.status === 'done' ? (previous?.status === 'done' ? previous.completedAt : undefined) ?? new Date().toISOString() : undefined;
  const task = build(snapshot.tasks, { ...draft, completedAt });
  commit('tasks', task);
  touchProject(task.projectId);
}

/** Deleting a goal or project never deletes the actions linked to it, it only removes the reference. */
function unlinkGoal(goalId: EntityId) {
  snapshot.projects.filter(item => item.goalId === goalId).forEach(item => commit('projects', build(snapshot.projects, { ...item, goalId: undefined })));
  snapshot.tasks.filter(item => item.goalId === goalId).forEach(item => commit('tasks', build(snapshot.tasks, { ...item, goalId: undefined })));
}
function unlinkProject(projectId: EntityId) {
  snapshot.tasks.filter(item => item.projectId === projectId).forEach(item => commit('tasks', build(snapshot.tasks, { ...item, projectId: undefined })));
}

export const areasActions = {
  /** Creates a new snapshot. Previous assessments are never overwritten. */
  saveAssessment(scores: Record<string, number>): LifeAssessment {
    const now = new Date();
    const assessment = build<LifeAssessment>(snapshot.assessments, { period: semesterLabel(now), assessedAt: now.toISOString(), scores: { ...scores } });
    commit('assessments', assessment);
    return assessment;
  },
  setDiagnostic(areaId: EntityId, diagnostic: AreaDiagnostic) { commit('states', build<AreaState>(snapshot.states, { id: `area-state-${areaId}`, areaId, diagnostic })); },
  setNote(areaId: EntityId, content: string) { commit('notes', build<AreaNote>(snapshot.notes, { id: `area-note-${areaId}`, areaId, content })); },
  saveGoal(draft: Draft<Goal>) { commit('goals', build(snapshot.goals, draft)); },
  saveIdea(draft: Draft<Idea>) { commit('ideas', build(snapshot.ideas, draft)); },
  saveProject(draft: Draft<Project>) { commit('projects', build(snapshot.projects, draft)); },
  saveEvent(draft: Draft<CalendarEvent>) { commit('events', build(snapshot.events, draft)); },
  saveTask,
  toggleTask(id: EntityId) { const task = snapshot.tasks.find(item => item.id === id); if (task) saveTask({ ...task, status: task.status === 'done' ? 'open' : 'done' }); },
  removeGoal(id: EntityId) { drop('goals', id); unlinkGoal(id); },
  removeProject(id: EntityId) { drop('projects', id); unlinkProject(id); },
  removeIdea(id: EntityId) { drop('ideas', id); },
  removeTask(id: EntityId) { drop('tasks', id); },
  removeEvent(id: EntityId) { drop('events', id); }
};

/** Loads every collection from the repositories. Runs on startup and when another tab changes the data. */
export async function hydrateAreasStore() {
  try {
    const [assessments, states, notes, goals, ideas, projects, tasks, events] = await Promise.all([
      repositories.assessments.list(LOCAL_USER_ID), repositories.states.list(LOCAL_USER_ID), repositories.notes.list(LOCAL_USER_ID), repositories.goals.list(LOCAL_USER_ID),
      repositories.ideas.list(LOCAL_USER_ID), repositories.projects.list(LOCAL_USER_ID), repositories.tasks.list(LOCAL_USER_ID), repositories.events.list(LOCAL_USER_ID)
    ]);
    snapshot = { assessments, states, notes, goals, ideas, projects, tasks, events, ready: true, persistenceError: null };
  } catch { snapshot = { ...snapshot, ready: true, persistenceError: 'Não foi possível carregar seus dados salvos neste navegador.' }; }
  emit();
}

void hydrateAreasStore();
if (typeof window !== 'undefined') window.addEventListener('storage', event => { if (event.key?.startsWith(STORAGE_PREFIX)) void hydrateAreasStore(); });
