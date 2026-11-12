import { fromISODate, toISODate, todayISO } from './dates';
import type { MiveData, Task } from '../types';

/** As entregas do dia: 1 Prioridade Magna + até 2 secundárias. Pinos de dias anteriores não contam. */
export function deliveriesOf(data: Pick<MiveData, 'tasks'>, date = todayISO()) {
  const planned = data.tasks.filter(task => task.plannedFor === date);
  const magna = planned.find(task => task.role === 'magna');
  const secundarias = planned.filter(task => task.role === 'secundaria').slice(0, 2);
  const all = [magna, ...secundarias].filter((task): task is Task => Boolean(task));
  return { magna, secundarias, all, done: all.filter(task => task.completedAt).length };
}

export const isOpen = (task: Task) => !task.completedAt;
/** Tarefas abertas que podem virar entrega hoje: primeiro as de projetos ativos. */
export function deliveryCandidates(data: Pick<MiveData, 'tasks' | 'projects'>, date = todayISO()) {
  const active = new Set(data.projects.filter(project => project.status === 'active').map(project => project.id));
  return data.tasks.filter(task => isOpen(task) && task.plannedFor !== date).sort((a, b) => Number(!active.has(a.projectId ?? '')) - Number(!active.has(b.projectId ?? '')) || (a.estimateMin ? 0 : 1) - (b.estimateMin ? 0 : 1) || a.createdAt.localeCompare(b.createdAt));
}
export const tasksOfProject = (data: Pick<MiveData, 'tasks'>, projectId: string) => data.tasks.filter(task => task.projectId === projectId);
export const blocksOn = (data: Pick<MiveData, 'blocks'>, date: string) => data.blocks.filter(block => block.date === date).sort((a, b) => a.start.localeCompare(b.start));
export const habitDone = (data: Pick<MiveData, 'habitChecks'>, habitId: string, date = todayISO()) => data.habitChecks.some(check => check.habitId === habitId && check.date === date);
export const normalizeTag = (tag: string) => tag.trim().replace(/^#+/, '').replace(/\s+/g, '');
export const ideasWithTag = (data: Pick<MiveData, 'ideas'>, tag?: string) => !tag ? [] : data.ideas.filter(idea => !idea.archivedAt && idea.tags.some(item => normalizeTag(item).toLowerCase() === normalizeTag(tag).toLowerCase()));
export const goalProgress = (goal: { milestones: { doneAt?: string }[] }) => goal.milestones.length ? goal.milestones.filter(item => item.doneAt).length / goal.milestones.length : undefined;
/** Dias corridos desde uma data ISO (undefined se nunca registrada). */
export const daysSince = (date?: string, today = todayISO()) => date ? Math.round((fromISODate(today).getTime() - fromISODate(date).getTime()) / 86_400_000) : undefined;
/** Sequência atual de dias seguidos com o hábito feito (hoje ainda em aberto não quebra). */
export function habitStreak(data: Pick<MiveData, 'habitChecks'>, habitId: string, today = todayISO()) {
  const days = new Set(data.habitChecks.filter(check => check.habitId === habitId).map(check => check.date));
  const cursor = fromISODate(today);
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(toISODate(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}
export const vaultSaved = (vault: { deposits: { amountCents: number }[] }) => vault.deposits.reduce((sum, item) => sum + item.amountCents, 0);
/** Separa "#tags" digitadas no texto da captura rápida: "Legging nova #CAVU" → título + ["CAVU"]. */
export function parseCapture(text: string) {
  const tags = [...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(match => match[1]);
  return { title: text.replace(/#[\p{L}\p{N}_-]+/gu, '').replace(/\s{2,}/g, ' ').trim(), tags };
}
