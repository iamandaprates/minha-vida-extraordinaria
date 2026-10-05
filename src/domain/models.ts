/** Domain model: planned work is intentionally distinct from recorded execution. */
export type EntityId = string;
export type ISODateTime = string;
export interface OwnedEntity { id: EntityId; userId: EntityId; createdAt: ISODateTime; updatedAt: ISODateTime; }
export type AreaDiagnostic = 'well' | 'attention' | 'critical' | 'unknown';
export interface LifeArea extends OwnedEntity { name: string; description: string; color: string; icon?: string; currentScore?: number; lastAssessmentAt?: ISODateTime; diagnostic: AreaDiagnostic; }
export interface LifeAssessment extends OwnedEntity { period: string; assessedAt: ISODateTime; scores: Record<EntityId, number>; }
export interface AreaNote extends OwnedEntity { areaId: EntityId; content: string; }
/** Self diagnostic per life area. Static area data (name, color, icon) stays in src/data/areas.ts. */
export interface AreaState extends OwnedEntity { areaId: EntityId; diagnostic: AreaDiagnostic; }
export interface Vision extends OwnedEntity { statement: string; areaId?: EntityId; }
export interface Goal extends OwnedEntity { title: string; areaId: EntityId; visionId?: EntityId; targetDate?: string; status: 'active' | 'paused' | 'done'; }
export interface Project extends OwnedEntity { title: string; areaId: EntityId; goalId?: EntityId; status: 'active' | 'paused' | 'complete'; lastActivityAt?: ISODateTime; }
/** dueAt holds a calendar date (YYYY-MM-DD) for now; completedAt is set when status becomes done. */
export interface Task extends OwnedEntity { title: string; description?: string; projectId?: EntityId; goalId?: EntityId; areaId?: EntityId; dueAt?: ISODateTime; priority?: 'low' | 'normal' | 'high'; status: 'open' | 'done'; completedAt?: ISODateTime; }
export interface Demand extends OwnedEntity { title: string; areaId?: EntityId; priority?: 'low' | 'normal' | 'high'; status: 'inbox' | 'planned' | 'done'; }
export interface Habit extends OwnedEntity { title: string; areaId?: EntityId; frequency: 'daily' | 'weekly'; }
export interface HabitCheckIn extends OwnedEntity { habitId: EntityId; occurredAt: ISODateTime; value: boolean; }
export interface CalendarEvent extends OwnedEntity { title: string; startsAt: ISODateTime; endsAt: ISODateTime; areaId?: EntityId; category?: 'health' | 'finance' | 'professional' | 'personal' | 'social' | 'study' | 'leisure'; status: 'planned' | 'confirmed' | 'completed' | 'cancelled'; source: 'manual' | 'google'; externalId?: string; recurrenceId?: string; }
export interface ExecutionRecord extends OwnedEntity { taskId?: EntityId; areaId?: EntityId; occurredAt: ISODateTime; durationMinutes?: number; note?: string; }
export interface Study extends OwnedEntity { title: string; areaId?: EntityId; status: 'planned' | 'active' | 'completed'; }
export interface FinanceEntry extends OwnedEntity { amount: number; type: 'income' | 'expense'; areaId?: EntityId; occurredAt: ISODateTime; }
export interface LibraryItem extends OwnedEntity { title: string; kind: 'book' | 'article' | 'verse' | 'quote'; }
export interface Note extends OwnedEntity { content: string; areaId?: EntityId; }
export interface Idea extends OwnedEntity { content: string; areaId?: EntityId; }
export interface Decision extends OwnedEntity { title: string; rationale?: string; areaId?: EntityId; }
export interface Review extends OwnedEntity { cycle: 'weekly' | 'monthly' | 'maas'; periodStart: string; periodEnd: string; notes?: string; }
export interface Identity extends OwnedEntity { statement: string; }
