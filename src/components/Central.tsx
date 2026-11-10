import type { Route, RouteParams } from '../app/navigation';
import { cycleLabel, toISODate, type Task } from '../domain/models';
import { activeGoals, areaName, eventsOn, focusOfDay, formatDue, formatTime, goalProgress, habitStreak, isDueByToday, isDueThisWeek, isHabitDone, lifeBalance, lifeSignals, openTasks, percent, projectProgress, formatActivity } from '../domain/selectors';
import { eventStatusLabel } from '../domain/catalog';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { TaskLine } from './ExecutionModule';
import { AreaDot, EmptyState, LinkButton, Orb, ProgressBar, ProgressRing, SectionHeading, Tag } from './ui';

type Navigate = (route: Route, params?: RouteParams) => void;

export function Central({ name, onNavigate, onStartFocus, onOpenAssistant }: { name: string; onNavigate: Navigate; onStartFocus: (task: Task) => void; onOpenAssistant: () => void }) {
  const { snapshot, toggleTaskCompletion, toggleHabit } = useLife();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const focus = focusOfDay(snapshot, now);
  const pending = openTasks(snapshot);
  const today = pending.filter(task => isDueByToday(task, now));
  const week = pending.filter(task => isDueThisWeek(task, now));
  const balance = lifeBalance(snapshot, now);
  const goals = activeGoals(snapshot, now);
  const agenda = eventsOn(snapshot.events, now);
  const signals = lifeSignals(snapshot, now).slice(0, 4);
  const todayISO = toISODate(now);
  const habits = snapshot.habits.filter(habit => habit.active);
  const habitsDone = habits.filter(habit => isHabitDone(habit.id, todayISO, snapshot.habitCheckIns)).length;
  const projects = snapshot.projects.filter(project => project.status === 'active');

  return <>
    <header className="greeting">
      <span className="eyebrow">CENTRAL <i>·</i> {date}</span>
      <h1>{greeting}, {name}.</h1>
      <p className="greeting-serif">Vamos fazer acontecer?</p>
    </header>

    <section className="central-hero">
      <Card tone="noble" className="focus-card">
        <div className="focus-glow" aria-hidden="true" />
        <span className="label">FOCO DO DIA</span>
        {focus ? <>
          <h2>{focus.task.title}</h2>
          <p className="focus-reason">{focus.reason}</p>
          <div className="focus-meta">{focus.task.estimateMinutes && <span>◷ {focus.task.estimateMinutes} min</span>}<span>{formatDue(focus.task)}</span><span>{areaName(snapshot, focus.task.areaId)}</span></div>
          <div className="focus-actions"><Button variant="light" onClick={() => onStartFocus(focus.task)}>Iniciar agora ▶</Button><Button variant="ghost" onClick={() => toggleTaskCompletion(focus.task.id)}>Marcar como feito</Button></div>
        </> : <>
          <h2>Seu dia está livre.</h2>
          <p className="focus-reason">Nenhuma ação pendente. Um bom momento para planejar a semana com calma.</p>
          <div className="focus-actions"><Button variant="light" onClick={() => onNavigate('execution', { view: 'week' })}>Planejar semana →</Button></div>
        </>}
      </Card>

      <div className="shortcut-stack">
        <button type="button" className="shortcut" onClick={() => onNavigate('execution', { view: 'today' })}><span className="shortcut-icon pink">☀</span><span><b>Meu Dia</b><small>{today.length ? `${today.length} ${today.length === 1 ? 'ação' : 'ações'} para hoje` : 'Nada pendente hoje'}</small></span><i>→</i></button>
        <button type="button" className="shortcut" onClick={() => onNavigate('execution', { view: 'week' })}><span className="shortcut-icon violet">▦</span><span><b>Planejar Semana</b><small>{week.length ? `${week.length} ${week.length === 1 ? 'ação' : 'ações'} nos próximos 7 dias` : 'Semana em branco'}</small></span><i>→</i></button>
        <button type="button" className="shortcut" onClick={onOpenAssistant}><span className="shortcut-icon orange">◍</span><span><b>Conversar com a MIVE</b><small>Seu resumo do dia</small></span><i>→</i></button>
      </div>

      <Card className="assistant-card">
        <Orb size="md" />
        <div><span className="label">ASSISTENTE MVE</span><h3>Oi, eu sou a MIVE.</h3><p>Leio seus registros e organizo o que importa hoje.</p></div>
        <Button variant="primary" onClick={onOpenAssistant}>Conversar</Button>
      </Card>
    </section>

    <section className="central-grid two">
      <Card className="balance-card">
        <div className="card-head"><div><span className="label">EQUILÍBRIO DA VIDA</span><h2>Movimento real</h2></div><LinkButton onClick={() => onNavigate('areas')}>Ver áreas →</LinkButton></div>
        <div className="balance-body">
          <div className="balance-ring"><ProgressRing value={balance.overall} label="geral" /><p>{balance.measuredCount ? `${balance.measuredCount} de ${balance.areas.length} áreas com registros nos últimos 14 dias` : 'Registre ações e hábitos para ver o seu movimento.'}</p>
            {balance.needsAssessment ? <Button onClick={() => onNavigate('areas')}>Fazer MAAS de {cycleLabel(balance.cycle)}</Button> : <Tag tone="flow">MAAS · {balance.assessment?.period}</Tag>}
          </div>
          <ul className="balance-list">{balance.areas.map(item => <li key={item.area.id}><button type="button" onClick={() => onNavigate('areas', { areaId: item.area.id })}>
            <AreaDot color={item.area.color} /><span className="balance-name">{item.area.name}</span>
            <span className="balance-score" title="Nota MAAS">{item.score ?? '·'}</span>
            <span className="balance-bar"><ProgressBar value={item.movement.value} color={item.area.color} label={`Movimento em ${item.area.name}`} /></span>
            <Tag tone={item.tone}>{item.label}</Tag>
          </button></li>)}</ul>
        </div>
      </Card>

      <Card className="goals-card">
        <div className="card-head"><div><span className="label">METAS ATIVAS · {cycleLabel(balance.cycle).toUpperCase()}</span><h2>O que você está construindo</h2></div><LinkButton onClick={() => onNavigate('goals')}>Ver metas →</LinkButton></div>
        <div className="goal-tiles">{goals.length ? goals.map(goal => { const progress = goalProgress(snapshot, goal, now); return <button type="button" key={goal.id} className="goal-tile" onClick={() => onNavigate('goals')}>
          <small><AreaDot color={snapshot.areas.find(area => area.id === goal.areaId)?.color} />{areaName(snapshot, goal.areaId)}</small>
          <strong>{goal.title}</strong>
          <div className="goal-tile-progress"><ProgressBar value={progress.value} label={goal.title} /><b>{progress.value === undefined ? '·' : `${percent(progress.value)}%`}</b></div>
          <span className="goal-parts">{progress.parts.length ? progress.parts.map(part => part.label).join(' · ') : 'Ainda sem registros'}</span>
        </button>; }) : <EmptyState>Nenhuma meta ativa neste ciclo.</EmptyState>}</div>
      </Card>
    </section>

    <section className="central-grid three">
      <Card className="agenda-card">
        <div className="card-head"><div><span className="label">AGENDA DE HOJE</span><h2>{agenda.length ? `${agenda.length} ${agenda.length === 1 ? 'compromisso' : 'compromissos'}` : 'Dia aberto'}</h2></div><LinkButton onClick={() => onNavigate('agenda')}>Agenda →</LinkButton></div>
        {agenda.length ? <ol className="timeline">{agenda.map(event => <li key={event.id} className={Date.parse(event.endsAt) < now.getTime() ? 'is-past' : ''}><b>{formatTime(event.startsAt)}</b><span className="timeline-dot" style={{ background: snapshot.areas.find(area => area.id === event.areaId)?.color }} /><div><strong>{event.title}</strong><small>{areaName(snapshot, event.areaId)} · {eventStatusLabel[event.status]}</small></div></li>)}</ol> : <EmptyState icon="☼">Nenhum compromisso hoje. Espaço para o que importa.</EmptyState>}
      </Card>

      <Card className="habits-today">
        <div className="card-head"><div><span className="label">HÁBITOS DE HOJE</span><h2>{habits.length ? `${habitsDone} de ${habits.length}` : 'Sem hábitos'}</h2></div><LinkButton onClick={() => onNavigate('habits')}>Hábitos →</LinkButton></div>
        <ul className="habit-checks">{habits.map(habit => { const done = isHabitDone(habit.id, todayISO, snapshot.habitCheckIns); const streak = habitStreak(habit, snapshot.habitCheckIns, now); return <li key={habit.id}><button type="button" className={done ? 'is-done' : ''} aria-pressed={done} onClick={() => toggleHabit(habit.id)}><span className="check">{done ? '✓' : ''}</span><span>{habit.title}</span>{streak > 1 && <small>{streak} dias</small>}</button></li>; })}</ul>
      </Card>

      <Card className="signals-card">
        <div className="card-head"><div><span className="label">SINAIS DA SUA VIDA</span><h2>O que merece atenção</h2></div></div>
        {signals.length ? <ul className="signal-list">{signals.map(signal => <li key={signal.id}><button type="button" className={`signal signal-${signal.tone}`} onClick={() => onNavigate(signal.target, signal.areaId ? { areaId: signal.areaId } : undefined)}><span className="signal-icon">{signal.tone === 'positive' ? '✦' : '!'}</span><span><small>{signal.area}</small><strong>{signal.title}</strong><em>{signal.detail}</em></span></button></li>)}</ul> : <EmptyState>Tudo em ordem por aqui.</EmptyState>}
      </Card>
    </section>

    <section className="central-grid two">
      <div>
        <SectionHeading label="O QUE PEDE MOVIMENTO" title="Próximas ações" action={<LinkButton onClick={() => onNavigate('execution', { view: 'all' })}>Ver execução →</LinkButton>} />
        <Card className="task-list">{pending.length ? pending.slice(0, 5).map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => toggleTaskCompletion(task.id)} onOpen={() => onNavigate('execution', { view: 'all' })} />) : <EmptyState>Seu to do está leve por aqui.</EmptyState>}</Card>
      </div>
      <div>
        <SectionHeading label="PROJETOS EM MOVIMENTO" title="Construções" action={<LinkButton onClick={() => onNavigate('projects')}>Ver projetos →</LinkButton>} />
        <div className="project-list">{projects.length ? projects.map(project => { const info = projectProgress(snapshot, project); return <Card key={project.id} className="project-card" role="button" tabIndex={0} onClick={() => onNavigate('projects')} onKeyDown={event => event.key === 'Enter' && onNavigate('projects')}>
          <small>{areaName(snapshot, project.areaId)}{project.focus ? ' · FOCO' : ''}</small><h3>{project.title}</h3>
          <div className="project-meta"><span>{formatActivity(info.lastActivityAt)}</span><b>{info.progress === undefined ? '·' : `${info.progress}%`}</b></div>
          <ProgressBar value={info.progress === undefined ? undefined : info.progress / 100} label={project.title} />
          <p>Próxima ação: <strong>{info.nextAction?.title ?? 'Defina o próximo passo'}</strong></p>
        </Card>; }) : <Card><EmptyState>Quando um projeto nascer, ele aparece aqui.</EmptyState></Card>}</div>
      </div>
    </section>
  </>;
}
