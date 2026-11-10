/**
 * Tipos centrais da Mive. Cada fase acrescenta os seus aqui.
 * Regra de ouro: o que aconteceu (eventos) é registrado num log único e nunca editado.
 */

export type ThemeMode = 'light' | 'dark';

export interface Profile {
  name: string;
  /** Foto redimensionada (JPEG em data URL), salva localmente. */
  photo?: string;
  createdAt: string;
  /** Preenchido quando a usuária termina as boas-vindas. */
  onboardedAt?: string;
}

export interface Settings {
  theme: ThemeMode;
  /** Link de playlist do Spotify para o mini-player (embed). */
  spotifyUrl?: string;
}

/** Eventos comportamentais. O módulo Evolução calcula as taxas a partir deste log. */
export type BehaviorKind = 'task_planned' | 'task_started' | 'session_paused' | 'session_resumed' | 'task_completed' | 'unblock_used';
export interface BehaviorEvent {
  id: string;
  kind: BehaviorKind;
  at: string;
  taskId?: string;
  meta?: Record<string, string | number | boolean>;
}

/** Tudo o que a Mive guarda. É exatamente o conteúdo do backup JSON. */
export interface MiveData {
  profile: Profile | null;
  settings: Settings;
  behaviorLog: BehaviorEvent[];
}

export interface BackupFile {
  app: 'mive';
  schemaVersion: number;
  exportedAt: string;
  data: MiveData;
}
