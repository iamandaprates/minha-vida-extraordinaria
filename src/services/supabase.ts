import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createStarterPlan } from '../data/starter';
import { collections, emptySnapshot, factCollections, type Collection, type EntityId, type EntityOf, type LifeSnapshot, type OwnedEntity } from '../domain/models';
import type { AuthService, CloudRepository, DataService } from './repository';

/**
 * Supabase adapter.
 *
 * Configuration (Vite env, see `.env.example`):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Schema and Row Level Security: `supabase/migrations/` (0001 base, 0002 life system).
 * Fact tables accept only INSERT and SELECT under RLS: history cannot be rewritten.
 *
 * Every table uses the composite key (user_id, id) and RLS restricts rows to `auth.uid()`.
 * Columns are snake_case; entities are camelCase. Only top-level keys are converted, so
 * JSON columns such as `scores` keep their area ids untouched.
 */

/* ── Client ─────────────────────────────────────────────────────────────── */

/**
 * `accessToken` is for scripts (the Claude Code skills): requests run as that person,
 * so Row Level Security still applies, append-only rules included. The browser omits it
 * and uses the normal Google session.
 */
export interface SupabaseConfig { url: string; anonKey: string; accessToken?: string; }

export function readSupabaseConfig(env: Record<string, string | undefined>): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const accessToken = env.MVE_ACCESS_TOKEN?.trim() || undefined;
  return url && anonKey ? { url, anonKey, accessToken } : null;
}

let client: SupabaseClient | null = null;
export function getSupabaseClient(config: SupabaseConfig): SupabaseClient {
  client ??= config.accessToken
    ? createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${config.accessToken}` } } })
    : createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}

/* ── Tables and row mapping ─────────────────────────────────────────────── */

export const tables: Record<Collection, string> = {
  areas: 'life_areas',
  assessments: 'life_assessments',
  areaNotes: 'area_notes',
  visions: 'visions',
  goals: 'goals',
  projects: 'projects',
  tasks: 'tasks',
  events: 'calendar_events',
  executions: 'execution_records',
  habits: 'habits',
  habitCheckIns: 'habit_check_ins',
  healthCheckups: 'health_checkups',
  bodyMeasurements: 'body_measurements',
  financeEntries: 'finance_entries',
  vaults: 'finance_vaults',
  identityVersions: 'identity_versions'
};
const facts = new Set<Collection>(factCollections);

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

/** `appendOnly` repositories insert and never update, matching the RLS of fact tables. */
export function createSupabaseRepository<T extends OwnedEntity>(supabase: SupabaseClient, table: string, appendOnly = false): CloudRepository<T> {
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
      const query = appendOnly ? supabase.from(table).insert(toRow(value)) : supabase.from(table).upsert(toRow(value), { onConflict: 'user_id,id' });
      const { data, error } = await query.select().single();
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

export function createSupabaseAuthService(supabase: SupabaseClient, accessToken?: string): AuthService {
  return {
    async currentUser() {
      const user = accessToken ? (await supabase.auth.getUser(accessToken)).data.user : (await supabase.auth.getSession()).data.session?.user;
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
  const repositories = Object.fromEntries(collections.map(collection => [collection, createSupabaseRepository(supabase, tables[collection], facts.has(collection))])) as Repositories;
  const repository = <C extends Collection>(collection: C) => repositories[collection] as CloudRepository<EntityOf<C>>;

  return {
    mode: 'cloud',
    auth: createSupabaseAuthService(supabase, config.accessToken),
    async load(userId: EntityId): Promise<LifeSnapshot> {
      const lists = await Promise.all(collections.map(collection => repository(collection).list(userId)));
      const snapshot = Object.fromEntries(collections.map((collection, index) => [collection, lists[index]])) as unknown as LifeSnapshot;
      if (!snapshot.areas.length) {
        const starter = createStarterPlan(userId);
        // Order matters: areas and goals first, because other tables reference them.
        for (const collection of ['areas', 'goals', 'projects', 'habits', 'vaults', 'identityVersions'] as const) {
          const items = starter[collection] as EntityOf<typeof collection>[];
          await Promise.all(items.map(item => repository(collection).save(userId, item as never)));
          (snapshot[collection] as EntityOf<typeof collection>[]).push(...items);
        }
      }
      snapshot.areas.sort((a, b) => a.position - b.position);
      return { ...emptySnapshot(), ...snapshot };
    },
    async save(collection, entity) { await repository(collection).save(entity.userId, entity); },
    async remove(collection, userId, id) { await repository(collection).remove(userId, id); }
  };
}
