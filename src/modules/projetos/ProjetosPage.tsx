import { ArrowRight, FolderKanban, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { areaName, areas } from '../../data/areas';
import { goalProgress, isOpen, tasksOfProject } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import type { Goal, Project } from '../../types';
import { Button, GlassCard, Tabs, Tag, cn } from '../../ui';
import { EmptyState, Page, PageHeader } from '../GuidePage';
import { GoalCard, GoalModal } from './GoalCard';
import { ProjectModal, statusLabel } from './ProjectModal';

type View = 'projetos' | 'metas';
const order: Record<Project['status'], number> = { active: 0, paused: 1, done: 2 };

export function ProjetosPage() {
  const state = useMive();
  const [view, setView] = useState<View>('projetos');
  const [projectModal, setProjectModal] = useState(false);
  const [goalModal, setGoalModal] = useState<{ goal?: Goal } | null>(null);
  const projects = [...state.projects].sort((a, b) => order[a.status] - order[b.status] || a.createdAt.localeCompare(b.createdAt));
  const goalsByArea = areas.map(area => ({ area, goals: state.goals.filter(goal => goal.areaId === area.id) })).filter(group => group.goals.length);

  return <Page>
    <PageHeader eyebrow="Projetos & Metas" title="Onde a visão vira entrega" subtitle="Projetos guardam as tarefas. Metas guardam os marcos. Promova uma tarefa para hoje e execute." action={<Button onClick={() => view === 'projetos' ? setProjectModal(true) : setGoalModal({})}><Plus size={18} strokeWidth={2} /> {view === 'projetos' ? 'Novo projeto' : 'Nova meta'}</Button>} />
    <Tabs className="mb-6" label="Projetos ou metas" value={view} onChange={setView} options={[{ value: 'projetos', label: `Projetos · ${state.projects.length}` }, { value: 'metas', label: `Metas · ${state.goals.length}` }]} />
    {view === 'projetos' && (projects.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map(project => <ProjectCard key={project.id} project={project} />)}</div>
      : <EmptyState icon={FolderKanban} title="Nenhum projeto ainda">Crie o primeiro projeto e quebre em tarefas físicas de até 50 minutos.</EmptyState>)}
    {view === 'metas' && (goalsByArea.length ? <div className="grid gap-8">{goalsByArea.map(({ area, goals }) => <section key={area.id} aria-labelledby={`area-${area.id}`}>
      <h2 id={`area-${area.id}`} className="mb-3 flex items-center gap-2 text-lg font-semibold"><area.icon size={20} strokeWidth={1.5} className="text-magenta" />{area.name}</h2>
      <div className="grid gap-4 lg:grid-cols-2">{goals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={item => setGoalModal({ goal: item })} />)}</div>
    </section>)}</div> : <EmptyState icon={Target} title="Nenhuma meta ainda">Uma meta com dois ou três marcos já é o suficiente para começar.</EmptyState>)}
    {projectModal && <ProjectModal onClose={() => setProjectModal(false)} />}
    {goalModal && <GoalModal goal={goalModal.goal} onClose={() => setGoalModal(null)} />}
  </Page>;
}

function ProjectCard({ project }: { project: Project }) {
  const state = useMive();
  const tasks = tasksOfProject(state, project.id);
  const open = tasks.filter(isOpen).length;
  const goals = state.goals.filter(goal => goal.projectId === project.id);
  const milestones = goals.flatMap(goal => goal.milestones);
  const progress = goalProgress({ milestones });
  return <Link to={`/projetos/${project.id}`} className={cn('group block rounded-3xl focus-visible:outline-none', project.status !== 'active' && 'opacity-75')}>
    <GlassCard className="grid h-full gap-4 transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="text-xl font-semibold leading-tight">{project.name}</h2><p className="mt-1 text-sm text-muted">{areaName(project.areaId)}</p></div>
        <ArrowRight size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-magenta transition group-hover:translate-x-1" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Tag tone={project.status === 'active' ? 'magenta' : 'neutral'}>{statusLabel[project.status]}</Tag>
        {project.tag && <Tag tone="ciano">#{project.tag}</Tag>}
      </div>
      <div className="grid gap-2">
        <div className="flex justify-between text-sm"><span className="text-ink-soft">{open} {open === 1 ? 'tarefa aberta' : 'tarefas abertas'}</span><span className="font-semibold">{progress === undefined ? 'Sem marcos' : `${milestones.filter(item => item.doneAt).length}/${milestones.length} marcos`}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-line/10"><div className="h-full rounded-full bg-grad-magenta transition-all" style={{ width: `${(progress ?? 0) * 100}%` }} /></div>
      </div>
    </GlassCard>
  </Link>;
}
