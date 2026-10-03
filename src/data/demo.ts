export type Priority = 'high' | 'normal';
export type TaskItem = { id: string; title: string; area: string; due: string; priority: Priority; done: boolean; source: 'Tarefa' | 'Demanda' };
export type Signal = { id: string; title: string; detail: string; area: string; kind: 'critical' | 'attention' | 'positive'; target: 'execution' | 'projects' | 'goals' | 'habits'; };
export type ProjectItem = { id: string; title: string; area: string; progress: number; activity: string; nextAction: string; priority?: boolean };
export type VisionItem = { id: string; title: string; text: string; area: string; color: string; goalCount: number; projectCount: number; progress: number };
export const demoTasks: TaskItem[] = [
  { id: 'task-1', title: 'Preparar apresentação do projeto', area: 'Profissional', due: 'Hoje · 14:00', priority: 'high', done: false, source: 'Tarefa' },
  { id: 'task-2', title: 'Responder proposta da CAVU', area: 'Profissional', due: 'Hoje', priority: 'high', done: false, source: 'Demanda' },
  { id: 'task-3', title: 'Organizar referências do portfólio', area: 'Criatividade', due: 'Amanhã', priority: 'normal', done: false, source: 'Tarefa' }
];
export const demoSignals: Signal[] = [
  { id: 'signal-1', title: 'Projeto sem movimento há 8 dias', detail: 'Portfólio · próxima ação pendente', area: 'Profissional', kind: 'attention', target: 'projects' },
  { id: 'signal-2', title: 'Uma demanda importante vence hoje', detail: 'Preparar apresentação do projeto', area: 'Profissional', kind: 'critical', target: 'execution' },
  { id: 'signal-3', title: 'Você retomou um ritmo criativo', detail: '2 movimentos registrados esta semana', area: 'Criatividade', kind: 'positive', target: 'projects' }
];
export const demoProjects: ProjectItem[] = [
  { id: 'project-1', title: 'Portfólio que abre caminhos', area: 'Profissional', progress: 62, activity: 'Atualizado há 8 dias', nextAction: 'Selecionar 3 cases finais', priority: true },
  { id: 'project-2', title: 'Rotina de criação autoral', area: 'Criatividade', progress: 35, activity: 'Movimento ontem', nextAction: 'Publicar estudo visual' }
];
export const demoVisions: VisionItem[] = [
  { id: 'vision-1', title: 'Uma carreira autoral e expansiva', text: 'Construo um trabalho que une estratégia, beleza e impacto — com espaço para crescer sem me desconectar de mim.', area: 'Profissional', color: 'pink', goalCount: 2, projectCount: 1, progress: 62 },
  { id: 'vision-2', title: 'Uma vida que cabe em mim', text: 'Escolho ritmo, presença e relações que sustentam quem estou me tornando.', area: 'Bem-estar', color: 'blue', goalCount: 1, projectCount: 0, progress: 28 },
  { id: 'vision-3', title: 'Criar com coragem', text: 'Faço da criatividade uma prática constante, visível e livre.', area: 'Criatividade', color: 'orange', goalCount: 1, projectCount: 1, progress: 35 }
];
export const identitySeed = { core: 'Sou uma mulher estratégica, sensível e corajosa. Eu me escuto, escolho com intenção e transformo visão em movimento.', becoming: 'Estou me tornando uma mulher ainda mais presente, livre para ocupar espaço e consistente com o que acredita.', acting: 'Escolho agir com clareza, gentileza e coragem — especialmente quando algo importa.', positioning: 'Quero ser percebida pela combinação de profundidade, repertório e uma energia que faz as coisas acontecerem.', strengthen: ['Coragem para me mostrar', 'Consistência gentil', 'Visão estratégica'], transform: ['Perfeccionismo que paralisa', 'Pressa que me desconecta', 'Medo de começar'] };
export const demoEvents = [{ id: 'event-1', time: '10:30', title: 'Reunião de alinhamento', area: 'Profissional', status: 'Confirmado', source: 'Google Calendar' }, { id: 'event-2', time: '14:00', title: 'Foco: projeto Portfólio', area: 'Profissional', status: 'Planejado', source: 'Minha Vida' }];
