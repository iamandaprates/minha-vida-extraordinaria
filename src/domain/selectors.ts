import type { CalendarEvent, EntityId, ExecutionRecord, LifeAssessment, LifeSnapshot, Project, Task } from './models';

/** Pure reads over the snapshot. Everything that looks like a status in the UI is derived here. */

export const completionOf = (taskId: EntityId, executions: ExecutionRecord[]) => executions.find(record => record.kind === 'completion' && record.taskId === taskId);
export const isTaskCompleted = (taskId: EntityId, executions: ExecutionRecord[]) => Boolean(completionOf(taskId, executions));

const dueValue = (task: Task) => task.dueAt ? Date.parse(task.dueAt) : Number.POSITIVE_INFINITY;
/** High priority first, then nearest deadline, then most recent capture. */
export const byRelevance = (a: Task, b: Task) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1) || dueValue(a) - dueValue(b) || b.createdAt.localeCompare(a.createdAt);

export const openTasks = (snapshot: LifeSnapshot) => snapshot.tasks.filter(task => !isTaskCompleted(task.id, snapshot.executions)).sort(byRelevance);

export const latestAssessment = (assessments: LifeAssessment[]): LifeAssessment | undefined => assessments.slice().sort((a, b) => a.assessedAt.localeCompare(b.assessedAt)).at(-1);
export const areaName = (snapshot: LifeSnapshot, areaId?: EntityId) => snapshot.areas.find(area => area.id === areaId)?.name ?? 'Sem área';

/** Tasks of an area include the ones attached through a project of that area. */
export function tasksOfArea(snapshot: LifeSnapshot, areaId: EntityId) {
  const projectIds = new Set(snapshot.projects.filter(project => project.areaId === areaId).map(project => project.id));
  return snapshot.tasks.filter(task => task.areaId === areaId || (task.projectId !== undefined && projectIds.has(task.projectId)));
}

export interface AreaSummary { activeProjects: number; currentGoals: number; openActions: number; totalActions: number; completedActions: number; upcomingEvents: number; }
export function areaSummary(snapshot: LifeSnapshot, areaId: EntityId, now = new Date()): AreaSummary {
  const tasks = tasksOfArea(snapshot, areaId);
  const completed = tasks.filter(task => isTaskCompleted(task.id, snapshot.executions)).length;
  return {
    activeProjects: snapshot.projects.filter(project => project.areaId === areaId && project.status === 'active').length,
    currentGoals: snapshot.goals.filter(goal => goal.areaId === areaId && goal.horizon === 'current').length,
    openActions: tasks.length - completed,
    totalActions: tasks.length,
    completedActions: completed,
    upcomingEvents: upcomingEvents(snapshot.events, now).filter(event => event.areaId === areaId).length
  };
}

export interface ProjectProgress { progress?: number; nextAction?: Task; lastActivityAt?: string; }
/** Progress exists only when the project has planned tasks. No invented percentages. */
export function projectProgress(snapshot: LifeSnapshot, project: Project): ProjectProgress {
  const tasks = snapshot.tasks.filter(task => task.projectId === project.id);
  const done = tasks.filter(task => isTaskCompleted(task.id, snapshot.executions));
  const lastActivityAt = snapshot.executions.filter(record => record.projectId === project.id).map(record => record.occurredAt).sort().at(-1);
  return { progress: tasks.length ? Math.round((done.length / tasks.length) * 100) : undefined, nextAction: tasks.filter(task => !done.includes(task)).sort(byRelevance)[0], lastActivityAt };
}

export const upcomingEvents = (events: CalendarEvent[], now = new Date()) => events.filter(event => event.status !== 'cancelled' && Date.parse(event.endsAt) >= now.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

/* ── Display helpers (pt-BR) ────────────────────────────────────────────── */

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const dayDiff = (iso: string, now: Date) => Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / 86_400_000);
const time = (iso: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const shortDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(iso)).replace('.', '');

export function formatDay(iso: string, now = new Date()) {
  const diff = dayDiff(iso, now);
  return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff === -1 ? 'Ontem' : shortDate(iso);
}
export function formatDue(task: Task, now = new Date()) {
  if (!task.dueAt) return 'Sem prazo';
  const day = formatDay(task.dueAt, now);
  const late = dayDiff(task.dueAt, now) < 0 ? ' · em atraso' : '';
  return `${task.dueHasTime ? `${day} · ${time(task.dueAt)}` : day}${late}`;
}
export const formatTime = time;
export function formatActivity(iso: string | undefined, now = new Date()) {
  if (!iso) return 'Sem movimento registrado';
  const days = -dayDiff(iso, now);
  return days <= 0 ? 'Movimento hoje' : days === 1 ? 'Movimento ontem' : `Sem movimento há ${days} dias`;
}
export const eventStatusLabel: Record<CalendarEvent['status'], string> = { planned: 'Planejado', confirmed: 'Confirmado', cancelled: 'Cancelado' };
export const eventSourceLabel: Record<CalendarEvent['source'], string> = { manual: 'Minha Vida', google: 'Google Calendar' };
export const originLabel: Record<Task['origin'], string> = { planned: 'Tarefa', captured: 'Demanda' };
