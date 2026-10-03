/** Domain model: planned work is intentionally distinct from recorded execution. */
export type EntityId = string;
export type ISODateTime = string;
export interface OwnedEntity { id: EntityId; userId: EntityId; createdAt: ISODateTime; updatedAt: ISODateTime; }
export interface LifeArea extends OwnedEntity { name: string; color: string; icon?: string; }
export interface Vision extends OwnedEntity { statement: string; areaId?: EntityId; }
export interface Goal extends OwnedEntity { title: string; areaId: EntityId; visionId?: EntityId; targetDate?: string; status: 'active' | 'paused' | 'done'; }
export interface Project extends OwnedEntity { title: string; areaId: EntityId; goalId?: EntityId; status: 'active' | 'paused' | 'complete'; lastActivityAt?: ISODateTime; }
export interface Task extends OwnedEntity { title: string; projectId?: EntityId; goalId?: EntityId; areaId?: EntityId; dueAt?: ISODateTime; priority?: 'low' | 'normal' | 'high'; status: 'open' | 'done'; }
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
