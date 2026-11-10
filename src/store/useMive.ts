import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BehaviorEvent, BehaviorKind, MiveData, Profile, Settings, ThemeMode } from '../types';
import { idbStorage, SCHEMA_VERSION, STORAGE_KEY } from './storage';

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const initialData = (): MiveData => ({
  profile: null,
  settings: { theme: prefersDark() ? 'dark' : 'light' },
  behaviorLog: []
});

interface MiveActions {
  setProfile(change: Partial<Omit<Profile, 'createdAt'>>): void;
  updateSettings(change: Partial<Settings>): void;
  toggleTheme(): void;
  /** Acrescenta um evento comportamental. O log nunca é editado nem apagado. */
  logBehavior(kind: BehaviorKind, data?: Omit<BehaviorEvent, 'id' | 'kind' | 'at'>): void;
  /** Substitui todos os dados (importação de backup). */
  replaceAll(data: MiveData): void;
}
export type MiveState = MiveData & MiveActions & { hydrated: boolean };

export const useMive = create<MiveState>()(
  persist(
    set => ({
      ...initialData(),
      hydrated: false,
      setProfile: change => set(state => ({ profile: { name: '', createdAt: new Date().toISOString(), ...state.profile, ...change } })),
      updateSettings: change => set(state => ({ settings: { ...state.settings, ...change } })),
      toggleTheme: () => set(state => ({ settings: { ...state.settings, theme: (state.settings.theme === 'dark' ? 'light' : 'dark') as ThemeMode } })),
      logBehavior: (kind, data) => set(state => ({ behaviorLog: [...state.behaviorLog, { id: crypto.randomUUID(), kind, at: new Date().toISOString(), ...data }] })),
      replaceAll: data => set({ profile: data.profile, settings: data.settings, behaviorLog: data.behaviorLog })
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: ({ profile, settings, behaviorLog }): MiveData => ({ profile, settings, behaviorLog }),
      onRehydrateStorage: () => () => useMive.setState({ hydrated: true })
    }
  )
);

/** Os dados puros, sem as ações (o mesmo formato do backup). */
export const selectData = (state: MiveState): MiveData => ({ profile: state.profile, settings: state.settings, behaviorLog: state.behaviorLog });
