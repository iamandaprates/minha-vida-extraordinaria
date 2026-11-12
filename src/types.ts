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

/**
 * Eventos comportamentais. O módulo Evolução calcula as taxas a partir deste log.
 * - task_planned / task_unplanned: entrou ou saiu das 3 entregas do dia
 * - task_started: começou uma sessão de foco numa tarefa
 * - session_paused / session_resumed / session_ended: linha do tempo do timer
 * - task_completed / task_reopened: conclusão (e correção) de uma tarefa
 * - unblock_used: usou uma intervenção do "Preciso Começar"
 */
export type BehaviorKind = 'task_planned' | 'task_unplanned' | 'task_started' | 'session_paused' | 'session_resumed' | 'session_ended' | 'task_completed' | 'task_reopened' | 'unblock_used' | 'card_reviewed';
export interface BehaviorEvent {
  id: string;
  kind: BehaviorKind;
  at: string;
  taskId?: string;
  meta?: Record<string, string | number | boolean>;
}

/** Data local no formato AAAA-MM-DD. */
export type ISODate = string;

export type AreaId = 'profissional' | 'financeiro' | 'saude' | 'bem-estar' | 'intelectual' | 'emocional' | 'espiritual' | 'conjugal' | 'familia' | 'social' | 'lazer' | 'servir';

export interface Project {
  id: string;
  name: string;
  areaId: AreaId;
  /** Tag que liga ideias ao projeto, sem "#". Ex.: "CAVU". */
  tag?: string;
  status: 'active' | 'paused' | 'done';
  createdAt: string;
}

export interface Milestone { id: string; title: string; doneAt?: string; }
export interface Goal {
  id: string;
  title: string;
  areaId: AreaId;
  projectId?: string;
  why?: string;
  milestones: Milestone[];
  createdAt: string;
}

export type DeliveryRole = 'magna' | 'secundaria';
export interface Task {
  id: string;
  title: string;
  projectId?: string;
  estimateMin?: number;
  /** Dia em que a tarefa é uma das 3 entregas. Passado o dia, ela volta em silêncio ao projeto. */
  plannedFor?: ISODate;
  role?: DeliveryRole;
  completedAt?: string;
  createdAt: string;
}

/** Bloco de tempo na Agenda (timeblocking). Pode estar ligado a uma tarefa. */
export interface AgendaBlock {
  id: string;
  title: string;
  date: ISODate;
  /** Início no formato HH:mm. */
  start: string;
  durationMin: number;
  taskId?: string;
  doneAt?: string;
}

export interface Habit { id: string; title: string; areaId: AreaId; }
export interface HabitCheck { habitId: string; date: ISODate; }

/** Ideia da Geladeira de Potencial (a guia completa chega na Fase 5). */
export interface Idea {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  links?: string[];
  /** Imagem anexada, guardada localmente como data URL JPEG. */
  image?: string;
  /** Tarefa criada a partir desta ideia ("Transformar em tarefa"). */
  taskId?: string;
  createdAt: string;
  archivedAt?: string;
}

/** Estudos: trilha → baralhos → cartões com revisão espaçada SM-2. */
export interface Track { id: string; name: string; createdAt: string; }
export interface Deck { id: string; trackId: string; name: string; createdAt: string; }
export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  /** Fator de facilidade do SM-2 (mínimo 1,3; começa em 2,5). */
  ease: number;
  /** Intervalo atual em dias. */
  interval: number;
  /** Repetições seguidas com acerto. */
  repetitions: number;
  /** Próxima revisão. */
  due: ISODate;
  lastReviewedAt?: string;
  createdAt: string;
}
/** Notas livres da guia Estudos. */
export interface StudyNotes { pat: string; shortList: string; }


/** Livro-caixa manual (sem Open Banking). Valores em centavos para não perder precisão. */
export type TransactionKind = 'receita' | 'despesa';
export interface Transaction {
  id: string;
  kind: TransactionKind;
  amountCents: number;
  category: string;
  date: ISODate;
  /** Para onde o dinheiro foi ou de onde veio (conta, cartão, pessoa). */
  destination?: string;
  /** Quando preenchido, a saída do caixa vira aporte neste cofre. */
  vaultId?: string;
  createdAt: string;
}
export interface VaultDeposit { id: string; amountCents: number; date: ISODate; transactionId?: string; }
export interface Vault { id: string; name: string; targetCents: number; deposits: VaultDeposit[]; createdAt: string; }

/** Saúde: peso e exames preventivos. */
export interface WeightEntry { id: string; date: ISODate; kg: number; }
export interface Exam { id: string; name: string; lastDate?: ISODate; }

/** Bem-estar & Imagem: rituais com ciclo de retorno. */
export interface Ritual { id: string; name: string; intervalDays: number; lastDate?: ISODate; }

/** Diagnóstico MAAS: notas 1 a 10 por área, com histórico. */
export interface MaasAssessment { id: string; date: ISODate; scores: Partial<Record<AreaId, number>>; note?: string; createdAt: string; }

/** Registro livre de uma ferramenta de área (diário, acordos, viagens, momentos...). */
export interface AreaEntry {
  id: string;
  areaId: AreaId;
  /** Chave da seção dentro da área (ex.: "gatilho", "viagem"). */
  section: string;
  title: string;
  body?: string;
  date?: ISODate;
  doneAt?: string;
  createdAt: string;
}

/** Tudo o que a Mive guarda. É exatamente o conteúdo do backup JSON. */
export interface MiveData {
  profile: Profile | null;
  settings: Settings;
  behaviorLog: BehaviorEvent[];
  projects: Project[];
  goals: Goal[];
  tasks: Task[];
  blocks: AgendaBlock[];
  habits: Habit[];
  habitChecks: HabitCheck[];
  ideas: Idea[];
  transactions: Transaction[];
  vaults: Vault[];
  weights: WeightEntry[];
  exams: Exam[];
  rituals: Ritual[];
  maas: MaasAssessment[];
  areaEntries: AreaEntry[];
  ideaTags: string[];
  tracks: Track[];
  decks: Deck[];
  cards: Flashcard[];
  studyNotes: StudyNotes;
}

export interface BackupFile {
  app: 'mive';
  schemaVersion: number;
  exportedAt: string;
  data: MiveData;
}
