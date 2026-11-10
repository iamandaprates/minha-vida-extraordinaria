import type { BackupFile, MiveData } from '../types';
import { initialData } from './useMive';
import { SCHEMA_VERSION } from './storage';

/** Gera e baixa o backup JSON com todos os dados da Mive. */
export function downloadBackup(data: MiveData) {
  const file: BackupFile = { app: 'mive', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mive-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lê e valida um backup. Lança um erro com mensagem clara quando o arquivo não serve. */
export async function readBackup(file: File): Promise<MiveData> {
  let parsed: unknown;
  try { parsed = JSON.parse(await file.text()); } catch { throw new Error('Este arquivo não é um JSON válido.'); }
  const backup = parsed as Partial<BackupFile>;
  if (backup?.app !== 'mive' || typeof backup.data !== 'object' || backup.data === null) throw new Error('Este arquivo não é um backup da Mive.');
  if ((backup.schemaVersion ?? 0) > SCHEMA_VERSION) throw new Error('Este backup foi feito por uma versão mais nova da Mive.');
  const data = backup.data as Partial<MiveData>;
  if (!data.settings || !Array.isArray(data.behaviorLog)) throw new Error('O backup está incompleto.');
  // Backups da Fase 1 não têm projetos nem agenda: completa com o plano inicial.
  const base = initialData();
  const list = <K extends keyof MiveData>(key: K) => (Array.isArray(data[key]) ? data[key] : base[key]) as MiveData[K];
  return { ...base, profile: data.profile ?? null, settings: { theme: data.settings.theme === 'dark' ? 'dark' : 'light', spotifyUrl: data.settings.spotifyUrl }, behaviorLog: data.behaviorLog, projects: list('projects'), goals: list('goals'), tasks: list('tasks'), blocks: list('blocks'), habits: list('habits'), habitChecks: list('habitChecks'), ideas: list('ideas') };
}
