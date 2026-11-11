import { del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * Persistência local da Mive: IndexedDB via idb-keyval. Funciona offline e sobrevive ao
 * recarregar a página. A sincronização opcional com Supabase (Fase 8) entra como uma
 * segunda camada por cima desta, sem mudar a forma dos dados.
 */
export const idbStorage: StateStorage = {
  getItem: async name => (await get<string>(name)) ?? null,
  setItem: async (name, value) => { await set(name, value); },
  removeItem: async name => { await del(name); }
};

export const STORAGE_KEY = 'mive-data';
export const SCHEMA_VERSION = 3;
