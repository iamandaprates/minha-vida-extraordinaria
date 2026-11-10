import { toISODate, type CalendarEvent, type EntityId, type Goal, type Habit, type LifeArea, type LifeSnapshot, type Task } from './models';
import { activeGoals, byRelevance, completionIndex, goalProgress, habitConsistency, isHabitDone, isOverdue, isTaskCompleted, openTasks, tasksOfGoal, type Progress } from './selectors';

/**
 * Weekly reads used by the Claude Code skills (and, later, by the app).
 * Same rule as selectors: only real records, never invented numbers.
 * Weeks start on Monday.
 */

const MINUTE = 60_000;
export interface Week { start: Date; end: Date; days: Date[]; label: string; }

export function weekOf(reference = new Date()): Week {
  const day = (reference.getDay() + 6) % 7;
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - day);
  const days = Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  const format = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
  return { start, end, days, label: `${format.format(days[0])} a ${format.format(days[6])}`.replace(/\./g, '') };
}
const inWeek = (iso: string, week: Week) => { const time = Date.parse(iso); return time >= week.start.getTime() && time < week.end.getTime(); };
const eventMinutes = (event: CalendarEvent) => Math.max(0, Math.round((Date.parse(event.endsAt) - Date.parse(event.startsAt)) / MINUTE));

/* ── Time report ────────────────────────────────────────────────────────── */

export interface AreaWeek { area: LifeArea; focusMinutes: number; completions: number; habitChecks: number; eventMinutes: number; events: number; }
export interface DayWeek { date: string; focusMinutes: number; completions: number; habitChecks: number; eventMinutes: number; }

export function timeReport(snapshot: LifeSnapshot, reference = new Date()) {
  const week = weekOf(reference);
  const completions = [...completionIndex(snapshot.executions).values()].filter(record => inWeek(record.occurredAt, week));
  const sessions = snapshot.executions.filter(record => record.kind === 'session' && inWeek(record.occurredAt, week));
  const events = snapshot.events.filter(event => event.status !== 'cancelled' && inWeek(event.startsAt, week));
  const weekDates = new Set(week.days.map(toISODate));
  const latestChecks = new Map<string, boolean>();
  for (const checkIn of snapshot.habitCheckIns.filter(item => weekDates.has(item.date)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) latestChecks.set(`${checkIn.habitId}|${checkIn.date}`, checkIn.done);
  const checks = [...latestChecks.entries()].filter(([, done]) => done).map(([key]) => { const [habitId, date] = key.split('|'); return { habit: snapshot.habits.find(habit => habit.id === habitId), date }; });

  const byArea: AreaWeek[] = snapshot.areas.map(area => ({
    area,
    focusMinutes: sessions.filter(record => record.areaId === area.id).reduce((sum, record) => sum + (record.durationMinutes ?? 0), 0),
    completions: completions.filter(record => record.areaId === area.id).length,
    habitChecks: checks.filter(check => check.habit?.areaId === area.id).length,
    eventMinutes: events.filter(event => event.areaId === area.id).reduce((sum, event) => sum + eventMinutes(event), 0),
    events: events.filter(event => event.areaId === area.id).length
  }));
  const byDay: DayWeek[] = week.days.map(day => {
    const iso = toISODate(day);
    const sameDay = (value: string) => toISODate(new Date(value)) === iso;
    return {
      date: iso,
      focusMinutes: sessions.filter(record => sameDay(record.occurredAt)).reduce((sum, record) => sum + (record.durationMinutes ?? 0), 0),
      completions: completions.filter(record => sameDay(record.occurredAt)).length,
      habitChecks: checks.filter(check => check.date === iso).length,
      eventMinutes: events.filter(event => sameDay(event.startsAt)).reduce((sum, event) => sum + eventMinutes(event), 0)
    };
  });
  const moved = (item: AreaWeek) => item.focusMinutes + item.completions + item.habitChecks + item.events > 0;
  const planned = new Set([...snapshot.tasks.map(task => task.areaId), ...snapshot.habits.filter(habit => habit.active).map(habit => habit.areaId)].filter(Boolean));
  return {
    week,
    totals: { focusMinutes: sessions.reduce((sum, record) => sum + (record.durationMinutes ?? 0), 0), completions: completions.length, habitChecks: checks.length, eventMinutes: events.reduce((sum, event) => sum + eventMinutes(event), 0), events: events.length },
    byArea: byArea.filter(moved).sort((a, b) => (b.focusMinutes + b.eventMinutes) - (a.focusMinutes + a.eventMinutes) || b.completions - a.completions),
    byDay,
    /** Areas with plans (tasks or habits) but no movement at all this week. */
    quietAreas: byArea.filter(item => !moved(item) && planned.has(item.area.id)).map(item => item.area),
    outsideGoals: completions.filter(record => !record.goalId).length
  };
}

/* ── Weekly goals ───────────────────────────────────────────────────────── */

export type WeeklyStatus = 'on_track' | 'at_risk' | 'no_plan' | 'done';
export interface WeeklyGoal { goal: Goal; progress: Progress; weekTasks: Task[]; weekDone: number; habits: { habit: Habit; done: number; expected: number }[]; nextAction?: Task; status: WeeklyStatus; }

/** Cycle goals seen through this week: what is planned, what happened, what is at risk. */
export function weeklyGoals(snapshot: LifeSnapshot, now = new Date()): { week: Week; goals: WeeklyGoal[] } {
  const week = weekOf(now);
  // Only days that are already over count against habits (today is still open), and never
  // the days before the habit existed.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const pastDays = (createdAt: string) => { const born = new Date(createdAt); const from = Math.max(week.start.getTime(), new Date(born.getFullYear(), born.getMonth(), born.getDate()).getTime()); return Math.max(0, Math.min(7, Math.round((today - from) / 86_400_000))); };
  const goals = activeGoals(snapshot, now).map(goal => {
    const tasks = tasksOfGoal(snapshot, goal.id);
    const weekTasks = tasks.filter(task => task.dueAt && inWeek(task.dueAt, week));
    const weekDone = weekTasks.filter(task => isTaskCompleted(task.id, snapshot.executions)).length;
    const habits = snapshot.habits.filter(habit => habit.goalId === goal.id && habit.active).map(habit => {
      const expected = habit.frequency === 'daily' ? 7 : habit.timesPerWeek ?? 1;
      const done = week.days.filter(day => isHabitDone(habit.id, toISODate(day), snapshot.habitCheckIns)).length;
      return { habit, done, expected };
    });
    const open = tasks.filter(task => !isTaskCompleted(task.id, snapshot.executions)).sort(byRelevance);
    const expectedSoFar = habits.reduce((sum, item) => sum + Math.round((item.expected * pastDays(item.habit.createdAt)) / 7), 0);
    const habitsSoFar = habits.reduce((sum, item) => sum + item.done, 0);
    const lateTasks = weekTasks.filter(task => !isTaskCompleted(task.id, snapshot.executions) && isOverdue(task, now)).length;
    const status: WeeklyStatus = !weekTasks.length && !habits.length ? 'no_plan'
      : weekTasks.length && weekDone === weekTasks.length && habitsSoFar >= habits.reduce((sum, item) => sum + item.expected, 0) ? 'done'
      : lateTasks > 0 || (expectedSoFar > 0 && habitsSoFar / expectedSoFar < 0.6) ? 'at_risk' : 'on_track';
    return { goal, progress: goalProgress(snapshot, goal, now), weekTasks, weekDone, habits, nextAction: open[0], status };
  });
  return { week, goals };
}

/* ── Free slots and optimizer proposals ─────────────────────────────────── */

export interface Slot { start: Date; end: Date; minutes: number; }
export interface SlotOptions { days?: number; fromHour?: number; toHour?: number; bufferMinutes?: number; minMinutes?: number; }

/** Free windows between existing commitments, inside waking hours, never in the past. */
export function freeSlots(events: CalendarEvent[], now = new Date(), options: SlotOptions = {}): Slot[] {
  const { days = 7, fromHour = 7, toHour = 22, bufferMinutes = 15, minMinutes = 30 } = options;
  const busy = events.filter(event => event.status !== 'cancelled').map(event => ({ start: Date.parse(event.startsAt) - bufferMinutes * MINUTE, end: Date.parse(event.endsAt) + bufferMinutes * MINUTE })).sort((a, b) => a.start - b.start);
  const slots: Slot[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, fromHour).getTime();
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, toHour).getTime();
    const roundedNow = Math.ceil(now.getTime() / (15 * MINUTE)) * 15 * MINUTE;
    let cursor = Math.max(dayStart, roundedNow);
    for (const block of busy) {
      if (block.end <= cursor || block.start >= dayEnd) continue;
      if (block.start - cursor >= minMinutes * MINUTE) slots.push({ start: new Date(cursor), end: new Date(block.start), minutes: Math.round((block.start - cursor) / MINUTE) });
      cursor = Math.max(cursor, block.end);
    }
    if (dayEnd - cursor >= minMinutes * MINUTE) slots.push({ start: new Date(cursor), end: new Date(dayEnd), minutes: Math.round((dayEnd - cursor) / MINUTE) });
  }
  return slots;
}

export interface Proposal { goal: Goal; kind: 'task' | 'habit'; title: string; minutes: number; start: Date; end: Date; areaId?: EntityId; projectId?: EntityId; taskId?: EntityId; habitId?: EntityId; reason: string; }

/**
 * Blocks in the agenda for the goals that need it most (lowest real progress first).
 * - the next open action of each goal, using its estimate or 50 minutes
 * - one block for each agenda habit (`blockMinutes`) below 70% consistency in the last 14 days
 * Nothing is created here: the skill shows the proposals and asks before writing.
 */
export function optimizerProposals(snapshot: LifeSnapshot, now = new Date(), options: SlotOptions & { maxProposals?: number } = {}): Proposal[] {
  const { maxProposals = 6 } = options;
  const slots = freeSlots(snapshot.events, now, options).map(slot => ({ ...slot }));
  const goals = activeGoals(snapshot, now).map(goal => ({ goal, value: goalProgress(snapshot, goal, now).value ?? 0 })).sort((a, b) => a.value - b.value);
  const open = openTasks(snapshot);
  const wanted: Omit<Proposal, 'start' | 'end'>[] = [];
  for (const { goal, value } of goals) {
    const task = open.find(item => tasksOfGoal(snapshot, goal.id).some(linked => linked.id === item.id));
    if (task) wanted.push({ goal, kind: 'task', title: task.title, minutes: task.estimateMinutes ?? 50, areaId: task.areaId ?? goal.areaId, projectId: task.projectId, taskId: task.id, reason: `Meta em ${Math.round(value * 100)}% · próxima ação` });
    for (const habit of snapshot.habits.filter(item => item.goalId === goal.id && item.active && item.blockMinutes)) {
      const consistency = habitConsistency(habit, snapshot.habitCheckIns, now);
      if (consistency && consistency.ratio < 0.7) wanted.push({ goal, kind: 'habit', title: habit.title, minutes: habit.blockMinutes!, areaId: habit.areaId, habitId: habit.id, reason: `Constância em ${Math.round(consistency.ratio * 100)}% nos últimos 14 dias` });
    }
  }
  const proposals: Proposal[] = [];
  for (const item of wanted) {
    if (proposals.length >= maxProposals) break;
    const slot = slots.find(candidate => candidate.minutes >= item.minutes);
    if (!slot) continue;
    const start = new Date(slot.start); const end = new Date(start.getTime() + item.minutes * MINUTE);
    proposals.push({ ...item, start, end });
    // Consume the slot, keeping a 15 minute pause after the new block.
    slot.start = new Date(end.getTime() + 15 * MINUTE);
    slot.minutes = Math.round((slot.end.getTime() - slot.start.getTime()) / MINUTE);
  }
  return proposals.sort((a, b) => a.start.getTime() - b.start.getTime());
}
