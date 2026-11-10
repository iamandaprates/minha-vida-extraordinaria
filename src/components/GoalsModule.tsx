import { useState, type CSSProperties } from 'react';
import { formatBRL } from '../domain/catalog';
import { cycleLabel, cycleOf } from '../domain/models';
import { activeGoals, areaOf, goalProgress, habitConsistency, isTaskCompleted, percent, tasksOfGoal, vaultProgress } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { TaskDialog } from './ExecutionModule';
import { AreaSelect, Dialog, EmptyState, Field, PageIntro, ProgressBar, ProgressRing, SectionHeading, Tag } from './ui';

/** Goals of the cycle with the real composition of their progress. */
export function GoalsModule() {
  const { snapshot } = useLife();
  const [goalOpen, setGoalOpen] = useState(false);
  const [taskGoal, setTaskGoal] = useState<string | null>(null);
  const now = new Date();
  const active = activeGoals(snapshot, now);
  const future = snapshot.goals.filter(goal => goal.horizon === 'future');
  const other = snapshot.goals.filter(goal => goal.horizon === 'current' && !active.includes(goal));

  return <>
    <PageIntro eyebrow="ORGANIZAR" title="Metas" text={`As grandes metas de ${cycleLabel(cycleOf(now))}. O progresso de cada uma soma ações concluídas, constância dos hábitos, peso registrado e cofres conectados.`} action={<Button variant="primary" onClick={() => setGoalOpen(true)}>Nova meta ＋</Button>} />
    <section className="goal-grid">{active.length ? active.map(goal => {
      const progress = goalProgress(snapshot, goal, now);
      const area = areaOf(snapshot, goal.areaId);
      const tasks = tasksOfGoal(snapshot, goal.id);
      const open = tasks.filter(task => !isTaskCompleted(task.id, snapshot.executions));
      const habits = snapshot.habits.filter(habit => habit.goalId === goal.id && habit.active);
      const projects = snapshot.projects.filter(project => project.goalId === goal.id);
      const vaults = snapshot.vaults.filter(vault => vault.goalId === goal.id);
      return <Card key={goal.id} className="goal-card" style={{ '--area-color': area?.color } as CSSProperties}>
        <div className="goal-card-head"><ProgressRing value={progress.value} size={96} stroke={9} /><div><small>{area?.name}</small><h2>{goal.title}</h2>{goal.why && <p>{goal.why}</p>}</div></div>
        {progress.parts.length ? <ul className="goal-breakdown">{progress.parts.map(part => <li key={part.key}><span>{part.label}</span><ProgressBar value={part.value} label={part.label} /><b>{percent(part.value)}%</b><small>{part.detail}</small></li>)}</ul> : <p className="fine-print">Ainda sem registros. Conecte ações, hábitos ou um cofre e o progresso aparece sozinho.</p>}
        <div className="goal-links-row">
          {projects.map(project => <Tag key={project.id} tone="building">□ {project.title}</Tag>)}
          {habits.map(habit => { const consistency = habitConsistency(habit, snapshot.habitCheckIns, now); return <Tag key={habit.id} tone="flow">◒ {habit.title}{consistency ? ` · ${percent(consistency.ratio)}%` : ''}</Tag>; })}
          {vaults.map(vault => { const info = vaultProgress(vault, snapshot); return <Tag key={vault.id} tone="vault">🔒 {vault.name} · {formatBRL(info.balance)}</Tag>; })}
        </div>
        <div className="goal-foot"><span>{open.length ? `Próxima ação: ${open[0].title}` : tasks.length ? 'Todas as ações concluídas ✦' : 'Nenhuma ação planejada'}</span><Button variant="ghost" onClick={() => setTaskGoal(goal.id)}>Nova ação ＋</Button></div>
      </Card>;
    }) : <Card><EmptyState>Nenhuma meta ativa neste ciclo.</EmptyState></Card>}</section>

    {other.length > 0 && <><SectionHeading label="OUTROS CICLOS" title="Metas pausadas ou de outros semestres" /><Card className="record-list">{other.map(goal => <div key={goal.id} className="record-line"><div><b>{goal.title}</b><small>{goal.cycle ? cycleLabel(goal.cycle) : 'Sem ciclo'} · {goal.status === 'achieved' ? 'Alcançada' : goal.status === 'paused' ? 'Pausada' : 'Ativa'}</small></div></div>)}</Card></>}
    <SectionHeading label="HORIZONTE" title="Ideias para depois" />
    <Card className="record-list">{future.length ? future.map(goal => <div key={goal.id} className="record-line"><div><b>{goal.title}</b><small>{areaOf(snapshot, goal.areaId)?.name}</small></div><span>◇</span></div>) : <EmptyState icon="◇">Guarde aqui o que importa sem precisar executar agora.</EmptyState>}</Card>

    {goalOpen && <GoalDialog onClose={() => setGoalOpen(false)} />}
    {taskGoal && <TaskDialog onClose={() => setTaskGoal(null)} defaults={{ goalId: taskGoal, areaId: snapshot.goals.find(goal => goal.id === taskGoal)?.areaId }} />}
  </>;
}

function GoalDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, addGoal } = useLife();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState(snapshot.areas[0]?.id ?? '');
  const [why, setWhy] = useState('');
  const [future, setFuture] = useState(false);
  return <Dialog eyebrow="NOVA META" title="O que você quer alcançar?" onClose={onClose} onSubmit={() => { if (title.trim() && areaId) { addGoal({ title, areaId, why: why.trim() || undefined, horizon: future ? 'future' : 'current' }); onClose(); } }}>
    <Field label="Meta"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Correr 5 km sem parar" /></Field>
    <Field label="Área"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} allowEmpty={false} /></Field>
    <Field label="Por que importa"><input value={why} onChange={event => setWhy(event.target.value)} placeholder="Opcional" /></Field>
    <label className="toggle"><input type="checkbox" checked={future} onChange={event => setFuture(event.target.checked)} /><span>Guardar como ideia futura</span></label>
  </Dialog>;
}
