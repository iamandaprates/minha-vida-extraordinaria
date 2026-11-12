import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { defaultIdeaTags, seedLife, seedPlan, seedStudies, spiritualHabits } from '../data/seed';
import { normalizeTag } from '../lib/selectors';
import { sm2, type Rating } from '../lib/sm2';
import { todayISO } from '../lib/dates';
import type { AgendaBlock, AreaEntry, AreaId, BehaviorEvent, BehaviorKind, DeliveryRole, Deck, Exam, Flashcard, Goal, Habit, Idea, MaasAssessment, MiveData, Profile, Project, Ritual, Settings, StudyNotes, Task, ThemeMode, Track, Transaction, Vault, WeightEntry } from '../types';
import { idbStorage, SCHEMA_VERSION, STORAGE_KEY } from './storage';

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
export const MAX_SECONDARY = 2;

export const initialData = (): MiveData => ({
  profile: null,
  settings: { theme: prefersDark() ? 'dark' : 'light' },
  behaviorLog: [],
  ...seedPlan(),
  blocks: [],
  habitChecks: [],
  ideas: [],
  ...seedLife(),
  ideaTags: defaultIdeaTags(),
  ...seedStudies()
});

type Draft<T> = Omit<T, 'id' | 'createdAt'>;
interface MiveActions {
  setProfile(change: Partial<Omit<Profile, 'createdAt'>>): void;
  updateSettings(change: Partial<Settings>): void;
  toggleTheme(): void;
  /** Acrescenta um evento comportamental. O log nunca é editado nem apagado. */
  logBehavior(kind: BehaviorKind, data?: Omit<BehaviorEvent, 'id' | 'kind' | 'at'>): void;
  replaceAll(data: MiveData): void;

  addTask(draft: Omit<Draft<Task>, 'completedAt'>): Task;
  updateTask(taskId: string, change: Partial<Draft<Task>>): void;
  deleteTask(taskId: string): void;
  completeTask(taskId: string): void;
  reopenTask(taskId: string): void;
  /** Coloca a tarefa nas entregas de hoje. Devolve uma mensagem quando o limite já foi atingido. */
  planDelivery(taskId: string, role: DeliveryRole): string | undefined;
  unplanDelivery(taskId: string): void;

  addProject(draft: Draft<Project>): Project;
  updateProject(projectId: string, change: Partial<Draft<Project>>): void;
  deleteProject(projectId: string): void;
  addGoal(draft: Draft<Goal>): Goal;
  updateGoal(goalId: string, change: Partial<Draft<Goal>>): void;
  deleteGoal(goalId: string): void;
  addMilestone(goalId: string, title: string): void;
  toggleMilestone(goalId: string, milestoneId: string): void;
  removeMilestone(goalId: string, milestoneId: string): void;

  addBlock(draft: Omit<AgendaBlock, 'id'>): AgendaBlock;
  updateBlock(blockId: string, change: Partial<Omit<AgendaBlock, 'id'>>): void;
  deleteBlock(blockId: string): void;
  /** Marca o bloco como feito. Se estiver ligado a uma tarefa, conclui a tarefa também. */
  toggleBlock(blockId: string): void;

  toggleHabit(habitId: string, date?: string): void;
  addHabit(title: string, areaId: AreaId): void;
  deleteHabit(habitId: string): void;
  addIdea(draft: Omit<Draft<Idea>, 'archivedAt'>): Idea;
  updateIdea(ideaId: string, change: Partial<Draft<Idea>>): void;
  deleteIdea(ideaId: string): void;
  /** Cria uma tarefa no projeto a partir da ideia e guarda o vínculo. */
  ideaToTask(ideaId: string, projectId?: string): Task | undefined;
  addIdeaTag(tag: string): string | undefined;
  renameIdeaTag(from: string, to: string): void;
  removeIdeaTag(tag: string): void;

  addTrack(name: string): void;
  renameTrack(trackId: string, name: string): void;
  deleteTrack(trackId: string): void;
  addDeck(trackId: string, name: string): void;
  renameDeck(deckId: string, name: string): void;
  deleteDeck(deckId: string): void;
  addCard(deckId: string, front: string, back: string): void;
  updateCard(cardId: string, change: Partial<Pick<Flashcard, 'front' | 'back'>>): void;
  deleteCard(cardId: string): void;
  /** Aplica o SM-2 e registra a revisão no log comportamental. */
  reviewCard(cardId: string, rating: Rating): void;
  updateStudyNotes(change: Partial<StudyNotes>): void;

  /** Lança no livro-caixa. Com vaultId, também vira aporte no cofre. */
  addTransaction(draft: Draft<Transaction>): void;
  deleteTransaction(transactionId: string): void;
  addVault(name: string, targetCents: number): void;
  updateVault(vaultId: string, change: Partial<Pick<Vault, 'name' | 'targetCents'>>): void;
  deleteVault(vaultId: string): void;
  addDeposit(vaultId: string, amountCents: number, date: string): void;
  removeDeposit(vaultId: string, depositId: string): void;

  addWeight(date: string, kg: number): void;
  deleteWeight(entryId: string): void;
  updateExam(examId: string, change: Partial<Omit<Exam, 'id'>>): void;
  addExam(name: string): void;
  deleteExam(examId: string): void;

  addRitual(name: string, intervalDays: number): void;
  updateRitual(ritualId: string, change: Partial<Omit<Ritual, 'id'>>): void;
  deleteRitual(ritualId: string): void;

  addMaas(scores: MaasAssessment['scores'], note?: string): void;
  deleteMaas(assessmentId: string): void;

  addAreaEntry(draft: Omit<Draft<AreaEntry>, 'doneAt'>): void;
  updateAreaEntry(entryId: string, change: Partial<Omit<Draft<AreaEntry>, 'areaId'>>): void;
  deleteAreaEntry(entryId: string): void;
}
export type MiveState = MiveData & MiveActions & { hydrated: boolean };

export const useMive = create<MiveState>()(
  persist(
    (set, get) => {
      const log = (kind: BehaviorKind, data?: Omit<BehaviorEvent, 'id' | 'kind' | 'at'>) => set(state => ({ behaviorLog: [...state.behaviorLog, { id: id(), kind, at: now(), ...data }] }));
      const patchTask = (taskId: string, change: Partial<Task>) => set(state => ({ tasks: state.tasks.map(task => task.id === taskId ? { ...task, ...change } : task) }));
      const patchGoal = (goalId: string, change: (goal: Goal) => Goal) => set(state => ({ goals: state.goals.map(goal => goal.id === goalId ? change(goal) : goal) }));
      return {
        ...initialData(),
        hydrated: false,
        setProfile: change => set(state => ({ profile: { name: '', createdAt: now(), ...state.profile, ...change } })),
        updateSettings: change => set(state => ({ settings: { ...state.settings, ...change } })),
        toggleTheme: () => set(state => ({ settings: { ...state.settings, theme: (state.settings.theme === 'dark' ? 'light' : 'dark') as ThemeMode } })),
        logBehavior: log,
        replaceAll: data => set({ ...data }),

        addTask: draft => { const task: Task = { ...draft, id: id(), createdAt: now() }; set(state => ({ tasks: [...state.tasks, task] })); return task; },
        updateTask: patchTask,
        deleteTask: taskId => set(state => ({ tasks: state.tasks.filter(task => task.id !== taskId), blocks: state.blocks.map(block => block.taskId === taskId ? { ...block, taskId: undefined } : block) })),
        completeTask: taskId => { const task = get().tasks.find(item => item.id === taskId); if (!task || task.completedAt) return; patchTask(taskId, { completedAt: now() }); log('task_completed', { taskId, meta: task.plannedFor === todayISO() ? { delivery: task.role ?? 'secundaria' } : undefined }); },
        reopenTask: taskId => { const task = get().tasks.find(item => item.id === taskId); if (!task?.completedAt) return; patchTask(taskId, { completedAt: undefined }); log('task_reopened', { taskId }); },
        planDelivery: (taskId, role) => {
          const today = todayISO();
          const planned = get().tasks.filter(task => task.plannedFor === today && task.id !== taskId);
          if (role === 'magna' && planned.some(task => task.role === 'magna')) return 'A Prioridade Magna de hoje já foi escolhida. Tire a atual antes de trocar.';
          if (role === 'secundaria' && planned.filter(task => task.role === 'secundaria').length >= MAX_SECONDARY) return 'As 2 entregas secundárias de hoje já estão definidas.';
          patchTask(taskId, { plannedFor: today, role });
          log('task_planned', { taskId, meta: { role } });
          return undefined;
        },
        unplanDelivery: taskId => { patchTask(taskId, { plannedFor: undefined, role: undefined }); log('task_unplanned', { taskId }); },

        addProject: draft => { const project: Project = { ...draft, id: id(), createdAt: now() }; set(state => ({ projects: [...state.projects, project] })); return project; },
        updateProject: (projectId, change) => set(state => ({ projects: state.projects.map(project => project.id === projectId ? { ...project, ...change } : project) })),
        deleteProject: projectId => set(state => ({ projects: state.projects.filter(project => project.id !== projectId), tasks: state.tasks.map(task => task.projectId === projectId ? { ...task, projectId: undefined } : task), goals: state.goals.map(goal => goal.projectId === projectId ? { ...goal, projectId: undefined } : goal) })),
        addGoal: draft => { const goal: Goal = { ...draft, id: id(), createdAt: now() }; set(state => ({ goals: [...state.goals, goal] })); return goal; },
        updateGoal: (goalId, change) => patchGoal(goalId, goal => ({ ...goal, ...change })),
        deleteGoal: goalId => set(state => ({ goals: state.goals.filter(goal => goal.id !== goalId) })),
        addMilestone: (goalId, title) => patchGoal(goalId, goal => ({ ...goal, milestones: [...goal.milestones, { id: id(), title: title.trim() }] })),
        toggleMilestone: (goalId, milestoneId) => patchGoal(goalId, goal => ({ ...goal, milestones: goal.milestones.map(item => item.id === milestoneId ? { ...item, doneAt: item.doneAt ? undefined : now() } : item) })),
        removeMilestone: (goalId, milestoneId) => patchGoal(goalId, goal => ({ ...goal, milestones: goal.milestones.filter(item => item.id !== milestoneId) })),

        addBlock: draft => { const block: AgendaBlock = { ...draft, id: id() }; set(state => ({ blocks: [...state.blocks, block] })); return block; },
        updateBlock: (blockId, change) => set(state => ({ blocks: state.blocks.map(block => block.id === blockId ? { ...block, ...change } : block) })),
        deleteBlock: blockId => set(state => ({ blocks: state.blocks.filter(block => block.id !== blockId) })),
        toggleBlock: blockId => {
          const block = get().blocks.find(item => item.id === blockId);
          if (!block) return;
          const done = !block.doneAt;
          set(state => ({ blocks: state.blocks.map(item => item.id === blockId ? { ...item, doneAt: done ? now() : undefined } : item) }));
          if (block.taskId) { if (done) get().completeTask(block.taskId); else get().reopenTask(block.taskId); }
        },

        toggleHabit: (habitId, date = todayISO()) => set(state => {
          const exists = state.habitChecks.some(check => check.habitId === habitId && check.date === date);
          return { habitChecks: exists ? state.habitChecks.filter(check => !(check.habitId === habitId && check.date === date)) : [...state.habitChecks, { habitId, date }] };
        }),
        addHabit: (title, areaId) => { const habit: Habit = { id: id(), title: title.trim(), areaId }; set(state => ({ habits: [...state.habits, habit] })); },
        deleteHabit: habitId => set(state => ({ habits: state.habits.filter(habit => habit.id !== habitId), habitChecks: state.habitChecks.filter(check => check.habitId !== habitId) })),
        addIdea: draft => {
          const idea: Idea = { ...draft, tags: [...new Set(draft.tags.map(normalizeTag).filter(Boolean))], id: id(), createdAt: now() };
          set(state => ({ ideas: [idea, ...state.ideas], ideaTags: [...state.ideaTags, ...idea.tags.filter(tag => !state.ideaTags.some(item => item.toLowerCase() === tag.toLowerCase()))] }));
          return idea;
        },
        updateIdea: (ideaId, change) => set(state => ({ ideas: state.ideas.map(idea => idea.id === ideaId ? { ...idea, ...change } : idea) })),
        deleteIdea: ideaId => set(state => ({ ideas: state.ideas.filter(idea => idea.id !== ideaId) })),
        ideaToTask: (ideaId, projectId) => {
          const idea = get().ideas.find(item => item.id === ideaId);
          if (!idea) return undefined;
          const task = get().addTask({ title: idea.title, projectId });
          get().updateIdea(ideaId, { taskId: task.id });
          return task;
        },
        addIdeaTag: raw => {
          const tag = normalizeTag(raw);
          if (!tag) return undefined;
          const existing = get().ideaTags.find(item => item.toLowerCase() === tag.toLowerCase());
          if (existing) return existing;
          set(state => ({ ideaTags: [...state.ideaTags, tag] }));
          return tag;
        },
        renameIdeaTag: (from, raw) => {
          const to = normalizeTag(raw);
          if (!to || to === from) return;
          const swap = (tags: string[]) => [...new Set(tags.map(tag => tag.toLowerCase() === from.toLowerCase() ? to : tag))];
          set(state => ({ ideaTags: swap(state.ideaTags), ideas: state.ideas.map(idea => ({ ...idea, tags: swap(idea.tags) })), projects: state.projects.map(project => project.tag?.toLowerCase() === from.toLowerCase() ? { ...project, tag: to } : project) }));
        },
        removeIdeaTag: tag => set(state => ({ ideaTags: state.ideaTags.filter(item => item !== tag), ideas: state.ideas.map(idea => ({ ...idea, tags: idea.tags.filter(item => item !== tag) })) })),

        addTrack: name => set(state => ({ tracks: [...state.tracks, { id: id(), name: name.trim(), createdAt: now() } as Track] })),
        renameTrack: (trackId, name) => set(state => ({ tracks: state.tracks.map(track => track.id === trackId ? { ...track, name: name.trim() } : track) })),
        deleteTrack: trackId => set(state => {
          const decks = new Set(state.decks.filter(deck => deck.trackId === trackId).map(deck => deck.id));
          return { tracks: state.tracks.filter(track => track.id !== trackId), decks: state.decks.filter(deck => !decks.has(deck.id)), cards: state.cards.filter(card => !decks.has(card.deckId)) };
        }),
        addDeck: (trackId, name) => set(state => ({ decks: [...state.decks, { id: id(), trackId, name: name.trim(), createdAt: now() } as Deck] })),
        renameDeck: (deckId, name) => set(state => ({ decks: state.decks.map(deck => deck.id === deckId ? { ...deck, name: name.trim() } : deck) })),
        deleteDeck: deckId => set(state => ({ decks: state.decks.filter(deck => deck.id !== deckId), cards: state.cards.filter(card => card.deckId !== deckId) })),
        addCard: (deckId, front, back) => set(state => ({ cards: [...state.cards, { id: id(), deckId, front: front.trim(), back: back.trim(), ease: 2.5, interval: 0, repetitions: 0, due: todayISO(), createdAt: now() }] })),
        updateCard: (cardId, change) => set(state => ({ cards: state.cards.map(card => card.id === cardId ? { ...card, ...change } : card) })),
        deleteCard: cardId => set(state => ({ cards: state.cards.filter(card => card.id !== cardId) })),
        reviewCard: (cardId, rating) => {
          const card = get().cards.find(item => item.id === cardId);
          if (!card) return;
          const next = sm2(card, rating);
          set(state => ({ cards: state.cards.map(item => item.id === cardId ? { ...item, ...next, lastReviewedAt: now() } : item) }));
          log('card_reviewed', { meta: { cardId, rating, interval: next.interval } });
        },
        updateStudyNotes: change => set(state => ({ studyNotes: { ...state.studyNotes, ...change } })),

        addTransaction: draft => {
          const transaction: Transaction = { ...draft, id: id(), createdAt: now() };
          set(state => ({
            transactions: [...state.transactions, transaction],
            vaults: draft.vaultId ? state.vaults.map(vault => vault.id === draft.vaultId ? { ...vault, deposits: [...vault.deposits, { id: id(), amountCents: draft.amountCents, date: draft.date, transactionId: transaction.id }] } : vault) : state.vaults
          }));
        },
        deleteTransaction: transactionId => set(state => ({ transactions: state.transactions.filter(item => item.id !== transactionId), vaults: state.vaults.map(vault => ({ ...vault, deposits: vault.deposits.filter(deposit => deposit.transactionId !== transactionId) })) })),
        addVault: (name, targetCents) => set(state => ({ vaults: [...state.vaults, { id: id(), name: name.trim(), targetCents, deposits: [], createdAt: now() }] })),
        updateVault: (vaultId, change) => set(state => ({ vaults: state.vaults.map(vault => vault.id === vaultId ? { ...vault, ...change } : vault) })),
        deleteVault: vaultId => set(state => ({ vaults: state.vaults.filter(vault => vault.id !== vaultId), transactions: state.transactions.map(item => item.vaultId === vaultId ? { ...item, vaultId: undefined } : item) })),
        addDeposit: (vaultId, amountCents, date) => set(state => ({ vaults: state.vaults.map(vault => vault.id === vaultId ? { ...vault, deposits: [...vault.deposits, { id: id(), amountCents, date }] } : vault) })),
        removeDeposit: (vaultId, depositId) => {
          const deposit = get().vaults.find(vault => vault.id === vaultId)?.deposits.find(item => item.id === depositId);
          if (deposit?.transactionId) { get().deleteTransaction(deposit.transactionId); return; }
          set(state => ({ vaults: state.vaults.map(vault => vault.id === vaultId ? { ...vault, deposits: vault.deposits.filter(item => item.id !== depositId) } : vault) }));
        },

        addWeight: (date, kg) => { const entry: WeightEntry = { id: id(), date, kg }; set(state => ({ weights: [...state.weights.filter(item => item.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)) })); },
        deleteWeight: entryId => set(state => ({ weights: state.weights.filter(item => item.id !== entryId) })),
        updateExam: (examId, change) => set(state => ({ exams: state.exams.map(exam => exam.id === examId ? { ...exam, ...change } : exam) })),
        addExam: name => set(state => ({ exams: [...state.exams, { id: id(), name: name.trim() }] })),
        deleteExam: examId => set(state => ({ exams: state.exams.filter(exam => exam.id !== examId) })),

        addRitual: (name, intervalDays) => set(state => ({ rituals: [...state.rituals, { id: id(), name: name.trim(), intervalDays }] })),
        updateRitual: (ritualId, change) => set(state => ({ rituals: state.rituals.map(ritual => ritual.id === ritualId ? { ...ritual, ...change } : ritual) })),
        deleteRitual: ritualId => set(state => ({ rituals: state.rituals.filter(ritual => ritual.id !== ritualId) })),

        addMaas: (scores, note) => set(state => ({ maas: [...state.maas, { id: id(), date: todayISO(), scores, note: note?.trim() || undefined, createdAt: now() }] })),
        deleteMaas: assessmentId => set(state => ({ maas: state.maas.filter(item => item.id !== assessmentId) })),

        addAreaEntry: draft => set(state => ({ areaEntries: [{ ...draft, id: id(), createdAt: now() }, ...state.areaEntries] })),
        updateAreaEntry: (entryId, change) => set(state => ({ areaEntries: state.areaEntries.map(entry => entry.id === entryId ? { ...entry, ...change } : entry) })),
        deleteAreaEntry: entryId => set(state => ({ areaEntries: state.areaEntries.filter(entry => entry.id !== entryId) }))
      };
    },
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state): MiveData => selectData(state),
      /** Versão 1 (Fase 1) não tinha projetos, tarefas nem agenda: entra o plano inicial. */
      migrate: (persisted, version) => {
        const data = persisted as Partial<MiveData>;
        if (version < 2) return { ...initialData(), ...data, ...seedPlan(), blocks: [], habitChecks: [], ideas: [] };
        /** Versão 2 (Fases 2 e 3) não tinha finanças, saúde, rituais, MAAS nem ferramentas de área. */
        if (version < 3) return { ...data, ...seedLife(), ideaTags: defaultIdeaTags(), ...seedStudies(), habits: [...(data.habits ?? []), ...spiritualHabits().filter(habit => !data.habits?.some(item => item.id === habit.id))] };
        /** Versão 3 (Fase 4) não tinha estudos nem o gerenciador de tags. */
        if (version < 4) return { ...data, ideaTags: [...new Set([...defaultIdeaTags(), ...(data.ideas ?? []).flatMap(idea => idea.tags)])], ...seedStudies() };
        return data;
      },
      onRehydrateStorage: () => () => useMive.setState({ hydrated: true })
    }
  )
);

/** Os dados puros, sem as ações (o mesmo formato do backup). */
export function selectData(state: MiveData): MiveData {
  const { profile, settings, behaviorLog, projects, goals, tasks, blocks, habits, habitChecks, ideas, transactions, vaults, weights, exams, rituals, maas, areaEntries, ideaTags, tracks, decks, cards, studyNotes } = state;
  return { profile, settings, behaviorLog, projects, goals, tasks, blocks, habits, habitChecks, ideas, transactions, vaults, weights, exams, rituals, maas, areaEntries, ideaTags, tracks, decks, cards, studyNotes };
}
