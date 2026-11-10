/**
 * Domain model of Minha Vida Extraordinária.
 *
 * Ontological rule: planning and reality never share an entity.
 * - Planning (Goal, Project, Task, CalendarEvent) describes what is intended.
 * - Reality (ExecutionRecord, HabitCheckIn, LifeAssessment) describes what happened.
 * A Task never stores "done". Completion is a fact, recorded as an ExecutionRecord
 * of kind 'completion' that points to the Task. Status shown in the UI is derived
 * (see `domain/selectors.ts`).
 */
export type EntityId = string;
export type ISODateTime = string;
/** Calendar date without time, `YYYY-MM-DD`. */
export type ISODate = string;

export interface OwnedEntity { id: EntityId; userId: EntityId; createdAt: ISODateTime; updatedAt: ISODateTime; }
/** Fields the domain fills automatically when an entity is created or saved. */
export type EntityMeta = keyof OwnedEntity;
export type Draft<T extends OwnedEntity> = Omit<T, EntityMeta>;

export type Priority = 'low' | 'normal' | 'high';

/* ── Life areas ─────────────────────────────────────────────────────────── */

export type AreaDiagnostic = 'well' | 'attention' | 'critical' | 'unknown';
/** Perception layer: how the person feels the area is being cared for. Not a score. */
export interface LifeArea extends OwnedEntity { name: string; description: string; color: string; icon: string; position: number; diagnostic: AreaDiagnostic; }
/** Semester snapshot. Scores are keyed by LifeArea id, from 1 to 10. */
export interface LifeAssessment extends OwnedEntity { period: string; assessedAt: ISODateTime; scores: Record<EntityId, number>; }
/** One private notebook per area. */
export interface AreaNote extends OwnedEntity { areaId: EntityId; content: string; }

/* ── Direction and planning ─────────────────────────────────────────────── */

export interface Vision extends OwnedEntity { statement: string; areaId?: EntityId; }
/** `current`: committed in this cycle. `future`: kept as an idea, with no execution expected. */
export type GoalHorizon = 'current' | 'future';
export interface Goal extends OwnedEntity { title: string; areaId: EntityId; visionId?: EntityId; horizon: GoalHorizon; targetDate?: ISODate; status: 'active' | 'paused' | 'achieved'; }
/** Progress and last activity are derived from Tasks and ExecutionRecords, never stored. */
export interface Project extends OwnedEntity { title: string; areaId: EntityId; goalId?: EntityId; status: 'active' | 'paused' | 'complete'; focus?: boolean; }

/**
 * Single execution list. Every planned action lives here, whatever screen created it:
 * Execução, Central capture or an Area. `origin` keeps the "Tarefa" and "Demanda"
 * distinction without splitting the list.
 */
export type TaskOrigin = 'planned' | 'captured';
export interface Task extends OwnedEntity {
  title: string;
  origin: TaskOrigin;
  areaId?: EntityId;
  projectId?: EntityId;
  goalId?: EntityId;
  /** Deadline. When `dueHasTime` is false only the date part is meaningful. */
  dueAt?: ISODateTime;
  dueHasTime?: boolean;
  priority: Priority;
}

/** Commitment in time. Whether it happened is recorded as an ExecutionRecord. */
export interface CalendarEvent extends OwnedEntity {
  title: string;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  areaId?: EntityId;
  projectId?: EntityId;
  status: 'planned' | 'confirmed' | 'cancelled';
  source: 'manual' | 'google';
  externalId?: string;
  recurrenceId?: string;
}

/* ── Reality ────────────────────────────────────────────────────────────── */

/**
 * Something that actually happened.
 * - `completion`: a Task was finished (at most one per Task).
 * - `session`: time dedicated to a Task, Project or Area.
 * - `attended`: a CalendarEvent took place.
 */
export type ExecutionKind = 'completion' | 'session' | 'attended';
export interface ExecutionRecord extends OwnedEntity {
  kind: ExecutionKind;
  occurredAt: ISODateTime;
  taskId?: EntityId;
  eventId?: EntityId;
  /** Denormalised from the Task or Event at record time, so history survives re-planning. */
  areaId?: EntityId;
  projectId?: EntityId;
  durationMinutes?: number;
  note?: string;
}

export interface Habit extends OwnedEntity { title: string; areaId?: EntityId; frequency: 'daily' | 'weekly'; }
export interface HabitCheckIn extends OwnedEntity { habitId: EntityId; occurredAt: ISODateTime; value: boolean; }

/* ── Other modules (future batches) ─────────────────────────────────────── */

export interface Study extends OwnedEntity { title: string; areaId?: EntityId; status: 'planned' | 'active' | 'completed'; }
export interface FinanceEntry extends OwnedEntity { amount: number; type: 'income' | 'expense'; areaId?: EntityId; occurredAt: ISODateTime; }
export interface LibraryItem extends OwnedEntity { title: string; kind: 'book' | 'article' | 'verse' | 'quote'; }
export interface Note extends OwnedEntity { content: string; areaId?: EntityId; }
export interface Idea extends OwnedEntity { content: string; areaId?: EntityId; }
export interface Decision extends OwnedEntity { title: string; rationale?: string; areaId?: EntityId; }
export interface Review extends OwnedEntity { cycle: 'weekly' | 'monthly' | 'maas'; periodStart: ISODate; periodEnd: ISODate; notes?: string; }
export interface Identity extends OwnedEntity { statement: string; }

/* ── Aggregate ──────────────────────────────────────────────────────────── */

/** Everything the app holds in memory for one person. One collection per cloud table. */
export interface LifeSnapshot {
  areas: LifeArea[];
  assessments: LifeAssessment[];
  areaNotes: AreaNote[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
  executions: ExecutionRecord[];
}
export type Collection = keyof LifeSnapshot;
export type EntityOf<C extends Collection> = LifeSnapshot[C][number];

export const emptySnapshot = (): LifeSnapshot => ({ areas: [], assessments: [], areaNotes: [], goals: [], projects: [], tasks: [], events: [], executions: [] });

/** Builds a new entity with identity and timestamps. */
export function createEntity<T extends OwnedEntity>(userId: EntityId, draft: Draft<T>, now = new Date()): T {
  const stamp = now.toISOString();
  return { ...draft, id: crypto.randomUUID(), userId, createdAt: stamp, updatedAt: stamp } as T;
}
/** Applies a change and refreshes `updatedAt`. Identity fields cannot be changed. */
export function touch<T extends OwnedEntity>(entity: T, change: Partial<Draft<T>>, now = new Date()): T {
  return { ...entity, ...change, id: entity.id, userId: entity.userId, createdAt: entity.createdAt, updatedAt: now.toISOString() };
}
