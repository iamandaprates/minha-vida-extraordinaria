import { cycleLabel, cycleOf, emptySnapshot, toISODate, type BodyMeasurement, type CalendarEvent, type EntityId, type ExecutionRecord, type FinanceEntry, type HabitCheckIn, type HealthCheckup, type LifeAssessment, type LifeSnapshot, type OwnedEntity, type Task, type Vision } from '../domain/models';
import { createStarterPlan, starterIds } from './starter';

/**
 * Demonstration records, used only by the in-memory data service when Supabase is not configured.
 * They are records, not numbers: every percentage on screen is still computed by the selectors.
 * Dates are relative to "now" so the demo always reads as a living week.
 */
export const DEMO_USER_ID = 'demo-user';

export function createDemoSnapshot(userId: EntityId = DEMO_USER_ID, now = new Date()): LifeSnapshot {
  const day = (offset: number, hour = 9, minute = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
  const at = (offset: number, hour = 9, minute = 0) => day(offset, hour, minute).toISOString();
  const date = (offset: number) => toISODate(day(offset));
  const owned = <T extends OwnedEntity>(id: string, createdOffset: number, value: Omit<T, keyof OwnedEntity>) => ({ ...value, id, userId, createdAt: at(createdOffset, 0), updatedAt: at(createdOffset, 0) }) as T;
  const { goals: g, project: p, habits: h, vaults: v } = starterIds;

  const starter = createStarterPlan(userId, day(-40));
  const cycle = cycleOf(now);
  starter.goals.forEach(goal => { goal.cycle = cycle; });
  starter.habits.forEach(habit => { habit.createdAt = at(-30); });
  starter.vaults.find(vault => vault.id === v.cavu)!.targetCents = 1_500_000;
  starter.vaults.find(vault => vault.id === v.apartment)!.targetCents = 6_000_000;

  const visions: Vision[] = [
    owned<Vision>('vision-career', -60, { title: 'Uma carreira autoral e expansiva', statement: 'Construo um trabalho que une estratégia, beleza e impacto, com espaço para crescer sem me desconectar de mim.', areaId: 'professional' }),
    owned<Vision>('vision-body', -60, { title: 'Uma vida que cabe em mim', statement: 'Escolho ritmo, presença e um corpo forte que sustenta quem estou me tornando.', areaId: 'health' }),
    owned<Vision>('vision-freedom', -60, { title: 'Liberdade com segurança', statement: 'Tenho estrutura financeira e estabilidade para escolher meus próximos passos com calma.', areaId: 'finance' })
  ];
  const visionOf: Record<string, string> = { [g.cavu]: 'vision-career', [g.shape]: 'vision-body', [g.prf]: 'vision-freedom', [g.apartment]: 'vision-freedom' };
  starter.goals.forEach(goal => { goal.visionId = visionOf[goal.id]; });

  const tasks: Task[] = [
    owned<Task>('demo-task-prf-1', -1, { title: 'Estudar para a PRF · Bloco 1', origin: 'planned', areaId: 'intellectual', goalId: g.prf, dueAt: at(0, 8), dueHasTime: true, priority: 'high', estimateMinutes: 50 }),
    owned<Task>('demo-task-cavu-supplier', -1, { title: 'Responder fornecedor de embalagens da CAVU', origin: 'captured', areaId: 'professional', projectId: p.cavu, dueAt: at(0), priority: 'normal' }),
    owned<Task>('demo-task-cavu-mix', -12, { title: 'Definir mix de produtos do lançamento', origin: 'planned', areaId: 'professional', projectId: p.cavu, dueAt: at(3), priority: 'normal' }),
    owned<Task>('demo-task-cavu-brand', -20, { title: 'Fechar identidade visual da CAVU', origin: 'planned', areaId: 'professional', projectId: p.cavu, priority: 'normal' }),
    owned<Task>('demo-task-cavu-cnpj', -25, { title: 'Abrir CNPJ e conta PJ', origin: 'planned', areaId: 'professional', projectId: p.cavu, priority: 'normal' }),
    owned<Task>('demo-task-prf-edital', -10, { title: 'Revisar edital da PRF', origin: 'planned', areaId: 'intellectual', goalId: g.prf, priority: 'normal' }),
    owned<Task>('demo-task-prf-simulado', -6, { title: 'Resolver simulado PRF · Português', origin: 'planned', areaId: 'intellectual', goalId: g.prf, dueAt: at(-2), priority: 'normal' }),
    owned<Task>('demo-task-blood', -3, { title: 'Agendar exame de sangue', origin: 'captured', areaId: 'health', goalId: g.shape, dueAt: at(2), priority: 'normal' }),
    owned<Task>('demo-task-budget', -5, { title: 'Fechar orçamento do mês', origin: 'planned', areaId: 'finance', goalId: g.apartment, dueAt: at(-1), priority: 'normal' }),
    owned<Task>('demo-task-family', -2, { title: 'Ligar para a vó', origin: 'captured', areaId: 'family', priority: 'low' })
  ];
  const complete = (id: string, taskId: string, offset: number, hour = 18): ExecutionRecord => {
    const task = tasks.find(item => item.id === taskId)!;
    const project = starter.projects.find(item => item.id === task.projectId);
    return owned<ExecutionRecord>(id, offset, { kind: 'completion', taskId, areaId: task.areaId, projectId: task.projectId, goalId: task.goalId ?? project?.goalId, occurredAt: at(offset, hour) });
  };
  const executions: ExecutionRecord[] = [
    complete('demo-exec-1', 'demo-task-cavu-cnpj', -14),
    complete('demo-exec-2', 'demo-task-cavu-brand', -9),
    complete('demo-exec-3', 'demo-task-prf-edital', -5),
    complete('demo-exec-4', 'demo-task-prf-simulado', -2, 21)
  ];

  const pattern: Record<string, (offset: number) => boolean> = {
    [h.training]: offset => offset % 3 !== 0,
    [h.water]: offset => offset % 4 !== 1,
    [h.food]: offset => offset % 2 === 0 || offset < 3,
    [h.study]: offset => offset < 6 || offset % 2 === 0
  };
  const habitCheckIns: HabitCheckIn[] = Object.entries(pattern).flatMap(([habitId, done]) => Array.from({ length: 14 }, (_, index) => index + 1)
    .filter(offset => done(offset))
    .map(offset => owned<HabitCheckIn>(`demo-check-${habitId}-${offset}`, -offset, { habitId, date: date(-offset), done: true, occurredAt: at(-offset, 20) })));

  const weights = [72.4, 71.9, 71.6, 71.0, 70.6, 70.2];
  const bodyMeasurements: BodyMeasurement[] = weights.map((weightKg, index) => { const offset = -(weights.length - 1 - index) * 7; return owned<BodyMeasurement>(`demo-weight-${index}`, offset, { date: date(offset), weightKg }); });
  const healthCheckups: HealthCheckup[] = [
    owned<HealthCheckup>('demo-checkup-blood', -210, { kind: 'blood_test', date: date(-210) }),
    owned<HealthCheckup>('demo-checkup-medical', -95, { kind: 'medical', date: date(-95), note: 'Ginecologista' }),
    owned<HealthCheckup>('demo-checkup-dental', -120, { kind: 'dental', date: date(-120) })
  ];

  const monthDay = (dayOfMonth: number, monthsAgo = 0) => toISODate(new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(dayOfMonth, monthsAgo ? 28 : now.getDate())));
  const entry = (id: string, value: Omit<FinanceEntry, keyof OwnedEntity>) => owned<FinanceEntry>(id, 0, value);
  const financeEntries: FinanceEntry[] = [
    entry('demo-fin-1', { type: 'income', amountCents: 650_000, date: monthDay(5, 1), category: 'salary', description: 'Salário' }),
    entry('demo-fin-2', { type: 'expense', amountCents: 180_000, date: monthDay(8, 1), category: 'housing', description: 'Aluguel e contas' }),
    entry('demo-fin-3', { type: 'expense', amountCents: 92_000, date: monthDay(14, 1), category: 'food', description: 'Mercado do mês' }),
    entry('demo-fin-4', { type: 'vault_deposit', amountCents: 250_000, date: monthDay(10, 1), category: 'vault', description: 'Aporte apartamento', vaultId: v.apartment }),
    entry('demo-fin-5', { type: 'vault_deposit', amountCents: 120_000, date: monthDay(10, 1), category: 'vault', description: 'Aporte CAVU', vaultId: v.cavu }),
    entry('demo-fin-6', { type: 'income', amountCents: 650_000, date: monthDay(5), category: 'salary', description: 'Salário' }),
    entry('demo-fin-7', { type: 'income', amountCents: 85_000, date: monthDay(7), category: 'freelance', description: 'Projeto de identidade visual' }),
    entry('demo-fin-8', { type: 'expense', amountCents: 180_000, date: monthDay(8), category: 'housing', description: 'Aluguel e contas' }),
    entry('demo-fin-9', { type: 'expense', amountCents: 46_500, date: monthDay(9), category: 'food', description: 'Mercado' }),
    entry('demo-fin-10', { type: 'expense', amountCents: 21_900, date: monthDay(9), category: 'education', description: 'Curso PRF' }),
    entry('demo-fin-11', { type: 'expense', amountCents: 38_000, date: monthDay(10), category: 'business', description: 'Amostras de embalagem CAVU' }),
    entry('demo-fin-12', { type: 'vault_deposit', amountCents: 150_000, date: monthDay(10), category: 'vault', description: 'Aporte apartamento', vaultId: v.apartment }),
    entry('demo-fin-13', { type: 'vault_deposit', amountCents: 80_000, date: monthDay(10), category: 'vault', description: 'Aporte CAVU', vaultId: v.cavu })
  ];

  const events: CalendarEvent[] = [
    owned<CalendarEvent>('demo-event-1', -3, { title: 'Reunião com a designer da CAVU', startsAt: at(0, 10, 30), endsAt: at(0, 11, 30), areaId: 'professional', projectId: p.cavu, status: 'confirmed', source: 'google', externalId: 'demo-google-1' }),
    owned<CalendarEvent>('demo-event-2', -3, { title: 'Treino funcional', startsAt: at(0, 19), endsAt: at(0, 20), areaId: 'health', status: 'planned', source: 'manual' }),
    owned<CalendarEvent>('demo-event-3', -3, { title: 'Aulão de Direito Administrativo', startsAt: at(1, 19, 30), endsAt: at(1, 21), areaId: 'intellectual', status: 'planned', source: 'manual' })
  ];

  const previous = day(-150);
  const previousCycle = cycleOf(previous);
  const scores: Record<string, number> = { professional: 7, finance: 5, intellectual: 6, social: 6, relationship: 7, family: 8, leisure: 4, health: 5, emotional: 6, spiritual: 7, service: 5, 'personal-development': 8 };
  const assessments: LifeAssessment[] = [owned<LifeAssessment>('demo-maas-1', -150, { cycle: previousCycle, period: cycleLabel(previousCycle), assessedAt: previous.toISOString(), scores })];

  return { ...emptySnapshot(), ...starter, visions, tasks, executions, habitCheckIns, bodyMeasurements, healthCheckups, financeEntries, events, assessments };
}
