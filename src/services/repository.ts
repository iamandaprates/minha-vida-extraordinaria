import type { CalendarEvent, Collection, EntityId, EntityOf, LifeSnapshot, OwnedEntity, PlanCollection } from '../domain/models';

/** Cloud is the source of truth. `services/supabase.ts` is the first concrete adapter. */
export interface CloudRepository<T extends OwnedEntity> {
  list(userId: EntityId): Promise<T[]>;
  get(userId: EntityId, id: EntityId): Promise<T | null>;
  save(userId: EntityId, value: T): Promise<T>;
  remove(userId: EntityId, id: EntityId): Promise<void>;
}

export interface AuthUser { id: EntityId; email?: string; name?: string; }
export interface AuthService { currentUser(): Promise<AuthUser | null>; signInWithGoogle(): Promise<void>; signOut(): Promise<void>; }

/**
 * What the app state talks to. One implementation per backend:
 * `demoDataService` (local mode on this device, IndexedDB, same real seed) and `supabaseDataService` (cloud).
 */
export interface DataService {
  readonly mode: 'demo' | 'cloud';
  readonly auth: AuthService;
  /** Loads every collection of one person. Seeds Mands' real initial state on first access. */
  load(userId: EntityId): Promise<LifeSnapshot>;
  /** Upsert for plans, insert for facts. Facts are never updated. */
  save<C extends Collection>(collection: C, entity: EntityOf<C>): Promise<void>;
  /** Only plans can be removed. Facts are permanent history. */
  remove(collection: PlanCollection, userId: EntityId, id: EntityId): Promise<void>;
  /** Something the person should know about the last load (offline copy, storage unavailable). */
  notice?(): string | undefined;
}

export interface CalendarProvider { connect(): Promise<void>; listEvents(from: string, to: string): Promise<CalendarEvent[]>; upsertEvent(event: CalendarEvent): Promise<CalendarEvent>; }
/** Adapter boundary for future bidirectional Google Calendar synchronization. */
export interface GoogleCalendarSync { pull(from: string, to: string): Promise<CalendarEvent[]>; push(event: CalendarEvent): Promise<CalendarEvent>; }
