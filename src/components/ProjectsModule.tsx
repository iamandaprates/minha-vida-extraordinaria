import { useState } from 'react';
import { areaName, formatActivity, isTaskCompleted, projectProgress } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { TaskDialog, TaskLine } from './ExecutionModule';
import { AreaSelect, Dialog, EmptyState, Field, PageIntro, ProgressBar } from './ui';

export function ProjectsModule() {
  const { snapshot, toggleTaskCompletion } = useLife();
  const [open, setOpen] = useState(false);
  const [taskFor, setTaskFor] = useState<string | null>(null);
  const projects = snapshot.projects.slice().sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || Number(Boolean(b.focus)) - Number(Boolean(a.focus)));
  return <>
    <PageIntro eyebrow="ORGANIZAR" title="Projetos" text="Construções com começo, meio e fim. O progresso é a parte das ações do projeto que já virou realidade." action={<Button variant="primary" onClick={() => setOpen(true)}>Novo projeto ＋</Button>} />
    <section className="project-stack">{projects.length ? projects.map(project => {
      const info = projectProgress(snapshot, project);
      const tasks = snapshot.tasks.filter(task => task.projectId === project.id).sort((a, b) => Number(isTaskCompleted(a.id, snapshot.executions)) - Number(isTaskCompleted(b.id, snapshot.executions)));
      const goal = snapshot.goals.find(item => item.id === project.goalId);
      return <Card key={project.id} className="project-detail">
        <div className="card-head"><div><small>{areaName(snapshot, project.areaId)}{goal ? ` · Meta · ${goal.title}` : ''}{project.focus ? ' · FOCO' : ''}</small><h2>{project.title}</h2></div><b className="big-number">{info.progress === undefined ? '·' : `${info.progress}%`}</b></div>
        <ProgressBar value={info.progress === undefined ? undefined : info.progress / 100} label={project.title} />
        <p className="fine-print">{formatActivity(info.lastActivityAt)}</p>
        <div className="task-list">{tasks.length ? tasks.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => toggleTaskCompletion(task.id)} compact />) : <EmptyState>Nenhuma ação ainda. Qual é o primeiro passo?</EmptyState>}</div>
        <Button variant="ghost" onClick={() => setTaskFor(project.id)}>Nova ação no projeto ＋</Button>
      </Card>;
    }) : <Card><EmptyState>Nenhum projeto ainda.</EmptyState></Card>}</section>
    {open && <ProjectDialog onClose={() => setOpen(false)} />}
    {taskFor && <TaskDialog onClose={() => setTaskFor(null)} defaults={{ projectId: taskFor, areaId: snapshot.projects.find(project => project.id === taskFor)?.areaId, goalId: snapshot.projects.find(project => project.id === taskFor)?.goalId }} />}
  </>;
}

function ProjectDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, addProject } = useLife();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState(snapshot.areas[0]?.id ?? '');
  const [goalId, setGoalId] = useState('');
  return <Dialog eyebrow="NOVO PROJETO" title="O que você vai construir?" onClose={onClose} onSubmit={() => { if (title.trim() && areaId) { addProject(areaId, title, goalId || undefined); onClose(); } }}>
    <Field label="Projeto"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Site da CAVU" /></Field>
    <div className="field-row"><Field label="Área"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} allowEmpty={false} /></Field><Field label="Meta"><select value={goalId} onChange={event => setGoalId(event.target.value)}><option value="">Sem meta</option>{snapshot.goals.filter(goal => goal.status === 'active').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field></div>
  </Dialog>;
}
