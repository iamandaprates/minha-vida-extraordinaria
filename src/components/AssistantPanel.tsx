import type { Route, RouteParams } from '../app/navigation';
import { checkupLabels } from '../domain/catalog';
import { toISODate, type Task } from '../domain/models';
import { eventsOn, focusOfDay, formatTime, healthAlerts, isHabitDone, lifeBalance, openTasks, isOverdue, percent } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Dialog, Orb } from './ui';

/**
 * MIVE morning ritual. It reads the snapshot and writes a briefing; it does not invent advice.
 * Voice conversation is a future integration, and the panel says so plainly.
 */
export function AssistantPanel({ name, onClose, onNavigate, onStartFocus }: { name: string; onClose: () => void; onNavigate: (route: Route, params?: RouteParams) => void; onStartFocus: (task: Task) => void }) {
  const { snapshot } = useLife();
  const now = new Date();
  const focus = focusOfDay(snapshot, now);
  const agenda = eventsOn(snapshot.events, now);
  const habits = snapshot.habits.filter(habit => habit.active);
  const done = habits.filter(habit => isHabitDone(habit.id, toISODate(now), snapshot.habitCheckIns)).length;
  const late = openTasks(snapshot).filter(task => isOverdue(task, now));
  const alerts = healthAlerts(snapshot, now);
  const balance = lifeBalance(snapshot, now);
  const go = (route: Route, params?: RouteParams) => { onClose(); onNavigate(route, params); };

  const lines = [
    focus ? `Seu foco de hoje é **${focus.task.title}**. ${focus.reason}.` : 'Você não tem ações pendentes. Que tal desenhar a semana?',
    agenda.length ? `Na agenda: ${agenda.map(event => `${formatTime(event.startsAt)} ${event.title}`).join(', ')}.` : 'Sua agenda de hoje está aberta.',
    habits.length ? `Hábitos: ${done} de ${habits.length} já checados hoje.` : undefined,
    late.length ? `${late.length === 1 ? 'Uma ação passou' : `${late.length} ações passaram`} do prazo. Vale reagendar sem culpa.` : undefined,
    ...alerts.map(alert => `Saúde: ${checkupLabels[alert.kind].lastPhrase} há mais de 6 meses. Hora de agendar.`),
    balance.overall !== undefined ? `Seu movimento real nas áreas está em ${percent(balance.overall)}% nos últimos 14 dias.` : undefined
  ].filter((line): line is string => Boolean(line));

  return <Dialog eyebrow="MIVE · RITUAL MATINAL" title={`Oi, ${name}. Aqui está o seu dia.`} onClose={onClose} wide>
    <div className="assistant-panel">
      <Orb size="lg" speaking />
      <ul className="briefing">{lines.map((line, index) => <li key={index}>{renderBold(line)}</li>)}</ul>
    </div>
    <div className="dialog-actions">
      {focus && <Button variant="primary" onClick={() => { onClose(); onStartFocus(focus.task); }}>Iniciar foco ▶</Button>}
      <Button onClick={() => go('execution', { view: 'week' })}>Planejar semana</Button>
      <Button onClick={() => go('areas', { areaId: 'health' })}>Registrar saúde</Button>
    </div>
    <p className="fine-print">A conversa por voz chega em um próximo lote. Por enquanto, a MIVE lê os seus registros e organiza o dia com você.</p>
  </Dialog>;
}

function renderBold(text: string) {
  return text.split('**').map((part, index) => index % 2 ? <b key={index}>{part}</b> : <span key={index}>{part}</span>);
}
