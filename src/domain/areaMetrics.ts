import type { LifeAssessment, Task } from './models';
import type { AreasData } from '../services/areasStore';
import { localDateKey } from './dates';

export const RECENT_DAYS = 7;
export type AreaMetrics = {
  projectsTotal: number; projectsActive: number; goalsTotal: number; ideasTotal: number;
  actionsTotal: number; actionsDone: number; actionsPending: number; actionsOverdue: number;
  eventsTotal: number; recentMovement: number; recordsTotal: number;
  /** Null when the area has no actions, so the UI shows an empty state instead of an invented number. */
  executionPct: number | null;
};

/** Open action whose deadline (calendar date) is before today. */
export const isTaskOverdue = (task: Task, now: Date = new Date()) => task.status === 'open' && !!task.dueAt && task.dueAt.slice(0, 10) < localDateKey(now);

/** Every indicator is derived from stored records on each render. There is nothing to refresh manually. */
export function computeAreaMetrics(areaId: string, data: Pick<AreasData, 'goals' | 'ideas' | 'projects' | 'tasks' | 'events'>, now: Date = new Date()): AreaMetrics {
  const goals = data.goals.filter(item => item.areaId === areaId);
  const ideas = data.ideas.filter(item => item.areaId === areaId);
  const projects = data.projects.filter(item => item.areaId === areaId);
  const tasks = data.tasks.filter(item => item.areaId === areaId);
  const events = data.events.filter(item => item.areaId === areaId && item.status !== 'cancelled');
  const actionsDone = tasks.filter(item => item.status === 'done').length;
  const since = now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const all = [...goals, ...ideas, ...projects, ...tasks, ...events];
  return {
    projectsTotal: projects.length, projectsActive: projects.filter(item => item.status === 'active').length, goalsTotal: goals.length, ideasTotal: ideas.length,
    actionsTotal: tasks.length, actionsDone, actionsPending: tasks.length - actionsDone, actionsOverdue: tasks.filter(item => isTaskOverdue(item, now)).length,
    eventsTotal: events.length, recentMovement: all.filter(item => new Date(item.updatedAt).getTime() >= since).length, recordsTotal: all.length,
    executionPct: tasks.length ? Math.round((actionsDone / tasks.length) * 100) : null
  };
}

/** Oldest first. The current assessment is the last one. */
export const sortAssessments = (items: LifeAssessment[]) => items.slice().sort((a, b) => a.assessedAt.localeCompare(b.assessedAt));
