import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { seedPlan } from '../data/seed';
import { todayISO } from '../lib/dates';
import type { AgendaBlock, BehaviorEvent, BehaviorKind, DeliveryRole, Goal, Idea, MiveData, Profile, Project, Settings, Task, ThemeMode } from '../types';
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
  ideas: []
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
  addIdea(draft: Omit<Draft<Idea>, 'archivedAt'>): Idea;
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
        addIdea: draft => { const idea: Idea = { ...draft, id: id(), createdAt: now() }; set(state => ({ ideas: [...state.ideas, idea] })); return idea; }
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
        return data;
      },
      onRehydrateStorage: () => () => useMive.setState({ hydrated: true })
    }
  )
);

/** Os dados puros, sem as ações (o mesmo formato do backup). */
export function selectData(state: MiveData): MiveData {
  const { profile, settings, behaviorLog, projects, goals, tasks, blocks, habits, habitChecks, ideas } = state;
  return { profile, settings, behaviorLog, projects, goals, tasks, blocks, habits, habitChecks, ideas };
}
