/// <reference types="node" />
/**
 * Mive command line, used by the Claude Code skills in `.claude/skills/mive-*`.
 *
 *   npx tsx scripts/mive.ts <command> [--option=value]
 *
 * Commands
 *   report     [--week=YYYY-MM-DD]                     Time report of the week (Monday to Sunday)
 *   goals      [--week=YYYY-MM-DD]                     Weekly review of the cycle goals
 *   optimize   [--days=7] [--from=7] [--to=22] [--max=6]  Agenda blocks proposed for lagging goals
 *   ids                                                Areas, goals, projects and habits with their ids
 *   add-task   --title= [--goal=] [--area=] [--project=] [--due=YYYY-MM-DD[THH:mm]] [--priority=high] [--minutes=]
 *   add-event  --title= --start=YYYY-MM-DDTHH:mm --minutes= [--area=] [--project=]
 * Global flags
 *   --demo     Use the demonstration data even when Supabase is configured
 *   --json     Print JSON instead of text
 *
 * Data source
 *   Supabase when VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and MIVE_ACCESS_TOKEN are set
 *   (environment or .env.local). Requests run as that person, so Row Level Security applies.
 *   Otherwise local mode: the real initial seed in memory, and writes are only simulated.
 *
 * Every number comes from src/domain (selectors and reports): nothing is computed twice.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createDemoSnapshot, DEMO_USER_ID } from '../src/data/demo';
import { createEntity, type CalendarEvent, type Collection, type EntityId, type EntityOf, type LifeSnapshot, type Task } from '../src/domain/models';
import { optimizerProposals, timeReport, weeklyGoals, type WeeklyStatus } from '../src/domain/reports';
import { activeGoals, areaName, formatDue, percent } from '../src/domain/selectors';
import type { DataService } from '../src/services/repository';

type Flags = Record<string, string | true>;
const [command = 'help', ...rest] = process.argv.slice(2);
const flags: Flags = Object.fromEntries(rest.filter(arg => arg.startsWith('--')).map(arg => { const [key, ...value] = arg.slice(2).split('='); return [key, value.length ? value.join('=') : true]; }));
const text = (key: string) => typeof flags[key] === 'string' ? (flags[key] as string) : undefined;
const number = (key: string, fallback: number) => { const value = Number(text(key)); return Number.isFinite(value) && text(key) ? value : fallback; };

/* ── Data source ────────────────────────────────────────────────────────── */

interface Source { mode: 'demo' | 'cloud'; userId: EntityId; snapshot: LifeSnapshot; service?: DataService; }

function readEnvFile(): Record<string, string> {
  if (!existsSync('.env.local')) return {};
  return Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')]; }));
}

async function openSource(): Promise<Source> {
  const env = { ...readEnvFile(), ...process.env };
  if (!flags.demo && env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
    if (!env.MIVE_ACCESS_TOKEN) fail('Supabase configurado, mas falta MIVE_ACCESS_TOKEN (token de sessão da pessoa). Veja .claude/skills/README.md, ou use --demo.');
    const { createSupabaseDataService, readSupabaseConfig } = await import('../src/services/supabase');
    const service = createSupabaseDataService(readSupabaseConfig(env)!);
    const user = await service.auth.currentUser();
    if (!user) fail('O MIVE_ACCESS_TOKEN não é válido ou expirou. Gere um novo token de sessão.');
    return { mode: 'cloud', userId: user.id, snapshot: await service.load(user.id), service };
  }
  return { mode: 'demo', userId: DEMO_USER_ID, snapshot: createDemoSnapshot() };
}

async function write<C extends Collection>(source: Source, collection: C, entity: EntityOf<C>) {
  if (source.mode === 'demo') return console.log('Modo local: nada foi gravado. Registro que seria criado:\n' + JSON.stringify(entity, null, 2));
  await source.service!.save(collection, entity);
  console.log(`Gravado em ${collection}: ${entity.id}`);
}

/* ── Formatting ─────────────────────────────────────────────────────────── */

const hours = (minutes: number) => minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 ? String(minutes % 60).padStart(2, '0') : ''}`;
const bar = (value?: number) => value === undefined ? '··········' : '█'.repeat(Math.round(value * 10)).padEnd(10, '░');
const pct = (value?: number) => value === undefined ? '·' : `${percent(value)}%`;
const weekday = (date: Date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date).replace(/\./g, '');
const clock = (date: Date) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
const statusLabel: Record<WeeklyStatus, string> = { on_track: 'No ritmo', at_risk: 'Em risco', no_plan: 'Sem plano na semana', done: 'Semana cumprida' };
const reference = () => text('week') ? new Date(`${text('week')}T12:00`) : new Date();
function fail(message: string): never { console.error(message); process.exit(1); }
const out = (value: unknown, render: () => string) => console.log(flags.json ? JSON.stringify(value, null, 2) : render());
const header = (source: Source) => source.mode === 'demo' ? '> Fonte: modo local, com o estado inicial real (nada é gravado).\n' : '> Fonte: Supabase, como a pessoa autenticada.\n';

/* ── Commands ───────────────────────────────────────────────────────────── */

async function main() {
  if (command === 'help' || flags.help) return console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  const source = await openSource();
  const { snapshot } = source;

  if (command === 'report') {
    const report = timeReport(snapshot, reference());
    return out(report, () => [
      header(source), `## Relatório da semana · ${report.week.label}`, '',
      `- Foco registrado: **${hours(report.totals.focusMinutes)}**`,
      `- Ações concluídas: **${report.totals.completions}** (${report.outsideGoals} fora das metas)`,
      `- Hábitos checados: **${report.totals.habitChecks}**`,
      `- Compromissos na agenda: **${report.totals.events}** · ${hours(report.totals.eventMinutes)}`, '',
      '### Por área', '| Área | Foco | Agenda | Ações | Hábitos |', '|---|---|---|---|---|',
      ...(report.byArea.length ? report.byArea.map(item => `| ${item.area.name} | ${hours(item.focusMinutes)} | ${hours(item.eventMinutes)} | ${item.completions} | ${item.habitChecks} |`) : ['| Sem movimento registrado | | | | |']), '',
      '### Por dia', '| Dia | Foco | Agenda | Ações | Hábitos |', '|---|---|---|---|---|',
      ...report.byDay.map(day => `| ${weekday(new Date(`${day.date}T12:00`))} | ${hours(day.focusMinutes)} | ${hours(day.eventMinutes)} | ${day.completions} | ${day.habitChecks} |`), '',
      '### Áreas com planos e sem movimento', report.quietAreas.length ? report.quietAreas.map(area => `- ${area.name}`).join('\n') : '- Nenhuma. Todas as áreas com planos tiveram movimento.'
    ].join('\n'));
  }

  if (command === 'goals') {
    const review = weeklyGoals(snapshot, reference());
    return out(review, () => [
      header(source), `## Metas da semana · ${review.week.label}`, '', '| Meta | Progresso real | Semana | Status |', '|---|---|---|---|',
      ...review.goals.map(item => `| ${item.goal.title} | ${bar(item.progress.value)} ${pct(item.progress.value)} | ${[item.weekTasks.length ? `${item.weekDone}/${item.weekTasks.length} ações` : undefined, ...item.habits.map(habit => `${habit.habit.title} ${habit.done}/${habit.expected}`)].filter(Boolean).join(' · ') || 'nada planejado'} | ${statusLabel[item.status]} |`), '',
      ...review.goals.map(item => [`### ${item.goal.title} · \`${item.goal.id}\``, ...item.progress.parts.map(part => `- ${part.label}: ${part.detail}`), item.nextAction ? `- Próxima ação: ${item.nextAction.title} (${formatDue(item.nextAction)})` : '- Nenhuma ação aberta.', ''].join('\n'))
    ].join('\n'));
  }

  if (command === 'optimize') {
    const proposals = optimizerProposals(snapshot, new Date(), { days: number('days', 7), fromHour: number('from', 7), toHour: number('to', 22), maxProposals: number('max', 6) });
    return out(proposals, () => [
      header(source), '## Proposta de blocos na agenda', '', proposals.length ? '| # | Quando | Duração | Bloco | Meta | Motivo |\n|---|---|---|---|---|---|' : 'Nenhum bloco proposto: metas sem ações abertas, hábitos em dia ou agenda sem espaço livre.',
      ...proposals.map((item, index) => `| ${index + 1} | ${weekday(item.start)} ${clock(item.start)} | ${hours(item.minutes)} | ${item.title} | ${item.goal.title} | ${item.reason} |`), '',
      ...proposals.map((item, index) => `${index + 1}. npx tsx scripts/mive.ts add-event --title="${item.title}" --start=${item.start.toISOString().slice(0, 16)}Z --minutes=${item.minutes}${item.areaId ? ` --area=${item.areaId}` : ''}${item.projectId ? ` --project=${item.projectId}` : ''}`)
    ].join('\n'));
  }

  if (command === 'ids') {
    return out({ areas: snapshot.areas.map(({ id, name }) => ({ id, name })), goals: activeGoals(snapshot).map(({ id, title, areaId }) => ({ id, title, areaId })), projects: snapshot.projects.map(({ id, title, areaId }) => ({ id, title, areaId })), habits: snapshot.habits.map(({ id, title, goalId }) => ({ id, title, goalId })) }, () => [
      header(source), '### Áreas', ...snapshot.areas.map(area => `- \`${area.id}\` ${area.name}`), '', '### Metas ativas', ...activeGoals(snapshot).map(goal => `- \`${goal.id}\` ${goal.title} (${areaName(snapshot, goal.areaId)})`), '', '### Projetos', ...snapshot.projects.map(project => `- \`${project.id}\` ${project.title}`), '', '### Hábitos', ...snapshot.habits.map(habit => `- \`${habit.id}\` ${habit.title}`)
    ].join('\n'));
  }

  if (command === 'add-task') {
    const title = text('title')?.trim() || fail('Informe --title.');
    const goal = text('goal') ? snapshot.goals.find(item => item.id === text('goal')) ?? fail(`Meta não encontrada: ${text('goal')}. Use o comando ids.`) : undefined;
    const project = text('project') ? snapshot.projects.find(item => item.id === text('project')) ?? fail(`Projeto não encontrado: ${text('project')}.`) : undefined;
    const due = text('due');
    if (due && Number.isNaN(Date.parse(due.length === 10 ? `${due}T12:00` : due))) fail('Use --due=YYYY-MM-DD ou YYYY-MM-DDTHH:mm.');
    const task = createEntity<Task>(source.userId, { title, origin: 'planned', priority: text('priority') === 'high' ? 'high' : 'normal', areaId: text('area') ?? project?.areaId ?? goal?.areaId, goalId: goal?.id, projectId: project?.id, dueAt: due ? new Date(due.length === 10 ? `${due}T12:00` : due).toISOString() : undefined, dueHasTime: Boolean(due && due.length > 10), estimateMinutes: text('minutes') ? number('minutes', 50) : undefined });
    return write(source, 'tasks', task);
  }

  if (command === 'add-event') {
    const title = text('title')?.trim() || fail('Informe --title.');
    const start = text('start') ? new Date(text('start')!) : fail('Informe --start=YYYY-MM-DDTHH:mm.');
    if (Number.isNaN(start.getTime())) fail('Data inválida em --start.');
    const minutes = number('minutes', 60);
    const event = createEntity<CalendarEvent>(source.userId, { title, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + minutes * 60_000).toISOString(), areaId: text('area'), projectId: text('project'), status: 'planned', source: 'manual' });
    return write(source, 'events', event);
  }

  fail(`Comando desconhecido: ${command}. Use: report, goals, optimize, ids, add-task, add-event.`);
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)));
