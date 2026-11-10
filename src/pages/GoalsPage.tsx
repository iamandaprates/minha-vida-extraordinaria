import { AlertTriangle, Flag, FolderKanban, Lock, Plus, Repeat } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { formatBRL } from '../domain/catalog';
import { cycleLabel, cycleOf } from '../domain/models';
import { activeGoals, areaName, areaOf, detectStalledTasks, formatActivity, goalProgress, habitConsistency, isTaskCompleted, openTasks, percent, projectProgress, tasksOfGoal, vaultProgress } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { HabitsBoard } from '../components/HabitsModule';
import { Icon } from '../components/icons';
import { TaskDialog, TaskLine } from '../components/tasks';
import { AreaSelect, Dialog, EmptyState, Field, PageIntro, ProgressBar, ProgressRing, SectionHeading, Tabs, Tag } from '../components/ui';

type TaskFilter = 'open' | 'stalled' | 'done';

export function GoalsPage() {
  const { snapshot } = useLife();
  const [taskFor, setTaskFor] = useState<{ goalId?: string; projectId?: string } | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('open');
  const now = new Date();
  const goals = activeGoals(snapshot, now);
  const projects = snapshot.projects.filter(project => project.status === 'active');
  const stalled = detectStalledTasks(snapshot);
  const tasks = filter === 'open' ? openTasks(snapshot) : filter === 'stalled' ? stalled.map(item => item.task) : snapshot.tasks.filter(task => isTaskCompleted(task.id, snapshot.executions));

  return <>
    <PageIntro eyebrow={`CICLO ATIVO · ${cycleLabel(cycleOf(now)).toUpperCase()}`} title="Projetos & Metas" text="Cinco Metas Magnas. O progresso de cada uma vem só do que aconteceu: marcos alcançados, ações concluídas, constância dos hábitos, peso, receita e cofres." action={<Button variant="primary" onClick={() => setTaskFor({})}><Icon as={Plus} size={16} /> Próxima ação física</Button>} />

    <section className="goal-grid">{goals.length ? goals.map((goal, index) => {
      const progress = goalProgress(snapshot, goal, now);
      const area = areaOf(snapshot, goal.areaId);
      const open = tasksOfGoal(snapshot, goal.id).filter(task => !isTaskCompleted(task.id, snapshot.executions));
      const habits = snapshot.habits.filter(habit => habit.goalId === goal.id && habit.active);
      const vaults = snapshot.vaults.filter(vault => vault.goalId === goal.id);
      const linkedProjects = snapshot.projects.filter(project => project.goalId === goal.id);
      return <Card key={goal.id} className="goal-card" style={{ '--area-color': goal.color ?? area?.color } as CSSProperties}>
        <div className="goal-card-head"><ProgressRing value={progress.value} size={96} stroke={9} /><div><small>META {index + 1} · {area?.name}</small><h2>{goal.title}</h2>{goal.why && <p>{goal.why}</p>}</div></div>
        {progress.parts.length ? <ul className="goal-breakdown">{progress.parts.map(part => <li key={part.key}><span>{part.label}</span><ProgressBar value={part.value} label={part.label} /><b>{percent(part.value)}%</b><small>{part.detail}</small></li>)}</ul> : <p className="fine-print">Ainda sem registros. Conclua a primeira ação ou cheque um hábito e o progresso aparece sozinho.</p>}
        <div className="goal-links-row">
          {linkedProjects.map(project => <Tag key={project.id} tone="building"><Icon as={FolderKanban} size={12} /> {project.title}</Tag>)}
          {habits.map(habit => { const consistency = habitConsistency(habit, snapshot.habitCheckIns, now); return <Tag key={habit.id} tone="flow"><Icon as={Repeat} size={12} /> {habit.title}{consistency ? ` · ${percent(consistency.ratio)}%` : ''}</Tag>; })}
          {vaults.map(vault => { const info = vaultProgress(vault, snapshot); return <Tag key={vault.id} tone="vault"><Icon as={Lock} size={12} /> {vault.name} · {formatBRL(info.balance)}</Tag>; })}
        </div>
        <div className="goal-foot"><span>{open.length ? `Próxima ação: ${open[0].title}` : 'Nenhuma ação aberta. Qual é o próximo passo físico?'}</span><Button variant="ghost" onClick={() => setTaskFor({ goalId: goal.id })}><Icon as={Plus} size={15} /> Ação</Button></div>
      </Card>;
    }) : <Card><EmptyState icon={Flag}>Nenhuma meta ativa neste ciclo.</EmptyState></Card>}</section>

    <SectionHeading label="PROJETOS ATIVOS" title="Construções em andamento" action={<Button onClick={() => setProjectOpen(true)}><Icon as={Plus} size={16} /> Projeto</Button>} />
    <section className="project-grid">{projects.map(project => {
      const info = projectProgress(snapshot, project);
      const projectTasks = snapshot.tasks.filter(task => task.projectId === project.id).sort((a, b) => Number(isTaskCompleted(a.id, snapshot.executions)) - Number(isTaskCompleted(b.id, snapshot.executions)));
      return <Card key={project.id} className="project-detail">
        <div className="card-head"><div><small>{areaName(snapshot, project.areaId)}{project.focus ? ' · FOCO' : ''}</small><h2>{project.title}</h2></div><b className="big-number">{info.progress === undefined ? '·' : `${info.progress}%`}</b></div>
        <ProgressBar value={info.progress === undefined ? undefined : info.progress / 100} label={project.title} />
        <p className="fine-print">{formatActivity(info.lastActivityAt)}</p>
        <div className="task-list">{projectTasks.length ? projectTasks.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} compact />) : <EmptyState>Nenhuma ação ainda. Qual é o primeiro passo?</EmptyState>}</div>
        <Button variant="ghost" onClick={() => setTaskFor({ projectId: project.id })}><Icon as={Plus} size={15} /> Nova próxima ação</Button>
      </Card>;
    })}</section>

    <HabitsBoard />

    <SectionHeading label="TODAS AS AÇÕES" title="Lista de execução" action={<Tabs label="Filtro de ações" value={filter} onChange={setFilter} options={[{ key: 'open', label: 'Abertas' }, { key: 'stalled', label: `Paradas${stalled.length ? ` (${stalled.length})` : ''}` }, { key: 'done', label: 'Concluídas' }]} />} />
    {stalled.length > 0 && filter !== 'stalled' && <button type="button" className="stalled-banner" onClick={() => setFilter('stalled')}><Icon as={AlertTriangle} size={16} /> {stalled.length === 1 ? 'Uma tarefa foi adiada' : `${stalled.length} tarefas foram adiadas`} mais de duas vezes. Ver tarefas paradas →</button>}
    <Card className="task-list">{tasks.length ? tasks.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} />) : <EmptyState>{filter === 'stalled' ? 'Nenhuma tarefa parada. Ciclos fechados.' : filter === 'done' ? 'Nada concluído ainda. A primeira vitória está a um clique.' : 'Nenhuma ação aberta.'}</EmptyState>}</Card>
    <p className="fine-print">Concluir e adiar viram registros com data e hora. Reabrir não apaga a história: cria um registro de correção.</p>

    {taskFor && <TaskDialog onClose={() => setTaskFor(null)} defaults={taskFor} />}
    {projectOpen && <ProjectDialog onClose={() => setProjectOpen(false)} />}
  </>;
}

function ProjectDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, addProject } = useLife();
  const [title, setTitle] = useState(''); const [areaId, setAreaId] = useState(snapshot.areas[0]?.id ?? ''); const [goalId, setGoalId] = useState('');
  return <Dialog eyebrow="NOVO PROJETO" title="O que você vai construir?" onClose={onClose} onSubmit={() => { if (title.trim() && areaId) { addProject(areaId, title, goalId || undefined); onClose(); } }}>
    <Field label="Projeto"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Café Baiano" /></Field>
    <div className="field-row"><Field label="Área"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} allowEmpty={false} /></Field><Field label="Meta"><select value={goalId} onChange={event => setGoalId(event.target.value)}><option value="">Sem meta</option>{snapshot.goals.filter(goal => goal.status === 'active').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field></div>
  </Dialog>;
}
