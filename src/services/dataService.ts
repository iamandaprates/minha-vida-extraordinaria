import { demoDataService } from './demoDataService';
import type { DataService } from './repository';

/**
 * Cloud when Supabase is configured, otherwise the in-memory demonstration.
 * The Supabase client is loaded on demand, so the demo bundle does not carry it.
 */
export function createDataService(): DataService {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return demoDataService;
  let cloud: Promise<DataService> | undefined;
  const service = () => (cloud ??= import('./supabase').then(module => module.createSupabaseDataService({ url, anonKey })));
  return {
    mode: 'cloud',
    auth: {
      currentUser: async () => (await service()).auth.currentUser(),
      signInWithGoogle: async () => (await service()).auth.signInWithGoogle(),
      signOut: async () => (await service()).auth.signOut()
    },
    load: async userId => (await service()).load(userId),
    save: async (collection, entity) => (await service()).save(collection, entity),
    remove: async (collection, userId, id) => (await service()).remove(collection, userId, id)
  };
}
