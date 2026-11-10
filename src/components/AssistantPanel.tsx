import type { Route, RouteParams } from '../app/navigation';
import { checkupLabels } from '../domain/catalog';
import { toISODate } from '../domain/models';
import { detectStalledTasks, eventsOn, formatTime, getHealthAlerts, getMandsSAIndex, isHabitDone, isTaskCompleted, percent, todayFocus } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { useFocusTimer } from './FocusTimer';
import { Dialog, Orb } from './ui';

/**
 * Mive morning ritual. It reads the snapshot and writes a briefing; it does not invent advice.
 * Voice conversation is a future integration, and the panel says so plainly.
 */
export function AssistantPanel({ name, onClose, onNavigate }: { name: string; onClose: () => void; onNavigate: (route: Route, params?: RouteParams) => void }) {
  const { snapshot } = useLife();
  const timer = useFocusTimer();
  const now = new Date();
  const focus = todayFocus(snapshot, now);
  const open = focus.pinned.filter(task => !isTaskCompleted(task.id, snapshot.executions));
  const agenda = eventsOn(snapshot.events, now);
  const habits = snapshot.habits.filter(habit => habit.active);
  const done = habits.filter(habit => isHabitDone(habit.id, toISODate(now), snapshot.habitCheckIns)).length;
  const stalled = detectStalledTasks(snapshot);
  const index = getMandsSAIndex(snapshot, now);
  const go = (route: Route, params?: RouteParams) => { onClose(); onNavigate(route, params); };
  const lines = [
    open.length ? `Seu foco de hoje: **${open.map(task => task.title).join(' · ')}**.` : focus.pinned.length ? 'As 3 inegociáveis de hoje estão feitas. Ciclo fechado.' : 'Ainda não há ações no Foco de Hoje. Escolha três, físicas e com tempo.',
    agenda.length ? `Na agenda: ${agenda.map(event => `${formatTime(event.startsAt)} ${event.title}`).join(', ')}.` : 'Sua agenda de hoje está aberta. Bloqueie o tempo das ações.',
    habits.length ? `Hábitos: ${done} de ${habits.length} checados hoje.` : undefined,
    stalled.length ? `${stalled.length === 1 ? 'Uma tarefa está parada' : `${stalled.length} tarefas estão paradas`}: ${stalled[0].task.title}. Faça agora, quebre ou solte.` : undefined,
    ...getHealthAlerts(snapshot, now).map(alert => `Saúde: ${checkupLabels[alert.kind].lastPhrase} há mais de 6 meses. Hora de agendar.`),
    index.overall !== undefined ? `Índice Mands S.A. dos últimos 30 dias: ${percent(index.overall)}%.` : undefined
  ].filter((line): line is string => Boolean(line));
  return <Dialog eyebrow="MIVE · RITUAL MATINAL" title={`Oi, ${name}. Aqui está o seu dia.`} onClose={onClose} wide>
    <div className="assistant-panel"><Orb size="lg" speaking /><ul className="briefing">{lines.map((line, position) => <li key={position}>{line.split('**').map((part, partIndex) => partIndex % 2 ? <b key={partIndex}>{part}</b> : <span key={partIndex}>{part}</span>)}</li>)}</ul></div>
    <div className="dialog-actions">
      {open[0] && <Button variant="primary" onClick={() => { timer.start({ kind: 'task', id: open[0].id, label: open[0].title }, open[0].estimateMinutes ?? 50); onClose(); }}>Iniciar sessão no foco →</Button>}
      <Button onClick={() => go('agenda', { view: 'semana' })}>Planejar semana</Button>
      <Button onClick={() => go('evolucao')}>Ver evolução</Button>
    </div>
    <p className="fine-print">A conversa por voz chega em um próximo lote. Por enquanto, a Mive lê os seus registros e organiza o dia com você.</p>
  </Dialog>;
}
