/**
 * Domain model of Minha Vida Extraordinária.
 *
 * 1. Single source of truth: every action, goal, habit or commitment is ONE record.
 *    Screens never copy data; they read the same snapshot through selectors.
 * 2. Planning is not reality:
 *    - Planning (editable): Goal, Project, Task, CalendarEvent, Habit, FinanceVault, Vision.
 *    - Reality (append-only facts): ExecutionRecord, HabitCheckIn, HealthCheckup,
 *      BodyMeasurement, FinanceEntry, LifeAssessment, IdentityVersion.
 *    A fact is never edited or deleted. Undoing a completion appends a `reversal`;
 *    unchecking a habit appends a check-in with `done: false`. The latest fact wins.
 * 3. No invented numbers: every percentage is derived in `selectors.ts`.
 */
export type EntityId = string;
export type ISODateTime = string;
/** Calendar date without time, `YYYY-MM-DD`, in the person's local time. */
export type ISODate = string;

export interface OwnedEntity { id: EntityId; userId: EntityId; createdAt: ISODateTime; updatedAt: ISODateTime; }
export type EntityMeta = keyof OwnedEntity;
export type Draft<T extends OwnedEntity> = Omit<T, EntityMeta>;
export type Priority = 'low' | 'normal' | 'high';

/* ── Life areas and MAAS (Método CIS) ───────────────────────────────────── */

export type AreaDiagnostic = 'well' | 'attention' | 'critical' | 'unknown';
export interface LifeArea extends OwnedEntity { name: string; description: string; color: string; icon: string; position: number; diagnostic: AreaDiagnostic; }
/** Semester cycle id, e.g. `2026-S2`. */
export type CycleId = `${number}-S${1 | 2}`;
/** Consciousness axis: subjective 1 to 10 per area, one snapshot per cycle (latest wins). */
export interface LifeAssessment extends OwnedEntity { cycle: CycleId; period: string; assessedAt: ISODateTime; scores: Record<EntityId, number>; }
export interface AreaNote extends OwnedEntity { areaId: EntityId; content: string; }

/* ── Direction ──────────────────────────────────────────────────────────── */

export interface Vision extends OwnedEntity { title: string; statement: string; areaId?: EntityId; }

export type GoalHorizon = 'current' | 'future';
/** Optional measurable target. Baseline is the first real record, never typed in. */
export type GoalMeasure = { kind: 'weight'; targetKg: number };
export interface Goal extends OwnedEntity {
  title: string;
  areaId: EntityId;
  visionId?: EntityId;
  cycle?: CycleId;
  horizon: GoalHorizon;
  status: 'active' | 'paused' | 'achieved';
  targetDate?: ISODate;
  measure?: GoalMeasure;
  /** Short line shown on goal cards. */
  why?: string;
}
export interface Project extends OwnedEntity { title: string; areaId: EntityId; goalId?: EntityId; status: 'active' | 'paused' | 'complete'; focus?: boolean; }

/* ── Execution ──────────────────────────────────────────────────────────── */

export type TaskOrigin = 'planned' | 'captured';
/** One list for every planned action. `captured` = Demanda. */
export interface Task extends OwnedEntity {
  title: string;
  origin: TaskOrigin;
  areaId?: EntityId;
  projectId?: EntityId;
  goalId?: EntityId;
  dueAt?: ISODateTime;
  dueHasTime?: boolean;
  priority: Priority;
  estimateMinutes?: number;
}

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

/**
 * Immutable fact.
 * - `completion`: a Task was finished.
 * - `reversal`: annuls an earlier completion (`reversesId`). Nothing is deleted.
 * - `session`: time dedicated to a Task, Project or Area.
 * - `attended`: a CalendarEvent took place.
 */
export type ExecutionKind = 'completion' | 'reversal' | 'session' | 'attended';
export interface ExecutionRecord extends OwnedEntity {
  kind: ExecutionKind;
  occurredAt: ISODateTime;
  taskId?: EntityId;
  eventId?: EntityId;
  reversesId?: EntityId;
  /** Copied from the plan at record time so history survives re-planning. */
  areaId?: EntityId;
  projectId?: EntityId;
  goalId?: EntityId;
  durationMinutes?: number;
  note?: string;
}

/* ── Habits ─────────────────────────────────────────────────────────────── */

/** Plan of a repeated behaviour. `timesPerWeek` applies to weekly habits. */
export interface Habit extends OwnedEntity { title: string; areaId: EntityId; goalId?: EntityId; frequency: 'daily' | 'weekly'; timesPerWeek?: number; icon?: string; active: boolean; }
/** Fact for one day. The latest check-in of a habit on a date is its state. */
export interface HabitCheckIn extends OwnedEntity { habitId: EntityId; date: ISODate; done: boolean; occurredAt: ISODateTime; }

/* ── Health (bio-maintenance) ───────────────────────────────────────────── */

export type CheckupKind = 'blood_test' | 'medical' | 'dental';
/** A preventive check-up that happened. `lastBloodTestDate` and friends are derived from these. */
export interface HealthCheckup extends OwnedEntity { kind: CheckupKind; date: ISODate; note?: string; }
export interface BodyMeasurement extends OwnedEntity { date: ISODate; weightKg: number; note?: string; }

/* ── Finance ────────────────────────────────────────────────────────────── */

export type IncomeCategory = 'salary' | 'prolabore' | 'freelance' | 'sales' | 'investments' | 'other_income';
export type ExpenseCategory = 'housing' | 'food' | 'transport' | 'health' | 'education' | 'leisure' | 'subscriptions' | 'taxes' | 'personal_care' | 'business' | 'other_expense';
export type FinanceCategory = IncomeCategory | ExpenseCategory | 'vault';
/**
 * Money that moved. Values in cents (BRL) to avoid floating point errors.
 * `vault_deposit` moves money from the available balance into a vault.
 * Vaults are untouchable: there is no withdrawal type.
 */
export interface FinanceEntry extends OwnedEntity { type: 'income' | 'expense' | 'vault_deposit'; amountCents: number; date: ISODate; category: FinanceCategory; description: string; vaultId?: EntityId; }
/** Destination vault (plan). Balance is the sum of its deposits. */
export interface FinanceVault extends OwnedEntity { name: string; targetCents: number; goalId?: EntityId; color: string; icon: string; }

/* ── Identity ───────────────────────────────────────────────────────────── */

export interface IdentityManifest { core: string; becoming: string; acting: string; positioning: string; declaration: string; strengthen: string[]; transform: string[]; }
/** Every save is a new version. The latest is the current manifest; earlier ones are history. */
export interface IdentityVersion extends OwnedEntity, IdentityManifest { savedAt: ISODateTime; }

/* ── Future modules ─────────────────────────────────────────────────────── */

export interface Study extends OwnedEntity { title: string; areaId?: EntityId; status: 'planned' | 'active' | 'completed'; }
export interface LibraryItem extends OwnedEntity { title: string; kind: 'book' | 'article' | 'verse' | 'quote'; }
export interface Review extends OwnedEntity { cycle: 'weekly' | 'monthly' | 'maas'; periodStart: ISODate; periodEnd: ISODate; notes?: string; }

/* ── Aggregate ──────────────────────────────────────────────────────────── */

export interface LifeSnapshot {
  areas: LifeArea[];
  assessments: LifeAssessment[];
  areaNotes: AreaNote[];
  visions: Vision[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
  executions: ExecutionRecord[];
  habits: Habit[];
  habitCheckIns: HabitCheckIn[];
  healthCheckups: HealthCheckup[];
  bodyMeasurements: BodyMeasurement[];
  financeEntries: FinanceEntry[];
  vaults: FinanceVault[];
  identityVersions: IdentityVersion[];
}
export type Collection = keyof LifeSnapshot;
export type EntityOf<C extends Collection> = LifeSnapshot[C][number];

/** Collections that hold facts. They only accept inserts, in the app and in the database. */
export const factCollections = ['assessments', 'executions', 'habitCheckIns', 'healthCheckups', 'bodyMeasurements', 'financeEntries', 'identityVersions'] as const satisfies readonly Collection[];
export type FactCollection = (typeof factCollections)[number];
export type PlanCollection = Exclude<Collection, FactCollection>;
export const collections: Collection[] = ['areas', 'assessments', 'areaNotes', 'visions', 'goals', 'projects', 'tasks', 'events', 'executions', 'habits', 'habitCheckIns', 'healthCheckups', 'bodyMeasurements', 'financeEntries', 'vaults', 'identityVersions'];

export const emptySnapshot = (): LifeSnapshot => ({ areas: [], assessments: [], areaNotes: [], visions: [], goals: [], projects: [], tasks: [], events: [], executions: [], habits: [], habitCheckIns: [], healthCheckups: [], bodyMeasurements: [], financeEntries: [], vaults: [], identityVersions: [] });

export function createEntity<T extends OwnedEntity>(userId: EntityId, draft: Draft<T>, now = new Date()): T {
  const stamp = now.toISOString();
  return { ...draft, id: crypto.randomUUID(), userId, createdAt: stamp, updatedAt: stamp } as T;
}
export function touch<T extends OwnedEntity>(entity: T, change: Partial<Draft<T>>, now = new Date()): T {
  return { ...entity, ...change, id: entity.id, userId: entity.userId, createdAt: entity.createdAt, updatedAt: now.toISOString() };
}

/* ── Dates ──────────────────────────────────────────────────────────────── */

const pad = (value: number) => String(value).padStart(2, '0');
export const toISODate = (date: Date): ISODate => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const fromISODate = (value: ISODate) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
export const cycleOf = (date: Date): CycleId => `${date.getFullYear()}-S${date.getMonth() < 6 ? 1 : 2}` as CycleId;
export const cycleLabel = (cycle: CycleId) => { const [year, half] = cycle.split('-S'); return `${half}º semestre de ${year}`; };
