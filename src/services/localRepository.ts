import type { EntityId, OwnedEntity } from '../domain/models';
import type { CloudRepository } from './repository';

/** Namespace for every key written by the app. Bump the version when the stored shape needs a migration. */
export const STORAGE_PREFIX = 'mve:v1';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Uses localStorage when it works. If browser storage is unavailable, the caller receives the real persistence error. */
function resolveStorage(): KeyValueStorage {
  const storage = window.localStorage;
  storage.setItem('__mve_probe__', '1');
  storage.removeItem('__mve_probe__');
  return storage;
}

/**
 * Local implementation of the CloudRepository contract (src/services/repository.ts).
 * It is the only place that touches browser storage. A Supabase/Firebase/API repository can replace it
 * in areasStore.ts without changing any component.
 */
export class LocalStorageRepository<T extends OwnedEntity> implements CloudRepository<T> {
  private readonly collection: string;
  constructor(collection: string) { this.collection = collection; }

  private key(userId: EntityId) { return `${STORAGE_PREFIX}:${this.collection}:${userId}`; }

  private read(userId: EntityId): T[] {
    const storage = resolveStorage();
    const key = this.key(userId);
    const raw = storage.getItem(key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch { /* corrupted payload, preserved below */ }
    storage.setItem(`${key}:corrupted:${Date.now()}`, raw);
    return [];
  }

  private write(userId: EntityId, items: T[]) {
    resolveStorage().setItem(this.key(userId), JSON.stringify(items));
  }

  async list(userId: EntityId) { return this.read(userId); }
  async get(userId: EntityId, id: EntityId) { return this.read(userId).find(item => item.id === id) ?? null; }
  async save(userId: EntityId, value: T) {
    const items = this.read(userId);
    const index = items.findIndex(item => item.id === value.id);
    if (index >= 0) items[index] = value; else items.push(value);
    this.write(userId, items);
    return value;
  }
  async remove(userId: EntityId, id: EntityId) { this.write(userId, this.read(userId).filter(item => item.id !== id)); }
}
