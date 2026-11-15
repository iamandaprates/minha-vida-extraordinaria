import { createStore, del, get, getMany, set, setMany, update, type UseStore } from 'idb-keyval';
import { collections, emptySnapshot, type Collection, type EntityId, type EntityOf, type LifeSnapshot } from '../domain/models';

/**
 * IndexedDB persistence of one person's snapshot on this device.
 *
 * One key per collection (`<userId>:<collection>` → array of entities), so a write touches a
 * single list. Upserts and removals run inside one IndexedDB transaction (`update`), which
 * keeps two open tabs from overwriting each other.
 *
 * Used twice: as the source of truth of the local mode, and as the offline copy of the cloud.
 */
export interface LifeStorage {
  /** `null` when this person has nothing stored on the device yet. */
  read(userId: EntityId): Promise<LifeSnapshot | null>;
  /** Replaces everything stored for this person. */
  write(userId: EntityId, snapshot: LifeSnapshot): Promise<void>;
  upsert<C extends Collection>(userId: EntityId, collection: C, entity: EntityOf<C>): Promise<void>;
  remove(userId: EntityId, collection: Collection, id: EntityId): Promise<void>;
  clear(userId: EntityId): Promise<void>;
  /** Small values that belong to the device, not to the snapshot (e.g. the last signed-in person). */
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
}

interface Stamp { version: 1; savedAt: string; }
const keyOf = (userId: EntityId, collection: Collection) => `${userId}:${collection}`;
const stampOf = (userId: EntityId) => `${userId}:@stamp`;

export const storageAvailable = () => typeof indexedDB !== 'undefined';

/** Asks the browser to keep this origin's data even under storage pressure. Best effort. */
export function requestPersistentStorage() {
  try { void navigator.storage?.persist?.().catch(() => undefined); } catch { /* optional API */ }
}

export function createLifeStorage(databaseName: string): LifeStorage {
  let store: UseStore | undefined;
  const db = () => (store ??= createStore(databaseName, 'life'));
  type Entity = EntityOf<Collection>;

  return {
    async read(userId) {
      const stamp = await get<Stamp>(stampOf(userId), db());
      if (!stamp) return null;
      const lists = await getMany<Entity[] | undefined>(collections.map(collection => keyOf(userId, collection)), db());
      const snapshot = emptySnapshot();
      collections.forEach((collection, index) => { (snapshot[collection] as Entity[]) = lists[index] ?? []; });
      return snapshot;
    },
    async write(userId, snapshot) {
      const entries: [string, unknown][] = collections.map(collection => [keyOf(userId, collection), snapshot[collection] ?? []]);
      entries.push([stampOf(userId), { version: 1, savedAt: new Date().toISOString() } satisfies Stamp]);
      await setMany(entries, db());
    },
    async upsert(userId, collection, entity) {
      await update<Entity[]>(keyOf(userId, collection), (list = []) => list.some(item => item.id === entity.id) ? list.map(item => item.id === entity.id ? entity : item) : [...list, entity], db());
    },
    async remove(userId, collection, id) {
      await update<Entity[]>(keyOf(userId, collection), (list = []) => list.filter(item => item.id !== id), db());
    },
    async clear(userId) {
      for (const collection of collections) await del(keyOf(userId, collection), db());
      await del(stampOf(userId), db());
    },
    getMeta: key => get(`@meta:${key}`, db()),
    setMeta: (key, value) => value === undefined ? del(`@meta:${key}`, db()) : set(`@meta:${key}`, value, db())
  };
}
