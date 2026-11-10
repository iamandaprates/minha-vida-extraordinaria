import { checkupLabels, formatBRL } from './catalog';
import { cycleLabel, cycleOf, fromISODate, toISODate, type CalendarEvent, type CheckupKind, type EntityId, type ExecutionRecord, type FinanceVault, type Goal, type Habit, type HabitCheckIn, type ISODate, type LifeArea, type LifeAssessment, type LifeSnapshot, type Project, type Task } from './models';

/**
 * Pure reads over the snapshot. Every status, percentage or alert on screen comes from here.
 * When there is nothing real to measure, functions return `undefined` instead of a number.
 */

const DAY = 86_400_000;
export const MOVEMENT_WINDOW_DAYS = 14;
export const CHECKUP_LIMIT_DAYS = 180;
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const percent = (value: number) => Math.round(value * 100);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);

/* ── Completion (append-only, latest fact wins) ─────────────────────────── */

const completionCache = new WeakMap<ExecutionRecord[], Map<EntityId, ExecutionRecord>>();
/** Active completion per task: the most recent `completion` not annulled by a `reversal`. */
export function completionIndex(executions: ExecutionRecord[]): Map<EntityId, ExecutionRecord> {
  const cached = completionCache.get(executions);
  if (cached) return cached;
  const reversed = new Set(executions.filter(record => record.kind === 'reversal' && record.reversesId).map(record => record.reversesId));
  const index = new Map<EntityId, ExecutionRecord>();
  for (const record of executions) {
    if (record.kind !== 'completion' || !record.taskId || reversed.has(record.id)) continue;
    const current = index.get(record.taskId);
    if (!current || current.occurredAt < record.occurredAt) index.set(record.taskId, record);
  }
  completionCache.set(executions, index);
  return index;
}
export const completionOf = (taskId: EntityId, executions: ExecutionRecord[]) => completionIndex(executions).get(taskId);
export const isTaskCompleted = (taskId: EntityId, executions: ExecutionRecord[]) => completionIndex(executions).has(taskId);

const dueValue = (task: Task) => task.dueAt ? Date.parse(task.dueAt) : Number.POSITIVE_INFINITY;
export const byRelevance = (a: Task, b: Task) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1) || dueValue(a) - dueValue(b) || b.createdAt.localeCompare(a.createdAt);
export const openTasks = (snapshot: LifeSnapshot) => snapshot.tasks.filter(task => !isTaskCompleted(task.id, snapshot.executions)).sort(byRelevance);
export const isOverdue = (task: Task, now = new Date()) => Boolean(task.dueAt) && daysBetween(now, new Date(task.dueAt!)) < 0;
export const isDueByToday = (task: Task, now = new Date()) => Boolean(task.dueAt) && daysBetween(now, new Date(task.dueAt!)) <= 0;
export const isDueThisWeek = (task: Task, now = new Date()) => Boolean(task.dueAt) && daysBetween(now, new Date(task.dueAt!)) <= 6;

export const areaName = (snapshot: LifeSnapshot, areaId?: EntityId) => snapshot.areas.find(area => area.id === areaId)?.name ?? 'Sem área';
export const areaOf = (snapshot: LifeSnapshot, areaId?: EntityId): LifeArea | undefined => snapshot.areas.find(area => area.id === areaId);

export function tasksOfArea(snapshot: LifeSnapshot, areaId: EntityId) {
  const projectIds = new Set(snapshot.projects.filter(project => project.areaId === areaId).map(project => project.id));
  return snapshot.tasks.filter(task => task.areaId === areaId || (task.projectId !== undefined && projectIds.has(task.projectId)));
}
export function tasksOfGoal(snapshot: LifeSnapshot, goalId: EntityId) {
  const projectIds = new Set(snapshot.projects.filter(project => project.goalId === goalId).map(project => project.id));
  return snapshot.tasks.filter(task => task.goalId === goalId || (task.projectId !== undefined && projectIds.has(task.projectId)));
}

/* ── Habits ─────────────────────────────────────────────────────────────── */

const habitCache = new WeakMap<HabitCheckIn[], Map<string, HabitCheckIn>>();
function habitIndex(checkIns: HabitCheckIn[]) {
  const cached = habitCache.get(checkIns);
  if (cached) return cached;
  const index = new Map<string, HabitCheckIn>();
  for (const checkIn of checkIns) {
    const key = `${checkIn.habitId}|${checkIn.date}`;
    const current = index.get(key);
    if (!current || current.occurredAt < checkIn.occurredAt) index.set(key, checkIn);
  }
  habitCache.set(checkIns, index);
  return index;
}
export const isHabitDone = (habitId: EntityId, date: ISODate, checkIns: HabitCheckIn[]) => habitIndex(checkIns).get(`${habitId}|${date}`)?.done === true;

export interface Consistency { done: number; expected: number; ratio: number; }
/** Share of expected check-ins that really happened in the last 14 days (or since the habit exists). */
export function habitConsistency(habit: Habit, checkIns: HabitCheckIn[], now = new Date(), windowDays = MOVEMENT_WINDOW_DAYS): Consistency | undefined {
  const today = startOfDay(now);
  const windowStart = addDays(today, -(windowDays - 1));
  const born = startOfDay(new Date(habit.createdAt));
  const start = born > windowStart ? born : windowStart;
  const days = daysBetween(start, today) + 1;
  if (days <= 0) return undefined;
  let done = 0;
  for (let offset = 0; offset < days; offset += 1) if (isHabitDone(habit.id, toISODate(addDays(start, offset)), checkIns)) done += 1;
  const expected = habit.frequency === 'daily' ? days : Math.max(1, Math.round(((habit.timesPerWeek ?? 1) * days) / 7));
  return { done, expected, ratio: clamp01(done / expected) };
}
/** Consecutive done days ending today, or yesterday when today is still open. */
export function habitStreak(habit: Habit, checkIns: HabitCheckIn[], now = new Date()) {
  let cursor = startOfDay(now);
  if (!isHabitDone(habit.id, toISODate(cursor), checkIns)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (isHabitDone(habit.id, toISODate(cursor), checkIns)) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}
export const lastDays = (count: number, now = new Date()) => Array.from({ length: count }, (_, index) => addDays(startOfDay(now), index - count + 1));

/* ── Progress parts ─────────────────────────────────────────────────────── */

export type ProgressKey = 'tasks' | 'habits' | 'measure' | 'vaults';
export interface ProgressPart { key: ProgressKey; label: string; value: number; detail: string; }
export interface Progress { value?: number; parts: ProgressPart[]; }
const combine = (parts: ProgressPart[]): Progress => ({ value: mean(parts.map(part => part.value)), parts });

function tasksPart(snapshot: LifeSnapshot, tasks: Task[]): ProgressPart | undefined {
  if (!tasks.length) return undefined;
  const done = tasks.filter(task => isTaskCompleted(task.id, snapshot.executions)).length;
  return { key: 'tasks', label: 'Ações', value: done / tasks.length, detail: `${done} de ${tasks.length} ações concluídas` };
}
function habitsPart(snapshot: LifeSnapshot, habits: Habit[], now: Date): ProgressPart | undefined {
  const values = habits.filter(habit => habit.active).map(habit => habitConsistency(habit, snapshot.habitCheckIns, now)).filter((value): value is Consistency => Boolean(value));
  const ratio = mean(values.map(value => value.ratio));
  if (ratio === undefined) return undefined;
  return { key: 'habits', label: 'Hábitos', value: ratio, detail: `${percent(ratio)}% de constância em ${MOVEMENT_WINDOW_DAYS} dias` };
}

/* ── Goals ──────────────────────────────────────────────────────────────── */

export const vaultBalance = (vaultId: EntityId, snapshot: LifeSnapshot) => snapshot.financeEntries.filter(entry => entry.type === 'vault_deposit' && entry.vaultId === vaultId).reduce((sum, entry) => sum + entry.amountCents, 0);
export function vaultProgress(vault: FinanceVault, snapshot: LifeSnapshot) {
  const balance = vaultBalance(vault.id, snapshot);
  return { balance, ratio: vault.targetCents > 0 ? clamp01(balance / vault.targetCents) : undefined, remaining: Math.max(0, vault.targetCents - balance) };
}

export function weightTrend(snapshot: LifeSnapshot) {
  const sorted = snapshot.bodyMeasurements.slice().sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const first = sorted[0]; const latest = sorted.at(-1);
  return { history: sorted, first, latest, changeKg: first && latest ? Math.round((latest.weightKg - first.weightKg) * 10) / 10 : undefined };
}

export function goalProgress(snapshot: LifeSnapshot, goal: Goal, now = new Date()): Progress {
  const parts: (ProgressPart | undefined)[] = [
    tasksPart(snapshot, tasksOfGoal(snapshot, goal.id)),
    habitsPart(snapshot, snapshot.habits.filter(habit => habit.goalId === goal.id), now)
  ];
  if (goal.measure?.kind === 'weight') {
    const { first, latest } = weightTrend(snapshot);
    if (first && latest) {
      const target = goal.measure.targetKg;
      const value = first.weightKg <= target ? (latest.weightKg <= target ? 1 : 0) : clamp01((first.weightKg - latest.weightKg) / (first.weightKg - target));
      parts.push({ key: 'measure', label: 'Peso', value, detail: `${formatKg(latest.weightKg)} agora · meta ${formatKg(target)}` });
    }
  }
  const vaults = snapshot.vaults.filter(vault => vault.goalId === goal.id && vault.targetCents > 0);
  if (vaults.length) {
    const balance = vaults.reduce((sum, vault) => sum + vaultBalance(vault.id, snapshot), 0);
    const target = vaults.reduce((sum, vault) => sum + vault.targetCents, 0);
    parts.push({ key: 'vaults', label: 'Cofre', value: clamp01(balance / target), detail: `${formatBRL(balance)} de ${formatBRL(target)}` });
  }
  return combine(parts.filter((part): part is ProgressPart => Boolean(part)));
}
export const activeGoals = (snapshot: LifeSnapshot, now = new Date()) => snapshot.goals.filter(goal => goal.status === 'active' && goal.horizon === 'current' && (!goal.cycle || goal.cycle === cycleOf(now)));

export function visionProgress(snapshot: LifeSnapshot, visionId: EntityId, now = new Date()) {
  const goals = snapshot.goals.filter(goal => goal.visionId === visionId);
  return { goals, projects: snapshot.projects.filter(project => goals.some(goal => goal.id === project.goalId)), value: mean(goals.map(goal => goalProgress(snapshot, goal, now).value).filter((value): value is number => value !== undefined)) };
}

/* ── Projects ───────────────────────────────────────────────────────────── */

export interface ProjectProgress { progress?: number; nextAction?: Task; lastActivityAt?: string; }
export function projectProgress(snapshot: LifeSnapshot, project: Project): ProjectProgress {
  const tasks = snapshot.tasks.filter(task => task.projectId === project.id);
  const open = tasks.filter(task => !isTaskCompleted(task.id, snapshot.executions));
  const lastActivityAt = snapshot.executions.filter(record => record.projectId === project.id && record.kind !== 'reversal').map(record => record.occurredAt).sort().at(-1);
  return { progress: tasks.length ? percent((tasks.length - open.length) / tasks.length) : undefined, nextAction: open.sort(byRelevance)[0], lastActivityAt };
}

/* ── Areas and life balance (MAAS + real movement) ──────────────────────── */

export const latestAssessment = (assessments: LifeAssessment[]): LifeAssessment | undefined => assessments.slice().sort((a, b) => a.assessedAt.localeCompare(b.assessedAt)).at(-1);
export const assessmentOfCycle = (assessments: LifeAssessment[], cycle = cycleOf(new Date())) => latestAssessment(assessments.filter(item => item.cycle === cycle));

export function areaMovement(snapshot: LifeSnapshot, areaId: EntityId, now = new Date()): Progress {
  const windowStart = addDays(startOfDay(now), -(MOVEMENT_WINDOW_DAYS - 1)).toISOString();
  const tasks = tasksOfArea(snapshot, areaId);
  const completions = completionIndex(snapshot.executions);
  const doneInWindow = tasks.filter(task => (completions.get(task.id)?.occurredAt ?? '') >= windowStart).length;
  const pending = tasks.filter(task => !completions.has(task.id) && isDueByToday(task, now)).length;
  const parts: (ProgressPart | undefined)[] = [
    doneInWindow + pending > 0 ? { key: 'tasks', label: 'Ações', value: doneInWindow / (doneInWindow + pending), detail: `${doneInWindow} feitas · ${pending} no prazo ou atrasadas` } : undefined,
    habitsPart(snapshot, snapshot.habits.filter(habit => habit.areaId === areaId), now)
  ];
  return combine(parts.filter((part): part is ProgressPart => Boolean(part)));
}

export type BalanceTone = 'flow' | 'building' | 'care' | 'quiet';
export const balanceTone = (value?: number): { tone: BalanceTone; label: string } => value === undefined ? { tone: 'quiet', label: 'Sem registros' } : value >= 0.7 ? { tone: 'flow', label: 'Em fluxo' } : value >= 0.4 ? { tone: 'building', label: 'Em construção' } : { tone: 'care', label: 'Pede cuidado' };

export interface AreaBalance { area: LifeArea; score?: number; movement: Progress; tone: BalanceTone; label: string; }
export function lifeBalance(snapshot: LifeSnapshot, now = new Date()) {
  const assessment = latestAssessment(snapshot.assessments);
  const areas: AreaBalance[] = snapshot.areas.map(area => { const movement = areaMovement(snapshot, area.id, now); return { area, score: assessment?.scores[area.id], movement, ...balanceTone(movement.value) }; });
  const measured = areas.filter(item => item.movement.value !== undefined);
  return { overall: mean(measured.map(item => item.movement.value!)), areas, measuredCount: measured.length, assessment, needsAssessment: !assessmentOfCycle(snapshot.assessments, cycleOf(now)), cycle: cycleOf(now) };
}

export interface AreaSummary { activeProjects: number; currentGoals: number; openActions: number; totalActions: number; completedActions: number; upcomingEvents: number; habits: number; }
export function areaSummary(snapshot: LifeSnapshot, areaId: EntityId, now = new Date()): AreaSummary {
  const tasks = tasksOfArea(snapshot, areaId);
  const completed = tasks.filter(task => isTaskCompleted(task.id, snapshot.executions)).length;
  return {
    activeProjects: snapshot.projects.filter(project => project.areaId === areaId && project.status === 'active').length,
    currentGoals: snapshot.goals.filter(goal => goal.areaId === areaId && goal.horizon === 'current').length,
    openActions: tasks.length - completed,
    totalActions: tasks.length,
    completedActions: completed,
    upcomingEvents: upcomingEvents(snapshot.events, now).filter(event => event.areaId === areaId).length,
    habits: snapshot.habits.filter(habit => habit.areaId === areaId && habit.active).length
  };
}

/* ── Health ─────────────────────────────────────────────────────────────── */

export function lastCheckup(snapshot: LifeSnapshot, kind: CheckupKind): ISODate | undefined {
  return snapshot.healthCheckups.filter(item => item.kind === kind).map(item => item.date).sort().at(-1);
}
/** The three preventive markers, derived from recorded check-ups. */
export function healthMarkers(snapshot: LifeSnapshot) {
  return { lastBloodTestDate: lastCheckup(snapshot, 'blood_test'), lastMedicalCheckupDate: lastCheckup(snapshot, 'medical'), lastDentalCheckupDate: lastCheckup(snapshot, 'dental') };
}
export interface HealthAlert { kind: CheckupKind; lastDate: ISODate; days: number; }
/** A marker becomes an alert when more than 180 days passed since the recorded date. */
export function healthAlerts(snapshot: LifeSnapshot, now = new Date()): HealthAlert[] {
  return (Object.keys(checkupLabels) as CheckupKind[]).flatMap(kind => {
    const lastDate = lastCheckup(snapshot, kind);
    if (!lastDate) return [];
    const days = daysBetween(fromISODate(lastDate), now);
    return days > CHECKUP_LIMIT_DAYS ? [{ kind, lastDate, days }] : [];
  });
}

/* ── Finance ────────────────────────────────────────────────────────────── */

export function financeOverview(snapshot: LifeSnapshot, now = new Date()) {
  const month = toISODate(now).slice(0, 7);
  let income = 0; let expense = 0; let vaults = 0; let monthIncome = 0; let monthExpense = 0; let monthSaved = 0;
  for (const entry of snapshot.financeEntries) {
    const inMonth = entry.date.startsWith(month);
    if (entry.type === 'income') { income += entry.amountCents; if (inMonth) monthIncome += entry.amountCents; }
    if (entry.type === 'expense') { expense += entry.amountCents; if (inMonth) monthExpense += entry.amountCents; }
    if (entry.type === 'vault_deposit') { vaults += entry.amountCents; if (inMonth) monthSaved += entry.amountCents; }
  }
  return { balanceCents: income - expense - vaults, vaultTotalCents: vaults, monthIncomeCents: monthIncome, monthExpenseCents: monthExpense, monthSavedCents: monthSaved, monthLabel: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(now) };
}
export function expensesByCategory(snapshot: LifeSnapshot, now = new Date()) {
  const month = toISODate(now).slice(0, 7);
  const totals = new Map<string, number>();
  for (const entry of snapshot.financeEntries) if (entry.type === 'expense' && entry.date.startsWith(month)) totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amountCents);
  return [...totals.entries()].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents);
}

/* ── Day ────────────────────────────────────────────────────────────────── */

export const upcomingEvents = (events: CalendarEvent[], now = new Date()) => events.filter(event => event.status !== 'cancelled' && Date.parse(event.endsAt) >= now.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
export const eventsOn = (events: CalendarEvent[], date = new Date()) => events.filter(event => event.status !== 'cancelled' && daysBetween(date, new Date(event.startsAt)) === 0).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export interface Focus { task: Task; goal?: Goal; project?: Project; reason: string; }
/** Most important open action for today: deadline, priority and connection to an active goal. */
export function focusOfDay(snapshot: LifeSnapshot, now = new Date()): Focus | undefined {
  const goals = new Set(activeGoals(snapshot, now).map(goal => goal.id));
  const projectGoal = new Map(snapshot.projects.map(project => [project.id, project]));
  const scored = openTasks(snapshot).map(task => {
    const project = task.projectId ? projectGoal.get(task.projectId) : undefined;
    const goalId = task.goalId ?? project?.goalId;
    const score = (isDueByToday(task, now) ? 4 : 0) + (task.priority === 'high' ? 2 : 0) + (goalId && goals.has(goalId) ? 3 : 0) + (project?.focus ? 1 : 0);
    return { task, project, goal: snapshot.goals.find(goal => goal.id === goalId), score };
  }).sort((a, b) => b.score - a.score || byRelevance(a.task, b.task));
  const best = scored[0];
  if (!best) return undefined;
  const reason = best.goal ? `Conectado à meta ${best.goal.title}` : best.project ? `Projeto ${best.project.title}` : isDueByToday(best.task, now) ? 'Prazo de hoje' : 'Próxima ação da sua lista';
  return { task: best.task, goal: best.goal, project: best.project, reason };
}

/* ── Signals ────────────────────────────────────────────────────────────── */

export type SignalTarget = 'execution' | 'projects' | 'goals' | 'habits' | 'areas' | 'finances';
export interface Signal { id: string; tone: 'alert' | 'attention' | 'positive'; area: string; title: string; detail: string; target: SignalTarget; areaId?: EntityId; }
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function lifeSignals(snapshot: LifeSnapshot, now = new Date()): Signal[] {
  const signals: Signal[] = [];
  for (const alert of healthAlerts(snapshot, now)) signals.push({ id: `health-${alert.kind}`, tone: 'alert', area: 'Saúde', title: 'Atenção na Saúde', detail: `${capitalize(checkupLabels[alert.kind].lastPhrase)} há mais de 6 meses. Hora de agendar.`, target: 'areas', areaId: 'health' });
  const overdue = openTasks(snapshot).filter(task => isOverdue(task, now));
  if (overdue.length) signals.push({ id: 'overdue', tone: 'attention', area: areaName(snapshot, overdue[0].areaId), title: overdue.length === 1 ? 'Uma ação passou do prazo' : `${overdue.length} ações passaram do prazo`, detail: overdue[0].title, target: 'execution' });
  for (const project of snapshot.projects.filter(item => item.status === 'active')) {
    const { lastActivityAt, nextAction } = projectProgress(snapshot, project);
    const idle = lastActivityAt ? daysBetween(new Date(lastActivityAt), now) : undefined;
    if (idle !== undefined && idle >= 7) signals.push({ id: `idle-${project.id}`, tone: 'attention', area: areaName(snapshot, project.areaId), title: `Projeto sem movimento há ${idle} dias`, detail: `${project.title}${nextAction ? ` · próxima ação: ${nextAction.title}` : ''}`, target: 'projects' });
  }
  if (!assessmentOfCycle(snapshot.assessments, cycleOf(now))) signals.push({ id: 'maas', tone: 'attention', area: 'Método CIS', title: 'Hora da sua avaliação semestral', detail: `O MAAS de ${cycleLabel(cycleOf(now))} ainda não foi registrado.`, target: 'areas' });
  for (const habit of snapshot.habits.filter(item => item.active)) {
    const streak = habitStreak(habit, snapshot.habitCheckIns, now);
    if (streak >= 3) signals.push({ id: `streak-${habit.id}`, tone: 'positive', area: areaName(snapshot, habit.areaId), title: `${habit.title}: ${streak} dias seguidos`, detail: 'Constância que constrói o seu shape de vida.', target: 'habits' });
  }
  const order = { alert: 0, attention: 1, positive: 2 } as const;
  return signals.sort((a, b) => order[a.tone] - order[b.tone]);
}

/* ── Display helpers (pt-BR) ────────────────────────────────────────────── */

const time = (iso: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const shortDate = (date: Date, now: Date) => new Intl.DateTimeFormat('pt-BR', date.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(date).replace(/\./g, '');
export const formatTime = time;
export const formatKg = (kg: number) => `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
export function formatDay(value: string, now = new Date()) {
  const date = value.length === 10 ? fromISODate(value) : new Date(value);
  const diff = daysBetween(now, date);
  return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff === -1 ? 'Ontem' : shortDate(date, now);
}
export function formatDue(task: Task, now = new Date()) {
  if (!task.dueAt) return 'Sem prazo';
  const day = formatDay(task.dueAt, now);
  return `${task.dueHasTime ? `${day} · ${time(task.dueAt)}` : day}${isOverdue(task, now) ? ' · em atraso' : ''}`;
}
export function formatActivity(iso: string | undefined, now = new Date()) {
  if (!iso) return 'Sem movimento registrado';
  const days = daysBetween(new Date(iso), now);
  return days <= 0 ? 'Movimento hoje' : days === 1 ? 'Movimento ontem' : `Sem movimento há ${days} dias`;
}
export const formatAgo = (date: ISODate, now = new Date()) => { const days = daysBetween(fromISODate(date), now); return days <= 0 ? 'hoje' : days === 1 ? 'ontem' : days < 60 ? `há ${days} dias` : `há ${Math.round(days / 30)} meses`; };
