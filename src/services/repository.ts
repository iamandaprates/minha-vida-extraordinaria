import type { CalendarEvent, EntityId, OwnedEntity } from '../domain/models';

/** Cloud is the source of truth. Implement with Supabase/Firebase/API in a future batch. */
export interface CloudRepository<T extends OwnedEntity> {
  list(userId: EntityId): Promise<T[]>;
  get(userId: EntityId, id: EntityId): Promise<T | null>;
  save(userId: EntityId, value: T): Promise<T>;
  remove(userId: EntityId, id: EntityId): Promise<void>;
}
export interface AuthService { currentUser(): Promise<{ id: EntityId; email?: string } | null>; signInWithGoogle(): Promise<void>; signOut(): Promise<void>; }
export interface CalendarProvider { connect(): Promise<void>; listEvents(from: string, to: string): Promise<CalendarEvent[]>; upsertEvent(event: CalendarEvent): Promise<CalendarEvent>; }
/** Adapter boundary for future bidirectional Google Calendar synchronization. */
export interface GoogleCalendarSync { pull(from: string, to: string): Promise<CalendarEvent[]>; push(event: CalendarEvent): Promise<CalendarEvent>; }
/** Area records use entity references so future Goals, Projects and Actions are never duplicated. */
export interface AreaRelations { goalIds: EntityId[]; projectIds: EntityId[]; taskIds: EntityId[]; eventIds: EntityId[]; }
