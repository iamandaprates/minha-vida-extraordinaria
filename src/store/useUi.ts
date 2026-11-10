import { create } from 'zustand';

/** Estado de interface compartilhado (não é salvo). */
interface UiState { spotifyOpen: boolean; setSpotifyOpen(open: boolean): void; }
export const useUi = create<UiState>()(set => ({ spotifyOpen: false, setSpotifyOpen: spotifyOpen => set({ spotifyOpen }) }));
