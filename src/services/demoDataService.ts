import { reconcileAreas } from '../data/areas';
import { createDemoSnapshot, DEMO_USER_ID } from '../data/demo';
import type { Collection, EntityOf, LifeSnapshot } from '../domain/models';
import { createLifeStorage, requestPersistentStorage, storageAvailable } from './lifeStorage';
import type { DataService } from './repository';

/**
 * Local mode, used when Supabase is not configured: this device is the source of truth.
 *
 * The first access writes Mands' real initial state to IndexedDB; from then on every plan and
 * fact is saved there, so the app opens with its data after a reload and without internet.
 * Nothing leaves the browser.
 *
 * When IndexedDB is not available (some private windows), it falls back to memory for the
 * session and says so through `notice()`.
 */
const storage = createLifeStorage('mive-local');
let persistent = true;
let notice: string | undefined;
const memoryNotice = 'Este navegador não permitiu salvar neste aparelho. Seus registros valem só para esta sessão.';

async function openSnapshot(userId: string): Promise<LifeSnapshot> {
  const stored = await storage.read(userId);
  const snapshot = stored ?? createDemoSnapshot(userId);
  // The 12 official areas: catalogue names and order, the person's diagnostic preserved.
  const { areas, changed } = reconcileAreas(snapshot.areas, userId);
  snapshot.areas = areas;
  if (!stored) await storage.write(userId, snapshot);
  else for (const area of changed) await storage.upsert(userId, 'areas', area);
  requestPersistentStorage();
  return snapshot;
}

export const demoDataService: DataService = {
  mode: 'demo',
  auth: {
    currentUser: async () => ({ id: DEMO_USER_ID, name: 'Mands Prates' }),
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined
  },
  async load(userId) {
    persistent = storageAvailable();
    notice = undefined;
    if (persistent) {
      try { return await openSnapshot(userId); }
      catch (error) { console.error(error); persistent = false; }
    }
    notice = memoryNotice;
    return createDemoSnapshot(userId);
  },
  async save<C extends Collection>(collection: C, entity: EntityOf<C>) { if (persistent) await storage.upsert(entity.userId, collection, entity); },
  async remove(collection, userId, id) { if (persistent) await storage.remove(userId, collection, id); },
  notice: () => notice
};
