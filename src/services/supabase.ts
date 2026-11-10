import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { seedLifeAreas } from '../data/areas';
import type { Collection, EntityId, EntityOf, LifeSnapshot, OwnedEntity } from '../domain/models';
import type { AuthService, CloudRepository, DataService } from './repository';

/**
 * Supabase adapter.
 *
 * Configuration (Vite env, see `.env.example`):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Schema and Row Level Security: `supabase/migrations/0001_lote1_base.sql`.
 *
 * Every table uses the composite key (user_id, id) and RLS restricts rows to `auth.uid()`.
 * Columns are snake_case; entities are camelCase. Only top-level keys are converted, so
 * JSON columns such as `scores` keep their area ids untouched.
 */

/* ── Client ─────────────────────────────────────────────────────────────── */

export interface SupabaseConfig { url: string; anonKey: string; }

export function readSupabaseConfig(env: Record<string, string | undefined> = import.meta.env): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

let client: SupabaseClient | null = null;
export function getSupabaseClient(config: SupabaseConfig): SupabaseClient {
  client ??= createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}

/* ── Tables and row mapping ─────────────────────────────────────────────── */

export const tables: Record<Collection, string> = {
  areas: 'life_areas',
  assessments: 'life_assessments',
  areaNotes: 'area_notes',
  goals: 'goals',
  projects: 'projects',
  tasks: 'tasks',
  events: 'calendar_events',
  executions: 'execution_records'
};

type Row = Record<string, unknown>;
const toSnake = (key: string) => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export function toRow<T extends OwnedEntity>(entity: T): Row {
  return Object.fromEntries(Object.entries(entity).map(([key, value]) => [toSnake(key), value === undefined ? null : value]));
}
export function fromRow<T extends OwnedEntity>(row: Row): T {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null).map(([key, value]) => [toCamel(key), value])) as unknown as T;
}

export class SupabaseSyncError extends Error {
  constructor(operation: string, table: string, cause: { message: string }) { super(`${operation} em ${table}: ${cause.message}`); this.name = 'SupabaseSyncError'; }
}

/* ── Repository per table ───────────────────────────────────────────────── */

export function createSupabaseRepository<T extends OwnedEntity>(supabase: SupabaseClient, table: string): CloudRepository<T> {
  return {
    async list(userId) {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order('created_at');
      if (error) throw new SupabaseSyncError('Leitura', table, error);
      return (data ?? []).map(row => fromRow<T>(row));
    },
    async get(userId, id) {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).eq('id', id).maybeSingle();
      if (error) throw new SupabaseSyncError('Leitura', table, error);
      return data ? fromRow<T>(data) : null;
    },
    async save(userId, value) {
      if (value.userId !== userId) throw new SupabaseSyncError('Gravação', table, { message: 'registro pertence a outra pessoa' });
      const { data, error } = await supabase.from(table).upsert(toRow(value), { onConflict: 'user_id,id' }).select().single();
      if (error) throw new SupabaseSyncError('Gravação', table, error);
      return fromRow<T>(data);
    },
    async remove(userId, id) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId).eq('id', id);
      if (error) throw new SupabaseSyncError('Remoção', table, error);
    }
  };
}

/* ── Auth (Google via Supabase) ─────────────────────────────────────────── */

export function createSupabaseAuthService(supabase: SupabaseClient): AuthService {
  return {
    async currentUser() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      return user ? { id: user.id, email: user.email, name: user.user_metadata?.full_name as string | undefined } : null;
    },
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  };
}

/* ── Data service ───────────────────────────────────────────────────────── */

type Repositories = { [C in Collection]: CloudRepository<EntityOf<C>> };

export function createSupabaseDataService(config: SupabaseConfig): DataService {
  const supabase = getSupabaseClient(config);
  const repositories = Object.fromEntries((Object.keys(tables) as Collection[]).map(collection => [collection, createSupabaseRepository(supabase, tables[collection])])) as Repositories;
  const repository = <C extends Collection>(collection: C) => repositories[collection] as CloudRepository<EntityOf<C>>;

  return {
    mode: 'cloud',
    auth: createSupabaseAuthService(supabase),
    async load(userId: EntityId): Promise<LifeSnapshot> {
      const [areas, assessments, areaNotes, goals, projects, tasks, events, executions] = await Promise.all([
        repository('areas').list(userId), repository('assessments').list(userId), repository('areaNotes').list(userId), repository('goals').list(userId),
        repository('projects').list(userId), repository('tasks').list(userId), repository('events').list(userId), repository('executions').list(userId)
      ]);
      if (!areas.length) {
        const seeded = seedLifeAreas(userId);
        await Promise.all(seeded.map(area => repository('areas').save(userId, area)));
        areas.push(...seeded);
      }
      return { areas: areas.sort((a, b) => a.position - b.position), assessments, areaNotes, goals, projects, tasks, events, executions };
    },
    async save(collection, entity) { await repository(collection).save(entity.userId, entity); },
    async remove(collection, userId, id) { await repository(collection).remove(userId, id); }
  };
}
