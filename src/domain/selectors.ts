import { checkupLabels, formatBRL } from './catalog';
import { cycleLabel, cycleOf, fromISODate, toISODate, type AestheticRitual, type CalendarEvent, type CheckupKind, type EntityId, type ExecutionRecord, type Flashcard, type FinanceVault, type FlashcardRating, type Goal, type Habit, type HabitCheckIn, type Idea, type ISODate, type LifeArea, type LifeAssessment, type LifeSnapshot, type Project, type Task } from './models';

/**
 * Pure reads over the snapshot. Every status, percentage or alert on screen comes from here.
 * When there is nothing real to measure, functions return `undefined` instead of a number.
 */

const DAY = 86_400_000;
export const MOVEMENT_WINDOW_DAYS = 14;
export const INDEX_WINDOW_DAYS = 30;
export const CHECKUP_LIMIT_DAYS = 180;
export const STALLED_AFTER_POSTPONEMENTS = 3;
export const FOCUS_SLOTS = 3;
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const percent = (value: number) => Math.round(value * 100);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
const defined = <T,>(value: T | undefined): value is T => value !== undefined;

/* ── Completion and postponement (append-only, latest fact wins) ────────── */

const completionCache = new WeakMap<ExecutionRecord[], Map<EntityId, ExecutionRecord>>();
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
export const postponementsOf = (taskId: EntityId, executions: ExecutionRecord[]) => executions.filter(record => record.kind === 'postponement' && record.taskId === taskId).length;

/** Open tasks postponed three or more times ("adiadas mais de duas vezes"). */
export function detectStalledTasks(snapshot: LifeSnapshot) {
  const counts = new Map<EntityId, number>();
  for (const record of snapshot.executions) if (record.kind === 'postponement' && record.taskId) counts.set(record.taskId, (counts.get(record.taskId) ?? 0) + 1);
  return snapshot.tasks.filter(task => (counts.get(task.id) ?? 0) >= STALLED_AFTER_POSTPONEMENTS && !isTaskCompleted(task.id, snapshot.executions)).map(task => ({ task, postponements: counts.get(task.id)! }));
}
export const isStalled = (task: Task, snapshot: LifeSnapshot) => postponementsOf(task.id, snapshot.executions) >= STALLED_AFTER_POSTPONEMENTS && !isTaskCompleted(task.id, snapshot.executions);

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
export const goalOfTask = (snapshot: LifeSnapshot, task: Task) => snapshot.goals.find(goal => goal.id === (task.goalId ?? snapshot.projects.find(project => project.id === task.projectId)?.goalId));

/* ── Deliveries of the day (Regra das 3 Entregas) ───────────────────────── */

export const MAX_SECONDARY = 2;
const activeProjectIds = (snapshot: LifeSnapshot) => new Set(snapshot.projects.filter(project => project.status === 'active').map(project => project.id));

/**
 * The day shows at most 3 deliveries: 1 magna + up to 2 secondary, pinned for today.
 * Pins expire with the day: what was not done simply returns to its project (`returned`),
 * never piling up in red. Suggestions come from active projects first, then goals.
 */
export function todayFocus(snapshot: LifeSnapshot, now = new Date()) {
  const today = toISODate(now);
  const done = (task: Task) => isTaskCompleted(task.id, snapshot.executions);
  const pinned = snapshot.tasks.filter(task => task.focusOn === today);
  const magna = pinned.find(task => task.focusRole === 'magna') ?? pinned.find(task => !task.focusRole);
  const secondary = pinned.filter(task => task !== magna).slice(0, MAX_SECONDARY);
  const deliveries = [magna, ...secondary].filter((task): task is Task => Boolean(task));
  const projects = activeProjectIds(snapshot);
  const goals = new Set(activeGoals(snapshot, now).map(goal => goal.id));
  const open = openTasks(snapshot).filter(task => task.focusOn !== today);
  const fromProjects = open.filter(task => task.projectId && projects.has(task.projectId));
  const fromGoals = open.filter(task => !fromProjects.includes(task) && goals.has(goalOfTask(snapshot, task)?.id ?? ''));
  const score = (task: Task) => (task.priority === 'high' ? 2 : 0) + (task.isMilestone ? 0 : 1) + (task.estimateMinutes ? 1 : 0) + (isDueByToday(task, now) ? 1 : 0);
  const suggestions = [...fromProjects, ...fromGoals].sort((a, b) => score(b) - score(a) || byRelevance(a, b)).slice(0, 6);
  const returned = snapshot.tasks.filter(task => task.focusOn && task.focusOn < today && !done(task)).filter(task => task.focusOn === toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)));
  return {
    magna, secondary, deliveries, suggestions, returned,
    openSlots: { magna: magna ? 0 : 1, secondary: MAX_SECONDARY - secondary.length },
    minutesLeft: deliveries.filter(task => !done(task)).reduce((sum, task) => sum + (task.estimateMinutes ?? 0), 0),
    done: deliveries.filter(done).length
  };
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
export function habitStreak(habit: Habit, checkIns: HabitCheckIn[], now = new Date()) {
  let cursor = startOfDay(now);
  if (!isHabitDone(habit.id, toISODate(cursor), checkIns)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (isHabitDone(habit.id, toISODate(cursor), checkIns)) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}
export const lastDays = (count: number, now = new Date()) => Array.from({ length: count }, (_, index) => addDays(startOfDay(now), index - count + 1));

/* ── Progress parts ─────────────────────────────────────────────────────── */

export type ProgressKey = 'milestones' | 'tasks' | 'habits' | 'measure' | 'income' | 'vaults';
export interface ProgressPart { key: ProgressKey; label: string; value: number; detail: string; }
export interface Progress { value?: number; parts: ProgressPart[]; }
const combine = (parts: (ProgressPart | undefined)[]): Progress => { const real = parts.filter(defined); return { value: mean(real.map(part => part.value)), parts: real }; };

function tasksPart(snapshot: LifeSnapshot, tasks: Task[], key: 'tasks' | 'milestones' = 'tasks'): ProgressPart | undefined {
  if (!tasks.length) return undefined;
  const done = tasks.filter(task => isTaskCompleted(task.id, snapshot.executions)).length;
  return { key, label: key === 'milestones' ? 'Marcos' : 'Ações', value: done / tasks.length, detail: `${done} de ${tasks.length} ${key === 'milestones' ? 'marcos alcançados' : 'ações concluídas'}` };
}
function habitsPart(snapshot: LifeSnapshot, habits: Habit[], now: Date, windowDays = MOVEMENT_WINDOW_DAYS): ProgressPart | undefined {
  const ratio = mean(habits.filter(habit => habit.active).map(habit => habitConsistency(habit, snapshot.habitCheckIns, now, windowDays)).filter(defined).map(value => value.ratio));
  if (ratio === undefined) return undefined;
  return { key: 'habits', label: 'Hábitos', value: ratio, detail: `${percent(ratio)}% de constância em ${windowDays} dias` };
}

/* ── Health ─────────────────────────────────────────────────────────────── */

export const lastCheckup = (snapshot: LifeSnapshot, kind: CheckupKind): ISODate | undefined => snapshot.healthMarkers.filter(item => item.kind === kind).map(item => item.date).sort().at(-1);
export function weightTrend(snapshot: LifeSnapshot) {
  const history = snapshot.healthMarkers.filter(item => item.kind === 'weight' && item.valueKg !== undefined).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const first = history[0]; const latest = history.at(-1);
  return { history, first, latest, changeKg: first && latest ? Math.round((latest.valueKg! - first.valueKg!) * 10) / 10 : undefined };
}
/** HealthMarkers view: the three preventive dates plus the current weight, all derived from facts. */
export function healthMarkers(snapshot: LifeSnapshot) {
  return { lastBloodTestDate: lastCheckup(snapshot, 'blood_test'), lastMedicalCheckupDate: lastCheckup(snapshot, 'medical'), lastDentalCheckupDate: lastCheckup(snapshot, 'dental'), currentWeightKg: weightTrend(snapshot).latest?.valueKg };
}
export interface HealthAlert { kind: CheckupKind; lastDate: ISODate; days: number; }
/** Pending check-ups: more than 180 days since the recorded date. */
export function getHealthAlerts(snapshot: LifeSnapshot, now = new Date()): HealthAlert[] {
  return (Object.keys(checkupLabels) as CheckupKind[]).flatMap(kind => {
    const lastDate = lastCheckup(snapshot, kind);
    if (!lastDate) return [];
    const days = daysBetween(fromISODate(lastDate), now);
    return days > CHECKUP_LIMIT_DAYS ? [{ kind, lastDate, days }] : [];
  });
}
/** Check-ups that were never recorded: not an alert, but an invitation to register. */
export const missingCheckups = (snapshot: LifeSnapshot) => (Object.keys(checkupLabels) as CheckupKind[]).filter(kind => !lastCheckup(snapshot, kind));

/* ── Finance ────────────────────────────────────────────────────────────── */

export const vaultBalance = (vaultId: EntityId, snapshot: LifeSnapshot) => snapshot.financeEntries.filter(entry => entry.type === 'vault_deposit' && entry.vaultId === vaultId).reduce((sum, entry) => sum + entry.amountCents, 0);
export function vaultProgress(vault: FinanceVault, snapshot: LifeSnapshot) {
  const balance = vaultBalance(vault.id, snapshot);
  return { balance, ratio: vault.targetCents > 0 ? clamp01(balance / vault.targetCents) : undefined, remaining: Math.max(0, vault.targetCents - balance) };
}
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

/* ── Studies and flashcards ─────────────────────────────────────────────── */

export function subjectStats(snapshot: LifeSnapshot, subjectId: EntityId) {
  const sessions = snapshot.studySessions.filter(session => session.subjectId === subjectId);
  const questions = sessions.reduce((sum, session) => sum + (session.questions ?? 0), 0);
  const correct = sessions.reduce((sum, session) => sum + (session.correct ?? 0), 0);
  return { sessions: sessions.length, minutes: sessions.reduce((sum, session) => sum + session.minutes, 0), questions, correct, accuracy: questions ? correct / questions : undefined, lastDate: sessions.map(session => session.date).sort().at(-1) };
}
export function deckStats(snapshot: LifeSnapshot, deckId: EntityId, now = new Date(), windowDays = INDEX_WINDOW_DAYS) {
  const subjects = new Set(snapshot.studySubjects.filter(subject => subject.deckId === deckId).map(subject => subject.id));
  const from = toISODate(addDays(startOfDay(now), -(windowDays - 1)));
  const sessions = snapshot.studySessions.filter(session => subjects.has(session.subjectId) && session.date >= from);
  const questions = sessions.reduce((sum, session) => sum + (session.questions ?? 0), 0);
  const correct = sessions.reduce((sum, session) => sum + (session.correct ?? 0), 0);
  return { minutes: sessions.reduce((sum, session) => sum + session.minutes, 0), days: new Set(sessions.map(session => session.date)).size, questions, accuracy: questions ? correct / questions : undefined };
}

/**
 * SM-2 (SuperMemo 2, the algorithm behind Anki), replayed over the full review history.
 * Answers map to quality: Novamente 1 · Difícil 3 · Bom 4 · Fácil 5.
 * "Novamente" resets the card and brings it back in 10 minutes, like Anki's learning step.
 */
const quality: Record<FlashcardRating, number> = { again: 1, hard: 3, good: 4, easy: 5 };
export interface CardState { reviews: number; repetitions: number; ease: number; intervalDays: number; dueAt: string; isNew: boolean; lastRating?: FlashcardRating; }
export function cardSchedule(card: Flashcard, snapshot: LifeSnapshot): CardState {
  const reviews = snapshot.flashcardReviews.filter(review => review.cardId === card.id).sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
  let ease = 2.5; let repetitions = 0; let intervalDays = 0; let dueAt = card.createdAt;
  for (const review of reviews) {
    const rating = (review.rating in quality ? review.rating : 'good') as FlashcardRating;
    const q = quality[rating];
    if (q < 3) { repetitions = 0; intervalDays = 0; dueAt = new Date(Date.parse(review.reviewedAt) + 10 * 60_000).toISOString(); }
    else {
      repetitions += 1;
      intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(intervalDays * ease);
      dueAt = new Date(Date.parse(review.reviewedAt) + intervalDays * DAY).toISOString();
    }
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  return { reviews: reviews.length, repetitions, ease, intervalDays, dueAt, isNew: reviews.length === 0, lastRating: reviews.at(-1)?.rating };
}
export const dueCards = (snapshot: LifeSnapshot, deckId: EntityId, now = new Date()) => snapshot.flashcards.filter(card => card.deckId === deckId).filter(card => Date.parse(cardSchedule(card, snapshot).dueAt) <= now.getTime());
/** Retention: share of reviews of already-seen cards answered without "Novamente". */
export function retentionHistory(snapshot: LifeSnapshot, deckId: EntityId, now = new Date(), days = 14) {
  const cards = new Set(snapshot.flashcards.filter(card => card.deckId === deckId).map(card => card.id));
  const reviews = snapshot.flashcardReviews.filter(review => cards.has(review.cardId)).sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
  const seen = new Set<EntityId>(); const graded: { date: ISODate; kept: boolean }[] = [];
  for (const review of reviews) { if (seen.has(review.cardId)) graded.push({ date: toISODate(new Date(review.reviewedAt)), kept: review.rating !== 'again' }); seen.add(review.cardId); }
  const series = lastDays(days, now).map(day => { const iso = toISODate(day); const items = graded.filter(item => item.date === iso); return { date: iso, reviews: reviews.filter(review => toISODate(new Date(review.reviewedAt)) === iso).length, retention: items.length ? items.filter(item => item.kept).length / items.length : undefined }; });
  const recent = graded.filter(item => item.date >= series[0].date);
  return { series, retention: recent.length ? recent.filter(item => item.kept).length / recent.length : undefined, reviewedToday: series.at(-1)?.reviews ?? 0 };
}

/* ── Goals ──────────────────────────────────────────────────────────────── */

/** Real progress of a goal: average of milestones, actions, habits, measure, income and vaults. */
export function goalProgress(snapshot: LifeSnapshot, goal: Goal, now = new Date()): Progress {
  const tasks = tasksOfGoal(snapshot, goal.id);
  const parts: (ProgressPart | undefined)[] = [
    tasksPart(snapshot, tasks.filter(task => task.isMilestone), 'milestones'),
    tasksPart(snapshot, tasks.filter(task => !task.isMilestone)),
    habitsPart(snapshot, snapshot.habits.filter(habit => habit.goalId === goal.id), now)
  ];
  if (goal.measure?.kind === 'weight') {
    const latest = weightTrend(snapshot).latest?.valueKg;
    if (latest !== undefined) {
      const { startKg, targetKg, checkpointsKg } = goal.measure;
      const next = [...checkpointsKg, targetKg].find(kg => latest > kg);
      parts.push({ key: 'measure', label: 'Peso', value: clamp01((startKg - latest) / (startKg - targetKg)), detail: `${formatKg(latest)} agora · ${next ? `próximo marco ${formatKg(next)}` : 'meta alcançada'}` });
    }
  }
  if (goal.measure?.kind === 'monthlyIncome') {
    const income = financeOverview(snapshot, now).monthIncomeCents;
    if (snapshot.financeEntries.length) parts.push({ key: 'income', label: 'Receita do mês', value: clamp01(income / goal.measure.targetCents), detail: `${formatBRL(income)} de ${formatBRL(goal.measure.targetCents)} neste mês` });
  }
  const vaults = snapshot.vaults.filter(vault => vault.goalId === goal.id && vault.targetCents > 0);
  if (vaults.length) {
    const balance = vaults.reduce((sum, vault) => sum + vaultBalance(vault.id, snapshot), 0);
    const target = vaults.reduce((sum, vault) => sum + vault.targetCents, 0);
    parts.push({ key: 'vaults', label: 'Cofres', value: clamp01(balance / target), detail: `${formatBRL(balance)} de ${formatBRL(target)}` });
  }
  return combine(parts);
}
export const calculateGoalProgress = (snapshot: LifeSnapshot, goalId: EntityId, now = new Date()) => { const goal = snapshot.goals.find(item => item.id === goalId); return goal ? goalProgress(snapshot, goal, now) : { parts: [] }; };
export const activeGoals = (snapshot: LifeSnapshot, now = new Date()) => snapshot.goals.filter(goal => goal.status === 'active' && goal.horizon === 'current' && (!goal.cycle || goal.cycle === cycleOf(now))).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

/* ── Projects ───────────────────────────────────────────────────────────── */

export interface ProjectProgress { progress?: number; nextAction?: Task; lastActivityAt?: string; }
export function projectProgress(snapshot: LifeSnapshot, project: Project): ProjectProgress {
  const tasks = snapshot.tasks.filter(task => task.projectId === project.id);
  const open = tasks.filter(task => !isTaskCompleted(task.id, snapshot.executions));
  const lastActivityAt = snapshot.executions.filter(record => record.projectId === project.id && (record.kind === 'completion' || record.kind === 'session')).map(record => record.occurredAt).sort().at(-1);
  return { progress: tasks.length ? percent((tasks.length - open.length) / tasks.length) : undefined, nextAction: open.sort(byRelevance)[0], lastActivityAt };
}

/* ── Areas, life balance and Mands S.A. ─────────────────────────────────── */

export const latestAssessment = (assessments: LifeAssessment[]): LifeAssessment | undefined => assessments.slice().sort((a, b) => a.assessedAt.localeCompare(b.assessedAt)).at(-1);
export const assessmentOfCycle = (assessments: LifeAssessment[], cycle = cycleOf(new Date())) => latestAssessment(assessments.filter(item => item.cycle === cycle));

/** Done ÷ (done + due and still open), inside the window. Undefined when nothing was due or done. */
function executionPart(snapshot: LifeSnapshot, tasks: Task[], now: Date, windowDays: number): ProgressPart | undefined {
  const windowStart = addDays(startOfDay(now), -(windowDays - 1)).toISOString();
  const windowEnd = addDays(startOfDay(now), 1).toISOString();
  const completions = completionIndex(snapshot.executions);
  const inWindow = (iso?: string) => Boolean(iso) && iso! >= windowStart && iso! < windowEnd;
  const done = tasks.filter(task => inWindow(completions.get(task.id)?.occurredAt)).length;
  const pending = tasks.filter(task => !completions.has(task.id) && isDueByToday(task, now)).length;
  return done + pending > 0 ? { key: 'tasks', label: 'Ações', value: done / (done + pending), detail: `${done} feitas · ${pending} no prazo ou atrasadas` } : undefined;
}
function studyDaysPart(snapshot: LifeSnapshot, subjectIds: Set<EntityId>, now: Date, windowDays: number): ProgressPart | undefined {
  const subjects = snapshot.studySubjects.filter(subject => subjectIds.has(subject.id));
  if (!subjects.length) return undefined;
  const windowStart = addDays(startOfDay(now), -(windowDays - 1));
  const born = startOfDay(new Date(subjects.map(subject => subject.createdAt).sort()[0]));
  const start = born > windowStart ? born : windowStart;
  const days = daysBetween(start, now) + 1;
  const studied = new Set(snapshot.studySessions.filter(session => subjectIds.has(session.subjectId) && session.date >= toISODate(start) && session.date <= toISODate(now)).map(session => session.date)).size;
  return days > 0 ? { key: 'habits', label: 'Dias de estudo', value: clamp01(studied / days), detail: `${studied} de ${days} dias com sessão registrada` } : undefined;
}

/** Real movement of an area (0 to 1): actions, habits and study days of the last 14 days. */
export function areaMovement(snapshot: LifeSnapshot, areaId: EntityId, now = new Date()): Progress {
  const goalIds = new Set(snapshot.goals.filter(goal => goal.areaId === areaId).map(goal => goal.id));
  const subjects = new Set(snapshot.studySubjects.filter(subject => subject.goalId && goalIds.has(subject.goalId)).map(subject => subject.id));
  return combine([executionPart(snapshot, tasksOfArea(snapshot, areaId), now, MOVEMENT_WINDOW_DAYS), habitsPart(snapshot, snapshot.habits.filter(habit => habit.areaId === areaId), now), subjects.size ? studyDaysPart(snapshot, subjects, now, MOVEMENT_WINDOW_DAYS) : undefined]);
}
export const calculateAreaRealScore = (snapshot: LifeSnapshot, areaId: EntityId, now = new Date()) => { const value = areaMovement(snapshot, areaId, now).value; return value === undefined ? undefined : percent(value); };

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
  return { activeProjects: snapshot.projects.filter(project => project.areaId === areaId && project.status === 'active').length, currentGoals: snapshot.goals.filter(goal => goal.areaId === areaId && goal.horizon === 'current').length, openActions: tasks.length - completed, totalActions: tasks.length, completedActions: completed, upcomingEvents: upcomingEvents(snapshot.events, now).filter(event => event.areaId === areaId).length, habits: snapshot.habits.filter(habit => habit.areaId === areaId && habit.active).length };
}

export interface IndexPillar { key: 'execution' | 'studies' | 'business' | 'health'; label: string; value?: number; parts: ProgressPart[]; }
/**
 * Mands S.A. index for the last 30 days. Each pillar averages only what really exists:
 * - Execução: every action due or done in the window.
 * - Estudos: study days and the habits of the study goals (PRF, inglês).
 * - Negócios: actions of the business goals (CAVU).
 * - Saúde: habits of the health goals and health actions.
 */
export function getMandsSAIndex(snapshot: LifeSnapshot, now = new Date(), windowDays = INDEX_WINDOW_DAYS): { pillars: IndexPillar[]; overall?: number; windowDays: number } {
  const goalsOf = (pillar: NonNullable<Goal['pillar']>[]) => snapshot.goals.filter(goal => goal.pillar && pillar.includes(goal.pillar));
  const tasksOfGoals = (goals: Goal[]) => goals.flatMap(goal => tasksOfGoal(snapshot, goal.id));
  const habitsOfGoals = (goals: Goal[]) => snapshot.habits.filter(habit => goals.some(goal => goal.id === habit.goalId));
  const study = goalsOf(['studies', 'language']); const business = goalsOf(['business']); const health = goalsOf(['health']);
  const studySubjects = new Set(snapshot.studySubjects.map(subject => subject.id));
  const pillars: IndexPillar[] = [
    { key: 'execution', label: 'Execução geral', ...combine([executionPart(snapshot, snapshot.tasks, now, windowDays)]) },
    { key: 'studies', label: 'Estudos', ...combine([studyDaysPart(snapshot, studySubjects, now, windowDays), habitsPart(snapshot, habitsOfGoals(study), now, windowDays)]) },
    { key: 'business', label: 'Negócios', ...combine([executionPart(snapshot, tasksOfGoals(business), now, windowDays), habitsPart(snapshot, habitsOfGoals(business), now, windowDays)]) },
    { key: 'health', label: 'Saúde', ...combine([habitsPart(snapshot, habitsOfGoals(health), now, windowDays), executionPart(snapshot, tasksOfGoals(health), now, windowDays)]) }
  ];
  return { pillars, overall: mean(pillars.map(pillar => pillar.value).filter(defined)), windowDays };
}

/* ── Day ────────────────────────────────────────────────────────────────── */

export const upcomingEvents = (events: CalendarEvent[], now = new Date()) => events.filter(event => event.status !== 'cancelled' && Date.parse(event.endsAt) >= now.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
export const eventsOn = (events: CalendarEvent[], date = new Date()) => events.filter(event => event.status !== 'cancelled' && daysBetween(date, new Date(event.startsAt)) === 0).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

/* ── Signals ────────────────────────────────────────────────────────────── */

export type SignalTarget = 'inicio' | 'agenda' | 'areas' | 'metas' | 'estudos' | 'ideias' | 'evolucao';
export interface Signal { id: string; tone: 'alert' | 'attention' | 'positive'; area: string; title: string; detail: string; target: SignalTarget; areaId?: EntityId; }
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function lifeSignals(snapshot: LifeSnapshot, now = new Date()): Signal[] {
  const signals: Signal[] = [];
  for (const alert of getHealthAlerts(snapshot, now)) signals.push({ id: `health-${alert.kind}`, tone: 'alert', area: 'Saúde', title: 'Atenção na Saúde', detail: `${capitalize(checkupLabels[alert.kind].lastPhrase)} há mais de 6 meses. Hora de agendar.`, target: 'areas', areaId: 'health' });
  for (const { task, postponements } of detectStalledTasks(snapshot)) signals.push({ id: `stalled-${task.id}`, tone: 'attention', area: areaName(snapshot, task.areaId), title: `Tarefa parada · adiada ${postponements} vezes`, detail: `${task.title}. Use "Preciso Começar" ou quebre em um passo menor.`, target: 'metas' });
  for (const status of ritualStatuses(snapshot, now).filter(item => item.due)) signals.push({ id: `ritual-${status.ritual.id}`, tone: 'attention', area: 'Bem-estar & Imagem', title: `${status.ritual.name}: hora de agendar`, detail: status.last ? `Último em ${formatDay(status.last, now).toLowerCase()} · retorno a cada ${status.ritual.intervalDays} dias.` : 'Ainda sem data registrada.', target: 'areas', areaId: 'wellbeing' });
  if (!assessmentOfCycle(snapshot.assessments, cycleOf(now))) signals.push({ id: 'assessment', tone: 'attention', area: 'Método CIS', title: 'Autoavaliação do ciclo pendente', detail: `A autoavaliação de ${cycleLabel(cycleOf(now))} ainda não foi registrada.`, target: 'areas' });
  for (const habit of snapshot.habits.filter(item => item.active)) {
    const streak = habitStreak(habit, snapshot.habitCheckIns, now);
    if (streak >= 3) signals.push({ id: `streak-${habit.id}`, tone: 'positive', area: areaName(snapshot, habit.areaId), title: `${habit.title}: ${streak} dias seguidos`, detail: 'Constância que vira resultado.', target: 'metas' });
  }
  const order = { alert: 0, attention: 1, positive: 2 } as const;
  return signals.sort((a, b) => order[a.tone] - order[b.tone]);
}

/* ── Display helpers (pt-BR) ────────────────────────────────────────────── */

const time = (iso: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const shortDate = (date: Date, now: Date) => new Intl.DateTimeFormat('pt-BR', date.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(date).replace(/\./g, '');
export const formatTime = time;
export const formatKg = (kg: number) => `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
export const formatMinutes = (minutes: number) => minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 ? String(minutes % 60).padStart(2, '0') : ''}`;
export function formatDay(value: string, now = new Date()) {
  const date = value.length === 10 ? fromISODate(value) : new Date(value);
  const diff = daysBetween(now, date);
  return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff === -1 ? 'Ontem' : shortDate(date, now);
}
export function formatDue(task: Task, now = new Date()) {
  if (!task.dueAt) return 'Sem prazo';
  const day = formatDay(task.dueAt, now);
  return task.dueHasTime ? `${day} · ${time(task.dueAt)}` : day;
}
export function formatActivity(iso: string | undefined, now = new Date()) {
  if (!iso) return 'Sem movimento registrado';
  const days = daysBetween(new Date(iso), now);
  return days <= 0 ? 'Movimento hoje' : days === 1 ? 'Movimento ontem' : `Sem movimento há ${days} dias`;
}
export const formatAgo = (date: ISODate, now = new Date()) => { const days = daysBetween(fromISODate(date), now); return days <= 0 ? 'hoje' : days === 1 ? 'ontem' : days < 60 ? `há ${days} dias` : `há ${Math.round(days / 30)} meses`; };

/* ── Periods and behavioural metrics (Evolução) ─────────────────────────── */

export type PeriodKey = '7d' | '30d' | '90d' | 'month';
export interface Period { key: PeriodKey; label: string; start: Date; end: Date; days: number; }
/** `month` is the last closed calendar month. `end` is exclusive. */
export function periodRange(key: PeriodKey, now = new Date()): Period {
  if (key === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { key, start, end, days: daysBetween(start, end), label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(start) };
  }
  const days = key === '7d' ? 7 : key === '30d' ? 30 : 90;
  return { key, days, start: addDays(startOfDay(now), -(days - 1)), end: addDays(startOfDay(now), 1), label: `Últimos ${days} dias` };
}

export interface BehaviorMetrics { planned: number; started: number; finished: number; sessions: number; plannedMinutes: number; focusedMinutes: number; pauses: number; resumes: number; unblocks: number; initiation?: number; focus?: number; resumption?: number; finish?: number; }
/**
 * Real behaviour in a period, from BehaviorEvent facts:
 * - Iniciação: deliveries planned for a day that got a focus session started.
 * - Foco: focused minutes ÷ planned block minutes of finished sessions.
 * - Retomada: resumes ÷ pauses (how often a paused session came back).
 * - Finalização: planned deliveries that were completed.
 */
export function behaviorMetrics(snapshot: LifeSnapshot, period: Period): BehaviorMetrics {
  const inside = (iso: string) => { const time = Date.parse(iso); return time >= period.start.getTime() && time < period.end.getTime(); };
  const events = snapshot.behaviorEvents.filter(event => inside(event.occurredAt)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const plans = new Map<string, { taskId: EntityId; date: ISODate; active: boolean }>();
  for (const event of events) if (event.taskId && (event.kind === 'focus_planned' || event.kind === 'focus_unplanned')) plans.set(`${event.date}|${event.taskId}`, { taskId: event.taskId, date: event.date, active: event.kind === 'focus_planned' });
  const planned = [...plans.values()].filter(plan => plan.active);
  const startedTasks = new Set(events.filter(event => event.kind === 'session_start' && event.taskId).map(event => `${event.date}|${event.taskId}`));
  const completions = completionIndex(snapshot.executions);
  const started = planned.filter(plan => startedTasks.has(`${plan.date}|${plan.taskId}`) || (completions.get(plan.taskId)?.occurredAt.slice(0, 10) ?? '') >= plan.date).length;
  const finished = planned.filter(plan => (completions.get(plan.taskId)?.occurredAt.slice(0, 10) ?? '') >= plan.date).length;
  const ends = events.filter(event => event.kind === 'session_end');
  const plannedMinutes = ends.reduce((sum, event) => sum + (event.plannedMinutes ?? 0), 0);
  const focusedMinutes = ends.reduce((sum, event) => sum + Math.min(event.focusedMinutes ?? 0, event.plannedMinutes ?? Number.POSITIVE_INFINITY), 0);
  const pauses = events.filter(event => event.kind === 'session_pause').length;
  const resumes = events.filter(event => event.kind === 'session_resume').length;
  const ratio = (a: number, b: number) => b > 0 ? clamp01(a / b) : undefined;
  return { planned: planned.length, started, finished, sessions: ends.length, plannedMinutes, focusedMinutes, pauses, resumes, unblocks: events.filter(event => event.kind === 'unblock').length, initiation: ratio(started, planned.length), focus: ratio(focusedMinutes, plannedMinutes), resumption: ratio(resumes, pauses), finish: ratio(finished, planned.length) };
}

/* ── Bem-estar & Imagem ─────────────────────────────────────────────────── */

export function ritualStatuses(snapshot: LifeSnapshot, now = new Date()) {
  return snapshot.aestheticRituals.slice().sort((a, b) => a.position - b.position).map((ritual: AestheticRitual) => {
    const last = snapshot.aestheticRecords.filter(record => record.ritualId === ritual.id).map(record => record.date).sort().at(-1);
    const next = last ? toISODate(addDays(fromISODate(last), ritual.intervalDays)) : undefined;
    const daysLeft = next ? daysBetween(now, fromISODate(next)) : undefined;
    return { ritual, last, next, daysLeft, due: daysLeft !== undefined && daysLeft <= 0 };
  });
}

/* ── Ideas ──────────────────────────────────────────────────────────────── */

export const normalizeTag = (tag: string) => tag.trim().replace(/^#+/, '').replace(/\s+/g, '');
export const ideaHasTag = (idea: Idea, tag?: string) => Boolean(tag) && idea.tags.some(item => normalizeTag(item).toLocaleLowerCase('pt-BR') === normalizeTag(tag!).toLocaleLowerCase('pt-BR'));
/** Ideas linked to a project: tagged with the project tag, or explicitly attached to it. */
export const ideasOfProject = (snapshot: LifeSnapshot, project: Project) => snapshot.ideas.filter(idea => idea.status !== 'archived' && (idea.projectId === project.id || ideaHasTag(idea, project.tag)));
