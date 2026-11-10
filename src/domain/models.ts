/**
 * Domain model of Mive.
 *
 * 1. Single source of truth: every action, goal, habit, idea or commitment is ONE record.
 *    Screens never copy data; they read the same snapshot through selectors.
 * 2. Planning is not reality:
 *    - Plans (editable): Goal, Project, Task, CalendarEvent, Habit, FinanceVault, Idea,
 *      StudyDeck, StudySubject, Flashcard, Playlist, AreaNote, LifeArea, AestheticRitual,
 *      UserProfile.
 *    - Facts (append-only): ExecutionRecord, BehaviorEvent, HabitCheckIn, HealthMarker,
 *      FinanceEntry, StudySession, FlashcardReview, AestheticRecord, LifeAssessment,
 *      CisRecord, IdentityProfile, Evidence.
 *    A fact is never edited or deleted. Undoing a completion appends a `reversal`;
 *    postponing a task appends a `postponement`; the latest fact wins.
 * 3. No invented numbers: every percentage is derived in `selectors.ts`.
 */
export type EntityId = string;
export type ISODateTime = string;
/** Calendar date without time, `YYYY-MM-DD`, in local time. */
export type ISODate = string;

export interface OwnedEntity { id: EntityId; userId: EntityId; createdAt: ISODateTime; updatedAt: ISODateTime; }
export type EntityMeta = keyof OwnedEntity;
export type Draft<T extends OwnedEntity> = Omit<T, EntityMeta>;
export type Priority = 'low' | 'normal' | 'high';

/* ── Life areas and Método CIS ──────────────────────────────────────────── */

export type AreaDiagnostic = 'well' | 'attention' | 'critical' | 'unknown';
export interface LifeArea extends OwnedEntity { name: string; description: string; color: string; icon: string; position: number; diagnostic: AreaDiagnostic; }
export type CycleId = `${number}-S${1 | 2}`;
/** Self-assessment of the cycle (1 to 10 for each of the 12 areas). */
export interface LifeAssessment extends OwnedEntity { cycle: CycleId; period: string; assessedAt: ISODateTime; scores: Record<EntityId, number>; }
export interface AreaNote extends OwnedEntity { areaId: EntityId; content: string; }

/**
 * Historical CIS instruments, kept exactly as recorded. Each instrument has its own
 * dimensions, so they are never merged with each other or with the 12 areas.
 */
export type CisInstrument = 'maas' | 'mais' | 'eval55';
export interface CisRecord extends OwnedEntity {
  instrument: CisInstrument;
  title: string;
  source: string;
  /** Dimension label → score. `null` means "não se aplica". Order is preserved. */
  scores: { label: string; score: number | null }[];
  scale: number;
  priorities?: string[];
  bottlenecks?: string[];
  totalPoints?: number;
  recordedAt?: ISODate;
}

/* ── Identity ("Eu Sou") ────────────────────────────────────────────────── */

export interface SerFazerTer { ser: string[]; fazer: string[]; ter: string[]; }
export interface Reference { name: string; relation?: string; }
/** Personal image dossier: recommended palette (hex), silhouette lines and visual archetype. */
export interface ImageDossier { palette: string[]; silhouette: string[]; archetype: string; notes?: string; }
/** Every save is a new version; the latest is the current profile. */
export interface IdentityProfile extends OwnedEntity { declarations: string[]; serFazerTer: SerFazerTer; references: Reference[]; imageDossier?: ImageDossier; savedAt: ISODateTime; }
/** Account presentation: display name and photo (a small JPEG data URL, resized on upload). */
export interface UserProfile extends OwnedEntity { displayName?: string; photoDataUrl?: string; }
/** Evidence bank: a past achievement to come back to when confidence drops. */
export interface Evidence extends OwnedEntity { title: string; date?: ISODate; note?: string; areaId?: EntityId; }

/* ── Goals and projects ─────────────────────────────────────────────────── */

export type GoalHorizon = 'current' | 'future';
export type GoalMeasure =
  | { kind: 'weight'; startKg: number; targetKg: number; checkpointsKg: number[] }
  | { kind: 'monthlyIncome'; targetCents: number };
export interface Goal extends OwnedEntity {
  title: string;
  areaId: EntityId;
  cycle?: CycleId;
  horizon: GoalHorizon;
  status: 'active' | 'paused' | 'achieved';
  position?: number;
  measure?: GoalMeasure;
  why?: string;
  color?: string;
  /** Pillar of the Mands S.A. index this goal feeds. */
  pillar?: 'health' | 'business' | 'studies' | 'finance' | 'language';
}
/** `tag` links ideas: a project with tag "CAVU" shows every idea tagged #CAVU. */
export interface Project extends OwnedEntity { title: string; areaId: EntityId; goalId?: EntityId; status: 'active' | 'paused' | 'complete'; focus?: boolean; tag?: string; }

/* ── Execution ──────────────────────────────────────────────────────────── */

export type TaskOrigin = 'planned' | 'captured' | 'idea';
export type FocusRole = 'magna' | 'secondary';
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
  /**
   * Day on which this task is one of the 3 deliveries of the day (1 magna + up to 2
   * secondary). The pin expires with the day: unfinished deliveries simply return to their
   * project, without any red "overdue" pile.
   */
  focusOn?: ISODate;
  focusRole?: FocusRole;
  /** A milestone of its goal: counts in the "Marcos" part of the progress. */
  isMilestone?: boolean;
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
 * - `completion`: a Task was finished.  - `reversal`: annuls a completion (`reversesId`).
 * - `postponement`: the due date moved (`fromDueAt` → `toDueAt`). Three or more = stalled.
 * - `session`: focused time on a Task, Project or Area.  - `attended`: an event took place.
 */
export type ExecutionKind = 'completion' | 'reversal' | 'postponement' | 'session' | 'attended';
export interface ExecutionRecord extends OwnedEntity {
  kind: ExecutionKind;
  occurredAt: ISODateTime;
  taskId?: EntityId;
  eventId?: EntityId;
  reversesId?: EntityId;
  fromDueAt?: ISODateTime;
  toDueAt?: ISODateTime;
  areaId?: EntityId;
  projectId?: EntityId;
  goalId?: EntityId;
  durationMinutes?: number;
  note?: string;
}

/**
 * Behavioural facts that feed the Evolução metrics (initiation, focus, resumption, finish).
 * - `focus_planned` / `focus_unplanned`: a delivery entered or left the day's 3 deliveries.
 * - `session_start`, `session_pause`, `session_resume`, `session_end`: Modo Foco timeline.
 * - `unblock`: a "Preciso Começar" trigger was used.
 */
export type BehaviorKind = 'focus_planned' | 'focus_unplanned' | 'session_start' | 'session_pause' | 'session_resume' | 'session_end' | 'unblock';
export type UnblockTrigger = 'no_start' | 'too_big' | 'perfectionism' | 'distracted' | 'low_energy' | 'avoiding';
export interface BehaviorEvent extends OwnedEntity {
  kind: BehaviorKind;
  occurredAt: ISODateTime;
  date: ISODate;
  sessionId?: string;
  taskId?: EntityId;
  role?: FocusRole;
  trigger?: UnblockTrigger;
  plannedMinutes?: number;
  focusedMinutes?: number;
  note?: string;
}

/* ── Habits ─────────────────────────────────────────────────────────────── */

export interface Habit extends OwnedEntity { title: string; areaId: EntityId; goalId?: EntityId; frequency: 'daily' | 'weekly'; timesPerWeek?: number; icon?: string; active: boolean; blockMinutes?: number; }
export interface HabitCheckIn extends OwnedEntity { habitId: EntityId; date: ISODate; done: boolean; occurredAt: ISODateTime; }

/* ── Health (bio-maintenance) ───────────────────────────────────────────── */

export type CheckupKind = 'blood_test' | 'medical' | 'dental';
export type HealthMarkerKind = CheckupKind | 'weight';
/** One health fact: a preventive check-up on a date, or a weight measurement. */
export interface HealthMarker extends OwnedEntity { kind: HealthMarkerKind; date: ISODate; valueKg?: number; note?: string; }

/* ── Bem-estar & Imagem ─────────────────────────────────────────────────── */

/** A beauty or maintenance ritual with its return interval (plan). */
export interface AestheticRitual extends OwnedEntity { name: string; intervalDays: number; icon: string; position: number; }
/** The ritual happened on this date (fact). */
export interface AestheticRecord extends OwnedEntity { ritualId: EntityId; date: ISODate; note?: string; }

/* ── Finance ────────────────────────────────────────────────────────────── */

export type IncomeCategory = 'salary' | 'prolabore' | 'freelance' | 'sales' | 'investments' | 'other_income';
export type ExpenseCategory = 'housing' | 'food' | 'transport' | 'health' | 'education' | 'leisure' | 'subscriptions' | 'taxes' | 'personal_care' | 'business' | 'other_expense';
export type FinanceCategory = IncomeCategory | ExpenseCategory | 'vault';
/** Money that moved, in cents (BRL). `vault_deposit` moves money into an untouchable vault. */
export interface FinanceEntry extends OwnedEntity { type: 'income' | 'expense' | 'vault_deposit'; amountCents: number; date: ISODate; category: FinanceCategory; description: string; vaultId?: EntityId; }
export interface FinanceVault extends OwnedEntity { name: string; targetCents: number; goalId?: EntityId; color: string; icon: string; }

/* ── Ideas ──────────────────────────────────────────────────────────────── */

export type IdeaCategory = 'cavu' | 'cafe_baiano' | 'geral';
export interface IdeaMedia { kind: 'link' | 'image'; url: string; name?: string; }
export interface Idea extends OwnedEntity {
  title: string;
  category: IdeaCategory;
  status: 'inbox' | 'converted' | 'archived';
  taskId?: EntityId;
  projectId?: EntityId;
  description?: string;
  /** Free tags without "#", e.g. ["CAVU", "Marketing"]. */
  tags: string[];
  media: IdeaMedia[];
}

/* ── Studies ────────────────────────────────────────────────────────────── */

/** A study track (discipline): Concurso PRF, Inglês, Administração... Holds subjects and flashcards. */
export interface StudyDeck extends OwnedEntity { name: string; color: string; position: number; goalId?: EntityId; }
export interface StudySubject extends OwnedEntity { name: string; deckId: EntityId; position: number; goalId?: EntityId; }
/** A study block that happened, optionally with questions solved and correct answers. */
export interface StudySession extends OwnedEntity { subjectId: EntityId; date: ISODate; minutes: number; questions?: number; correct?: number; note?: string; }
export interface Flashcard extends OwnedEntity { deckId: EntityId; front: string; back: string; }
/** Anki answers. The SM-2 schedule is derived from the full review history. */
export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';
export interface FlashcardReview extends OwnedEntity { cardId: EntityId; rating: FlashcardRating; reviewedAt: ISODateTime; }

/* ── Music ──────────────────────────────────────────────────────────────── */

export interface Playlist extends OwnedEntity { name: string; mood: 'focus' | 'workout' | 'calm'; spotifyUri: string; position: number; }

/* ── Aggregate ──────────────────────────────────────────────────────────── */

export interface LifeSnapshot {
  profiles: UserProfile[];
  areas: LifeArea[];
  assessments: LifeAssessment[];
  cisRecords: CisRecord[];
  areaNotes: AreaNote[];
  identityProfiles: IdentityProfile[];
  evidences: Evidence[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
  executions: ExecutionRecord[];
  behaviorEvents: BehaviorEvent[];
  habits: Habit[];
  habitCheckIns: HabitCheckIn[];
  healthMarkers: HealthMarker[];
  aestheticRituals: AestheticRitual[];
  aestheticRecords: AestheticRecord[];
  financeEntries: FinanceEntry[];
  vaults: FinanceVault[];
  ideas: Idea[];
  studyDecks: StudyDeck[];
  studySubjects: StudySubject[];
  studySessions: StudySession[];
  flashcards: Flashcard[];
  flashcardReviews: FlashcardReview[];
  playlists: Playlist[];
}
export type Collection = keyof LifeSnapshot;
export type EntityOf<C extends Collection> = LifeSnapshot[C][number];

export const factCollections = ['assessments', 'cisRecords', 'identityProfiles', 'evidences', 'executions', 'behaviorEvents', 'habitCheckIns', 'healthMarkers', 'aestheticRecords', 'financeEntries', 'studySessions', 'flashcardReviews'] as const satisfies readonly Collection[];
export type FactCollection = (typeof factCollections)[number];
export type PlanCollection = Exclude<Collection, FactCollection>;
export const collections: Collection[] = ['profiles', 'areas', 'assessments', 'cisRecords', 'areaNotes', 'identityProfiles', 'evidences', 'goals', 'projects', 'tasks', 'events', 'executions', 'behaviorEvents', 'habits', 'habitCheckIns', 'healthMarkers', 'aestheticRituals', 'aestheticRecords', 'financeEntries', 'vaults', 'ideas', 'studyDecks', 'studySubjects', 'studySessions', 'flashcards', 'flashcardReviews', 'playlists'];

export const emptySnapshot = (): LifeSnapshot => Object.fromEntries(collections.map(collection => [collection, []])) as unknown as LifeSnapshot;

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
