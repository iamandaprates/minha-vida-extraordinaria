import { demoDataService } from './demoDataService';
import { createLifeStorage, requestPersistentStorage, storageAvailable } from './lifeStorage';
import type { AuthUser, DataService } from './repository';

const offlineNotice = 'Sem conexão com a nuvem agora. Você está vendo a última cópia salva neste aparelho; novas alterações só são enviadas com internet.';
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * Cloud when Supabase is configured, otherwise the local mode (IndexedDB on this device).
 * The Supabase client is loaded on demand, so the local bundle does not carry it.
 *
 * The cloud stays the source of truth. Every successful load and write is mirrored to
 * IndexedDB, so the app still opens, read-only in practice, when there is no connection.
 */
export function createDataService(): DataService {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return demoDataService;

  let cloud: Promise<DataService> | undefined;
  const service = () => (cloud ??= import('./supabase').then(module => module.createSupabaseDataService({ url, anonKey })));
  const mirror = storageAvailable() ? createLifeStorage('mive-cloud-copy') : undefined;
  /** The mirror is a convenience: it must never break a cloud operation. */
  const quietly = (work: Promise<unknown> | undefined) => { void work?.catch(error => console.warn('Cópia local indisponível', error)); };
  let notice: string | undefined;

  return {
    mode: 'cloud',
    auth: {
      async currentUser() {
        try {
          const user = await (await service()).auth.currentUser();
          if (user) { quietly(mirror?.setMeta('user', user)); return user; }
          if (!isOffline()) return null;
        } catch (error) {
          if (!isOffline()) throw error;
        }
        return (await mirror?.getMeta<AuthUser>('user').catch(() => undefined)) ?? null;
      },
      signInWithGoogle: async () => (await service()).auth.signInWithGoogle(),
      async signOut() {
        const user = await mirror?.getMeta<AuthUser>('user').catch(() => undefined);
        await (await service()).auth.signOut();
        if (user) quietly(mirror?.clear(user.id));
        quietly(mirror?.setMeta('user', undefined));
      }
    },
    async load(userId) {
      try {
        const snapshot = await (await service()).load(userId);
        notice = undefined;
        quietly(mirror?.write(userId, snapshot));
        requestPersistentStorage();
        return snapshot;
      } catch (error) {
        const copy = await mirror?.read(userId).catch(() => null);
        if (!copy) throw error;
        console.warn('Nuvem indisponível, abrindo a cópia local', error);
        notice = offlineNotice;
        return copy;
      }
    },
    async save(collection, entity) {
      await (await service()).save(collection, entity);
      quietly(mirror?.upsert(entity.userId, collection, entity));
    },
    async remove(collection, userId, id) {
      await (await service()).remove(collection, userId, id);
      quietly(mirror?.remove(userId, collection, id));
    },
    notice: () => notice
  };
}
