import type { CalendarEvent, EntityId, ExecutionRecord, Goal, LifeSnapshot, OwnedEntity, Project, Task } from '../domain/models';
import { seedLifeAreas } from './areas';

/**
 * Demonstration data. Used only by the in-memory data service, never as a source of truth.
 * Dates are generated relative to "now" so the demo always reads as a living day.
 */

export type Signal = { id: string; title: string; detail: string; area: string; kind: 'critical' | 'attention' | 'positive'; target: 'execution' | 'projects' | 'goals' | 'habits'; };
export type VisionItem = { id: string; title: string; text: string; area: string; color: string; goalCount: number; projectCount: number; progress: number };

export const demoSignals: Signal[] = [
  { id: 'signal-1', title: 'Projeto sem movimento há 8 dias', detail: 'Portfólio · próxima ação pendente', area: 'Profissional', kind: 'attention', target: 'projects' },
  { id: 'signal-2', title: 'Uma demanda importante vence hoje', detail: 'Preparar apresentação do projeto', area: 'Profissional', kind: 'critical', target: 'execution' },
  { id: 'signal-3', title: 'Você retomou um ritmo criativo', detail: '2 movimentos registrados esta semana', area: 'Criatividade', kind: 'positive', target: 'projects' }
];
export const demoVisions: VisionItem[] = [
  { id: 'vision-1', title: 'Uma carreira autoral e expansiva', text: 'Construo um trabalho que une estratégia, beleza e impacto, com espaço para crescer sem me desconectar de mim.', area: 'Profissional', color: 'pink', goalCount: 2, projectCount: 1, progress: 62 },
  { id: 'vision-2', title: 'Uma vida que cabe em mim', text: 'Escolho ritmo, presença e relações que sustentam quem estou me tornando.', area: 'Bem-estar', color: 'blue', goalCount: 1, projectCount: 0, progress: 28 },
  { id: 'vision-3', title: 'Criar com coragem', text: 'Faço da criatividade uma prática constante, visível e livre.', area: 'Criatividade', color: 'orange', goalCount: 1, projectCount: 1, progress: 35 }
];
export const identitySeed = { core: 'Sou uma mulher estratégica, sensível e corajosa. Eu me escuto, escolho com intenção e transformo visão em movimento.', becoming: 'Estou me tornando uma mulher ainda mais presente, livre para ocupar espaço e consistente com o que acredita.', acting: 'Escolho agir com clareza, gentileza e coragem, especialmente quando algo importa.', positioning: 'Quero ser percebida pela combinação de profundidade, repertório e uma energia que faz as coisas acontecerem.', strengthen: ['Coragem para me mostrar', 'Consistência gentil', 'Visão estratégica'], transform: ['Perfeccionismo que paralisa', 'Pressa que me desconecta', 'Medo de começar'] };

export const DEMO_USER_ID = 'demo-user';

export function createDemoSnapshot(userId: EntityId = DEMO_USER_ID, now = new Date()): LifeSnapshot {
  const at = (dayOffset: number, hour = 9, minute = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute).toISOString();
  const owned = <T extends OwnedEntity>(id: string, createdDaysAgo: number, value: Omit<T, keyof OwnedEntity>) => ({ ...value, id, userId, createdAt: at(-createdDaysAgo), updatedAt: at(-createdDaysAgo) }) as T;

  const goals: Goal[] = [
    owned<Goal>('demo-goal-1', 40, { title: 'Fechar dois projetos autorais no semestre', areaId: 'professional', horizon: 'current', status: 'active' }),
    owned<Goal>('demo-goal-2', 30, { title: 'Dar uma palestra sobre o meu método', areaId: 'professional', horizon: 'future', status: 'active' })
  ];
  const projects: Project[] = [
    owned<Project>('demo-project-1', 30, { title: 'Portfólio que abre caminhos', areaId: 'professional', goalId: 'demo-goal-1', status: 'active', focus: true }),
    owned<Project>('demo-project-2', 20, { title: 'Rotina de criação autoral', areaId: 'personal-development', status: 'active' })
  ];
  const tasks: Task[] = [
    owned<Task>('demo-task-1', 3, { title: 'Preparar apresentação do projeto', origin: 'planned', areaId: 'professional', dueAt: at(0, 14), dueHasTime: true, priority: 'high' }),
    owned<Task>('demo-task-2', 1, { title: 'Responder proposta da CAVU', origin: 'captured', areaId: 'professional', dueAt: at(0), priority: 'high' }),
    owned<Task>('demo-task-3', 10, { title: 'Selecionar 3 cases finais', origin: 'planned', areaId: 'professional', projectId: 'demo-project-1', priority: 'normal' }),
    owned<Task>('demo-task-4', 12, { title: 'Revisar textos dos cases', origin: 'planned', areaId: 'professional', projectId: 'demo-project-1', priority: 'normal' }),
    owned<Task>('demo-task-5', 5, { title: 'Organizar referências do portfólio', origin: 'planned', areaId: 'personal-development', projectId: 'demo-project-2', dueAt: at(1), priority: 'normal' }),
    owned<Task>('demo-task-6', 6, { title: 'Esboçar série de estudos visuais', origin: 'planned', areaId: 'personal-development', projectId: 'demo-project-2', priority: 'normal' })
  ];
  const record = (id: string, task: Task, daysAgo: number): ExecutionRecord => owned<ExecutionRecord>(id, daysAgo, { kind: 'completion', taskId: task.id, areaId: task.areaId, projectId: task.projectId, occurredAt: at(-daysAgo, 18) });
  const executions: ExecutionRecord[] = [record('demo-exec-1', tasks[3], 8), record('demo-exec-2', tasks[5], 1)];
  const events: CalendarEvent[] = [
    owned<CalendarEvent>('demo-event-1', 2, { title: 'Reunião de alinhamento', startsAt: at(0, 10, 30), endsAt: at(0, 11, 30), areaId: 'professional', status: 'confirmed', source: 'google', externalId: 'demo-google-1' }),
    owned<CalendarEvent>('demo-event-2', 2, { title: 'Foco: projeto Portfólio', startsAt: at(0, 14), endsAt: at(0, 16), areaId: 'professional', projectId: 'demo-project-1', status: 'planned', source: 'manual' })
  ];
  return { areas: seedLifeAreas(userId, new Date(at(-60))), assessments: [], areaNotes: [], goals, projects, tasks, events, executions };
}
