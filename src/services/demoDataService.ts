import { createDemoSnapshot, DEMO_USER_ID } from '../data/demo';
import type { DataService } from './repository';

/**
 * In-memory adapter used when Supabase is not configured.
 * The store already holds the state, so writes are accepted and discarded:
 * nothing is persisted in the browser, by design.
 */
export const demoDataService: DataService = {
  mode: 'demo',
  auth: {
    currentUser: async () => ({ id: DEMO_USER_ID, name: 'Mands Prates' }),
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined
  },
  load: async userId => createDemoSnapshot(userId),
  save: async () => undefined,
  remove: async () => undefined
};
