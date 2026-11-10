import { AlertTriangle, ArrowRight, Check, Clock, Crown, GraduationCap, HeartPulse, Pin, Plus, RotateCcw, ShoppingBag, Sparkles, Wallet, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Route, RouteParams } from '../app/navigation';
import { checkupLabels, eventStatusLabel } from '../domain/catalog';
import { toISODate, type FocusRole, type Goal, type Task } from '../domain/models';
import { activeGoals, areaName, detectStalledTasks, eventsOn, formatTime, getHealthAlerts, goalProgress, habitStreak, isHabitDone, isTaskCompleted, lifeSignals, missingCheckups, percent, todayFocus } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TimerCard } from '../components/FocusTimer';
import { Icon, iconByName } from '../components/icons';
import { FocusPinDialog, TaskDialog } from '../components/tasks';
import { UnblockDialog } from '../components/UnblockDialog';
import { EmptyState, LinkButton, Orb, ProgressBar } from '../components/ui';

type Navigate = (route: Route, params?: RouteParams) => void;

function useClock() { const [now, setNow] = useState(new Date()); useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []); return now; }

export function HomePage({ name, onNavigate, onOpenAssistant }: { name: string; onNavigate: Navigate; onOpenAssistant: () => void }) {
  const { snapshot, toggleTaskCompletion, toggleHabit } = useLife();
  const now = useClock();
  const [pin, setPin] = useState<{ task: Task; role: FocusRole } | null>(null);
  const [newTask, setNewTask] = useState<FocusRole | null>(null);
  const [unblock, setUnblock] = useState<Task | null>(null);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const focus = todayFocus(snapshot, now);
  const goals = activeGoals(snapshot, now);
  const agenda = eventsOn(snapshot.events, now);
  const alerts = getHealthAlerts(snapshot, now);
  const missing = missingCheckups(snapshot);
  const stalled = detectStalledTasks(snapshot);
  const signals = lifeSignals(snapshot, now).filter(signal => !signal.id.startsWith('health-') && !signal.id.startsWith('stalled-')).slice(0, 3);
  const habits = snapshot.habits.filter(habit => habit.active);
  const todayISO = toISODate(now);
  const habitsDone = habits.filter(habit => isHabitDone(habit.id, todayISO, snapshot.habitCheckIns)).length;
  const priority = (pillar: Goal['pillar']) => goals.find(goal => goal.pillar === pillar);
  const shortcuts = [
    { goal: priority('studies'), label: 'PRF · Aprovação', icon: GraduationCap, tone: 'violet', go: () => onNavigate('estudos') },
    { goal: priority('business'), label: 'CAVU · Vendas', icon: ShoppingBag, tone: 'pink', go: () => onNavigate('metas') },
    { goal: priority('finance'), label: 'Liberdade · R$ 50k/mês', icon: Wallet, tone: 'orange', go: () => onNavigate('areas', { tab: 'financas' }) }
  ];

  return <>
    <header className="hero">
      <div>
        <span className="eyebrow">{new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now)} <i>·</i> {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(now)} <i>·</i> {formatTime(now.toISOString())}</span>
        <h1>{greeting}, {name}.</h1>
        <p className="hero-serif">Planejamento, execução e evolução.</p>
      </div>
      <Card className="assistant-card">
        <Orb size="md" />
        <div><span className="label">ASSISTENTE MIVE</span><h3><i className="status-dot" /> Pronta para apoiar</h3><p>Leio seus registros e organizo o que importa hoje.</p></div>
        <Button variant="primary" onClick={onOpenAssistant}>Falar com a Mive</Button>
      </Card>
    </header>

    <section className="priority-row" aria-label="Prioridades do ciclo">{shortcuts.map(item => { const progress = item.goal ? goalProgress(snapshot, item.goal, now) : undefined; return <button key={item.label} type="button" className={`priority-card tone-${item.tone}`} onClick={item.go}>
      <span className="priority-icon"><Icon as={item.icon} size={20} /></span>
      <span className="priority-copy"><small>PRIORIDADE DO CICLO</small><b>{item.label}</b><em>{progress?.value === undefined ? 'Sem registros ainda' : `${percent(progress.value)}% de progresso real`}</em></span>
      <Icon as={ArrowRight} size={18} />
    </button>; })}</section>

    {(alerts.length > 0 || stalled.length > 0) && <section className="alert-row">
      {alerts.map(alert => <button key={alert.kind} type="button" className="alert-card" onClick={() => onNavigate('areas', { tab: 'saude' })}><Icon as={HeartPulse} size={18} /><span><b>Atenção na Saúde</b><small>{checkupLabels[alert.kind].lastPhrase.charAt(0).toUpperCase() + checkupLabels[alert.kind].lastPhrase.slice(1)} há mais de 6 meses. Hora de agendar.</small></span></button>)}
      {stalled.length > 0 && <button type="button" className="alert-card" onClick={() => onNavigate('metas')}><Icon as={AlertTriangle} size={18} /><span><b>{stalled.length === 1 ? 'Tarefa parada' : `${stalled.length} tarefas paradas`}</b><small>{stalled[0].task.title} · adiada {stalled[0].postponements} vezes</small></span></button>}
    </section>}

    <section className="home-grid">
      <Card tone="noble" className="focus-card">
        <div className="focus-glow" aria-hidden="true" />
        <div className="card-head"><div><span className="label">ENTREGAS DE HOJE · REGRA DAS 3</span><h2>{focus.deliveries.length ? `${focus.done} de ${focus.deliveries.length} entregues` : 'Escolha suas entregas'}</h2></div>{focus.minutesLeft > 0 && <span className="focus-total"><Icon as={Clock} size={15} /> {focus.minutesLeft} min</span>}</div>
        {focus.returned.length > 0 && <p className="focus-returned"><Icon as={RotateCcw} size={14} /> {focus.returned.length === 1 ? 'Uma entrega de ontem voltou' : `${focus.returned.length} entregas de ontem voltaram`} para o projeto. Sem culpa: escolha de novo se ainda fizer sentido.</p>}
        <ul className="focus-list">
          {focus.magna ? <DeliveryItem task={focus.magna} role="magna" /> : <EmptySlot role="magna" number={1} />}
          {focus.secondary.map(task => <DeliveryItem key={task.id} task={task} role="secondary" />)}
          {Array.from({ length: focus.openSlots.secondary }, (_, index) => <EmptySlot key={index} role="secondary" number={focus.secondary.length + index + 2} />)}
        </ul>
        {(focus.openSlots.magna + focus.openSlots.secondary > 0) && <div className="focus-suggestions"><span className="focus-hint">Dos projetos ativos:</span>{focus.suggestions.slice(0, 3).map(task => <button key={task.id} type="button" className="suggestion" onClick={() => setPin({ task, role: focus.openSlots.magna ? 'magna' : 'secondary' })}><Icon as={Pin} size={13} /> {task.title}</button>)}<button type="button" className="suggestion is-new" onClick={() => setNewTask(focus.openSlots.magna ? 'magna' : 'secondary')}><Icon as={Plus} size={13} /> Nova entrega física</button></div>}
        <div className="focus-cta"><Button variant="light" onClick={() => { const next = focus.deliveries.find(task => !isTaskCompleted(task.id, snapshot.executions)); if (next) setUnblock(next); else setNewTask(focus.openSlots.magna ? 'magna' : 'secondary'); }}><Icon as={Zap} size={16} /> Preciso Começar</Button><span>Travou? Escolha o motivo e a Mive dá o primeiro passo com você.</span></div>
      </Card>
      <TimerCard />
    </section>

    <section className="home-grid three">
      <Card className="agenda-card">
        <div className="card-head"><div><span className="label">AGENDA DE HOJE</span><h2>{agenda.length ? `${agenda.length} ${agenda.length === 1 ? 'compromisso' : 'compromissos'}` : 'Dia aberto'}</h2></div><LinkButton onClick={() => onNavigate('agenda', { view: 'dia' })}>Agenda →</LinkButton></div>
        {agenda.length ? <ol className="timeline">{agenda.map(event => <li key={event.id} className={Date.parse(event.endsAt) < now.getTime() ? 'is-past' : ''}><b>{formatTime(event.startsAt)}</b><span className="timeline-dot" style={{ background: snapshot.areas.find(area => area.id === event.areaId)?.color }} /><div><strong>{event.title}</strong><small>{areaName(snapshot, event.areaId)} · {eventStatusLabel[event.status]}</small></div></li>)}</ol> : <EmptyState>Nenhum compromisso hoje. Bloqueie o tempo das suas 3 ações.</EmptyState>}
      </Card>
      <Card className="habits-today">
        <div className="card-head"><div><span className="label">HÁBITOS DE HOJE</span><h2>{habits.length ? `${habitsDone} de ${habits.length}` : 'Sem hábitos'}</h2></div><LinkButton onClick={() => onNavigate('metas')}>Metas →</LinkButton></div>
        <ul className="habit-checks">{habits.map(habit => { const done = isHabitDone(habit.id, todayISO, snapshot.habitCheckIns); const streak = habitStreak(habit, snapshot.habitCheckIns, now); return <li key={habit.id}><button type="button" className={done ? 'is-done' : ''} aria-pressed={done} onClick={() => toggleHabit(habit.id)}><span className="check">{done && <Icon as={Check} size={14} strokeWidth={2.2} />}</span><Icon as={iconByName(habit.icon)} size={16} /><span>{habit.title}</span>{streak > 1 && <small>{streak} dias</small>}</button></li>; })}</ul>
      </Card>
      <Card className="signals-card">
        <div className="card-head"><div><span className="label">BIO-MANUTENÇÃO & SINAIS</span><h2>{alerts.length ? 'Atenção preventiva' : 'O que merece atenção'}</h2></div></div>
        <ul className="signal-list">
          {missing.length > 0 && <li><button type="button" className="signal signal-attention" onClick={() => onNavigate('areas', { tab: 'saude' })}><span className="signal-icon"><Icon as={HeartPulse} size={16} /></span><span><small>Saúde</small><strong>Registre seus exames preventivos</strong><em>{missing.map(kind => checkupLabels[kind].title).join(', ')} sem data registrada.</em></span></button></li>}
          {signals.map(signal => <li key={signal.id}><button type="button" className={`signal signal-${signal.tone}`} onClick={() => onNavigate(signal.target, signal.areaId ? { areaId: signal.areaId } : undefined)}><span className="signal-icon"><Icon as={signal.tone === 'positive' ? Sparkles : AlertTriangle} size={16} /></span><span><small>{signal.area}</small><strong>{signal.title}</strong><em>{signal.detail}</em></span></button></li>)}
          {!missing.length && !signals.length && <li><EmptyState>Tudo em ordem por aqui.</EmptyState></li>}
        </ul>
      </Card>
    </section>

    <section className="goal-strip" aria-label="Metas magnas">{goals.map(goal => { const progress = goalProgress(snapshot, goal, now); return <button key={goal.id} type="button" className="goal-chip" onClick={() => onNavigate('metas')}><span><b>{goal.title}</b><small>{progress.parts.map(part => part.label).join(' · ') || 'Sem registros ainda'}</small></span><ProgressBar value={progress.value} color={goal.color} label={goal.title} /><em>{progress.value === undefined ? '·' : `${percent(progress.value)}%`}</em></button>; })}</section>

    {pin && <FocusPinDialog task={pin.task} role={pin.role} onClose={() => setPin(null)} />}
    {newTask && <TaskDialog onClose={() => setNewTask(null)} defaults={{ focus: newTask }} />}
    {unblock && <UnblockDialog task={unblock} onClose={() => setUnblock(null)} />}
  </>;
}

function DeliveryItem({ task, role }: { task: Task; role: FocusRole }) {
  const { snapshot, toggleTaskCompletion } = useLife();
  const done = isTaskCompleted(task.id, snapshot.executions);
  return <li className={`${done ? 'is-done' : ''} ${role === 'magna' ? 'is-magna' : ''}`}>
    <button type="button" className="focus-check" aria-pressed={done} aria-label={`${done ? 'Reabrir' : 'Concluir'} ${task.title}`} onClick={() => toggleTaskCompletion(task.id)}>{done && <Icon as={Check} size={16} strokeWidth={2.4} />}</button>
    <span><small>{role === 'magna' ? <><Icon as={Crown} size={12} /> PRIORIDADE MAGNA</> : 'SECUNDÁRIA'}</small><b>{task.title}</b><em>{areaName(snapshot, task.areaId)}{task.estimateMinutes ? ` · ${task.estimateMinutes} min` : ''}</em></span>
  </li>;
}
function EmptySlot({ role, number }: { role: FocusRole; number: number }) {
  return <li className={`is-slot ${role === 'magna' ? 'is-magna' : ''}`}><span className="focus-slot-number">{number}</span><span><small>{role === 'magna' ? 'PRIORIDADE MAGNA' : 'SECUNDÁRIA'}</small><b>{role === 'magna' ? 'A entrega que faz o dia valer' : 'Espaço livre'}</b><em>Uma ação física, com tempo estimado.</em></span></li>;
}
