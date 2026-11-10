import { useState, type CSSProperties, type ReactNode } from 'react';
import { eventStatusLabel } from '../domain/catalog';
import { cycleLabel, cycleOf, type AreaDiagnostic, type EntityId, type LifeArea } from '../domain/models';
import { areaMovement, areaSummary, assessmentOfCycle, balanceTone, formatDay, formatTime, goalProgress, habitConsistency, latestAssessment, percent, projectProgress, tasksOfArea } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { TaskDialog, TaskLine } from './ExecutionModule';
import { HealthPanel } from './HealthPanel';
import { Dialog, EmptyState, Field, PageIntro, ProgressBar, ProgressRing, SectionHeading, Tag } from './ui';

const diagnostics: Record<AreaDiagnostic, string> = { well: 'Estou cuidando bem', attention: 'Precisa de atenção', critical: 'Precisa de atenção agora', unknown: 'Sem percepção registrada' };
const polar = (index: number, total: number, radius: number, center = 180) => { const angle = -Math.PI / 2 + (index * Math.PI * 2) / total; return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius] as const; };

export function AreasModule({ selectedId, onSelect }: { selectedId?: EntityId; onSelect: (areaId?: EntityId) => void }) {
  const { snapshot, saveAssessment } = useLife();
  const [draft, setDraft] = useState<Record<string, number> | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { areas, assessments } = snapshot;
  const now = new Date();
  const cycle = cycleOf(now);
  const current = latestAssessment(assessments);
  const ofCycle = assessmentOfCycle(assessments, cycle);
  const selected = areas.find(area => area.id === selectedId);
  if (selected) return <AreaDetail area={selected} onBack={() => onSelect(undefined)} />;

  return <>
    <PageIntro eyebrow="ORGANIZAR · MÉTODO CIS" title="Áreas da Vida" text="Dois olhares sobre o equilíbrio: a sua consciência (MAAS semestral, de 1 a 10) e o seu movimento real (ações e hábitos dos últimos 14 dias)." action={<Button variant="primary" onClick={() => setDraft(ofCycle?.scores ?? current?.scores ?? Object.fromEntries(areas.map(area => [area.id, 0])))}>{ofCycle ? 'Refazer MAAS' : `MAAS de ${cycleLabel(cycle)}`} ＋</Button>} />
    <section className="area-evaluation">
      <Card className="radar-card">
        <div className="card-head"><div><span className="label">EIXO CONSCIÊNCIA · MAAS</span><h2>{current ? current.period : 'Nenhuma avaliação registrada'}</h2><p>{current ? `Registrada em ${new Date(current.assessedAt).toLocaleDateString('pt-BR')}` : 'Quando estiver pronta, registre a primeira fotografia das suas áreas.'}</p></div>{current && <Tag tone={ofCycle ? 'flow' : 'building'}>{ofCycle ? 'ciclo atual' : 'ciclo anterior'}</Tag>}</div>
        <Radar areas={areas} scores={current?.scores} />
      </Card>
      <Card className="cycle-card">
        <span className="label">CICLO ATUAL</span><h2>{cycleLabel(cycle)}</h2>
        <p>{ofCycle ? 'Sua avaliação deste semestre está registrada. Ela é uma fotografia: não bloqueia nada do dia a dia.' : 'Ainda não há MAAS neste semestre. Leva cinco minutos e ajuda a enxergar onde colocar energia.'}</p>
        <button type="button" className="history-toggle" onClick={() => setHistoryOpen(!historyOpen)}>Histórico de avaliações <span>{historyOpen ? '−' : '+'}</span></button>
        {historyOpen && <div className="assessment-history">{assessments.length ? assessments.slice().reverse().map(item => <div key={item.id}><b>{item.period}</b><small>Registrada em {new Date(item.assessedAt).toLocaleDateString('pt-BR')}</small></div>) : <p>Sem avaliações anteriores.</p>}</div>}
      </Card>
    </section>
    <SectionHeading label="ACOMPANHAMENTO CONTÍNUO" title={`Suas ${areas.length} áreas`} />
    <section className="area-grid">{areas.map(area => {
      const movement = areaMovement(snapshot, area.id, now); const tone = balanceTone(movement.value); const summary = areaSummary(snapshot, area.id, now); const score = current?.scores[area.id];
      return <Card className="area-card" key={area.id} onClick={() => onSelect(area.id)} role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && onSelect(area.id)} style={{ '--area-color': area.color } as CSSProperties}>
        <div className="area-card-top"><span className="area-symbol">{area.icon}</span><span className="area-score">{score ? <>{score}<small>/10</small></> : <small>Sem nota</small>}</span></div>
        <h3>{area.name}</h3><p>{area.description}</p>
        <div className="area-movement"><ProgressBar value={movement.value} color={area.color} label={`Movimento em ${area.name}`} /><span>{movement.value === undefined ? '·' : `${percent(movement.value)}%`}</span></div>
        <div className="area-card-foot"><Tag tone={tone.tone}>{tone.label}</Tag><small>{[summary.openActions && `${summary.openActions} ações`, summary.habits && `${summary.habits} hábitos`, summary.activeProjects && `${summary.activeProjects} projetos`].filter(Boolean).join(' · ') || 'Sem registros'}</small></div>
      </Card>;
    })}</section>
    {draft && <AssessmentDialog areas={areas} draft={draft} onChange={(id, value) => setDraft(values => values ? { ...values, [id]: value } : values)} onClose={() => setDraft(null)} onSave={() => { saveAssessment(draft); setDraft(null); }} />}
  </>;
}

function Radar({ areas, scores }: { areas: LifeArea[]; scores?: Record<string, number> }) {
  const rings = [2, 4, 6, 8, 10]; const total = areas.length;
  const points = scores ? areas.map((area, index) => polar(index, total, ((scores[area.id] ?? 0) / 10) * 125).join(',')).join(' ') : '';
  return <div className="radar-wrap"><svg viewBox="0 0 360 360" role="img" aria-label={`Teia de avaliação das ${total} áreas`}>
    <g className="radar-grid">{rings.map(ring => <polygon key={ring} points={areas.map((_, index) => polar(index, total, ring * 12.5).join(',')).join(' ')} />)}{areas.map((_, index) => { const [x, y] = polar(index, total, 125); return <line key={index} x1="180" y1="180" x2={x} y2={y} />; })}</g>
    {scores ? <polygon className="radar-value" points={points} /> : <circle className="radar-empty" cx="180" cy="180" r="6" />}
    {areas.map((area, index) => { const [x, y] = polar(index, total, 150); return <g key={area.id}><circle cx={x} cy={y} r="4" fill={area.color} /><text className="radar-label" x={x} y={y + (y > 180 ? 14 : -8)} textAnchor="middle">{area.name}</text></g>; })}
  </svg></div>;
}

function AssessmentDialog({ areas, draft, onChange, onClose, onSave }: { areas: LifeArea[]; draft: Record<string, number>; onChange: (id: string, score: number) => void; onClose: () => void; onSave: () => void }) {
  const complete = areas.every(area => (draft[area.id] ?? 0) >= 1);
  return <Dialog eyebrow="MAAS · NOVA AVALIAÇÃO" title={cycleLabel(cycleOf(new Date()))} onClose={onClose} onSubmit={() => complete && onSave()} submitLabel={complete ? 'Salvar avaliação' : 'Dê uma nota a todas as áreas'} wide>
    <p className="dialog-text">Uma nota de 1 a 10 para cada área, do jeito que você sente hoje. A teia se atualiza antes de salvar.</p>
    <div className="assessment-layout"><Radar areas={areas} scores={draft} /><div className="score-controls">{areas.map(area => <label key={area.id}><span><i style={{ background: area.color }} />{area.name}</span><input type="range" min="0" max="10" value={draft[area.id] ?? 0} onChange={event => onChange(area.id, Number(event.target.value))} /><b>{draft[area.id] || '·'}</b></label>)}</div></div>
  </Dialog>;
}

type RecordKind = 'goal' | 'future' | 'project' | 'commitment' | 'habit';

function AreaDetail({ area, onBack }: { area: LifeArea; onBack: () => void }) {
  const store = useLife();
  const { snapshot } = store;
  const [dialog, setDialog] = useState<RecordKind | 'action' | null>(null);
  const now = new Date();
  const assessment = latestAssessment(snapshot.assessments);
  const score = assessment?.scores[area.id];
  const movement = areaMovement(snapshot, area.id, now);
  const tone = balanceTone(movement.value);
  const note = snapshot.areaNotes.find(item => item.areaId === area.id)?.content ?? '';
  const goals = snapshot.goals.filter(goal => goal.areaId === area.id);
  const projects = snapshot.projects.filter(project => project.areaId === area.id);
  const tasks = tasksOfArea(snapshot, area.id);
  const habits = snapshot.habits.filter(habit => habit.areaId === area.id && habit.active);
  const events = snapshot.events.filter(event => event.areaId === area.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return <>
    <button className="back-link" type="button" onClick={onBack}>← Áreas da Vida</button>
    <Card tone="soft" className="area-hero" style={{ '--area-color': area.color } as CSSProperties}>
      <span className="area-symbol big">{area.icon}</span>
      <div><span className="eyebrow">ÁREA DA VIDA</span><h1>{area.name}</h1><p>{area.description}</p></div>
      <div className="area-hero-stats"><ProgressRing value={movement.value} size={104} stroke={10} label="movimento" /><div><span className="label">MAAS</span><b>{score ?? '·'}<small>/10</small></b><Tag tone={tone.tone}>{tone.label}</Tag></div></div>
    </Card>
    {movement.parts.length > 0 && <div className="parts-row">{movement.parts.map(part => <span key={part.key}><b>{part.label}</b> {part.detail}</span>)}</div>}

    <section className="detail-grid">
      <Card className="diagnosis-card"><span className="label">COMO ESTOU CUIDANDO DESTA ÁREA?</span><div className="chip-row">{(Object.keys(diagnostics) as AreaDiagnostic[]).map(key => <button type="button" key={key} className={`chip ${area.diagnostic === key ? 'selected' : ''} chip-${key}`} onClick={() => store.setAreaDiagnostic(area.id, key)}>{diagnostics[key]}</button>)}</div><p className="fine-print">Sua percepção não muda os números. Ela fica ao lado deles.</p></Card>
      <Card className="notes-card"><span className="label">MEU ESPAÇO</span><textarea value={note} onChange={event => store.setAreaNote(area.id, event.target.value)} placeholder="O que está acontecendo, o que você quer construir ou lembrar?" /><small>Este caderno pertence somente a {area.name}.</small></Card>
    </section>

    {area.id === 'health' && <HealthPanel />}

    <section className="record-grid">
      <RecordCard title="Metas" text="Resultados deste ciclo e ideias para depois." onAdd={() => setDialog('goal')}>
        {goals.length ? goals.map(goal => { const progress = goalProgress(snapshot, goal, now); return <div key={goal.id} className="record-line"><div><b>{goal.title}</b><small>{goal.horizon === 'future' ? 'Ideia futura' : progress.parts.map(part => part.detail).join(' · ') || 'Ainda sem registros'}</small></div><span>{goal.horizon === 'future' ? '◇' : progress.value === undefined ? '·' : `${percent(progress.value)}%`}</span></div>; }) : <EmptyState>Nenhuma meta nesta área.</EmptyState>}
        <button type="button" className="link-button" onClick={() => setDialog('future')}>Guardar uma ideia futura ＋</button>
      </RecordCard>
      <RecordCard title="Hábitos" text="Movimentos que se repetem e sustentam a área." onAdd={() => setDialog('habit')}>
        {habits.length ? habits.map(habit => { const consistency = habitConsistency(habit, snapshot.habitCheckIns, now); return <div key={habit.id} className="record-line"><div><b>{habit.title}</b><small>{habit.frequency === 'daily' ? 'Diário' : `${habit.timesPerWeek ?? 1}x por semana`}</small></div><span>{consistency ? `${percent(consistency.ratio)}%` : '·'}</span></div>; }) : <EmptyState>Nenhum hábito nesta área.</EmptyState>}
      </RecordCard>
      <RecordCard title="Projetos" text="Construções relacionadas a esta área." onAdd={() => setDialog('project')}>
        {projects.length ? projects.map(project => { const info = projectProgress(snapshot, project); return <div key={project.id} className="record-line"><div><b>{project.title}</b><small>{info.nextAction ? `Próxima ação: ${info.nextAction.title}` : 'Sem ações planejadas'}</small></div><span>{info.progress === undefined ? '·' : `${info.progress}%`}</span></div>; }) : <EmptyState>Nenhum projeto nesta área.</EmptyState>}
      </RecordCard>
      <RecordCard title="Compromissos" text="Aparecem também na Agenda." onAdd={() => setDialog('commitment')}>
        {events.length ? events.map(event => <div key={event.id} className="record-line"><div><b>{event.title}</b><small>{formatDay(event.startsAt)} · {formatTime(event.startsAt)}</small></div><span>{eventStatusLabel[event.status]}</span></div>) : <EmptyState>Nenhum compromisso nesta área.</EmptyState>}
      </RecordCard>
    </section>
    <SectionHeading label="AÇÕES" title="O que está em movimento aqui" action={<Button onClick={() => setDialog('action')}>Nova ação ＋</Button>} />
    <Card className="task-list">{tasks.length ? tasks.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => store.toggleTaskCompletion(task.id)} />) : <EmptyState>As ações desta área aparecem aqui, em Execução e na Central.</EmptyState>}</Card>

    {dialog === 'action' && <TaskDialog onClose={() => setDialog(null)} defaults={{ areaId: area.id }} />}
    {dialog && dialog !== 'action' && <RecordDialog kind={dialog} areaId={area.id} onClose={() => setDialog(null)} />}
  </>;
}

function RecordCard({ title, text, onAdd, children }: { title: string; text: string; onAdd: () => void; children: ReactNode }) {
  return <Card className="record-card"><div className="card-head"><div><span className="label">{title.toUpperCase()}</span><p>{text}</p></div><Button variant="ghost" onClick={onAdd}>＋</Button></div><div className="record-list">{children}</div></Card>;
}

const recordTitles: Record<RecordKind, string> = { goal: 'Nova meta do ciclo', future: 'Nova ideia futura', project: 'Novo projeto', commitment: 'Novo compromisso', habit: 'Novo hábito' };

function RecordDialog({ kind, areaId, onClose }: { kind: RecordKind; areaId: EntityId; onClose: () => void }) {
  const store = useLife();
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [goalId, setGoalId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const goals = store.snapshot.goals.filter(goal => goal.status === 'active' && goal.horizon === 'current');
  const submit = () => {
    if (!title.trim()) return;
    if (kind === 'goal' || kind === 'future') store.addGoal({ title, areaId, horizon: kind === 'goal' ? 'current' : 'future' });
    if (kind === 'project') store.addProject(areaId, title, goalId || undefined);
    if (kind === 'habit') store.addHabit({ title, areaId, goalId: goalId || undefined, frequency, timesPerWeek: frequency === 'weekly' ? 3 : undefined });
    if (kind === 'commitment') { if (!when) return; const start = new Date(when); store.addEvent({ title, areaId, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3_600_000).toISOString() }); }
    onClose();
  };
  return <Dialog eyebrow="NOVA ENTRADA" title={recordTitles[kind]} onClose={onClose} onSubmit={submit}>
    <Field label="Título"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Escreva um título" /></Field>
    {(kind === 'project' || kind === 'habit') && <Field label="Conectar a uma meta"><select value={goalId} onChange={event => setGoalId(event.target.value)}><option value="">Sem meta</option>{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field>}
    {kind === 'habit' && <Field label="Frequência"><select value={frequency} onChange={event => setFrequency(event.target.value as 'daily' | 'weekly')}><option value="daily">Todos os dias</option><option value="weekly">3 vezes por semana</option></select></Field>}
    {kind === 'commitment' && <Field label="Quando acontece"><input type="datetime-local" required value={when} onChange={event => setWhen(event.target.value)} /></Field>}
  </Dialog>;
}
