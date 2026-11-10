import { ArrowLeft, ChevronDown, Plus, Radar as RadarIcon, SlidersHorizontal } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import type { AreasTab, RouteParams } from '../app/navigation';
import { eventStatusLabel } from '../domain/catalog';
import { cycleLabel, cycleOf, type AreaDiagnostic, type EntityId, type LifeArea } from '../domain/models';
import { areaMovement, areaSummary, assessmentOfCycle, balanceTone, formatDay, formatTime, goalProgress, habitConsistency, latestAssessment, percent, projectProgress, tasksOfArea } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FinancePanel } from '../components/FinancePanel';
import { HealthPanel } from '../components/HealthPanel';
import { WellbeingPanel } from '../components/WellbeingPanel';
import { Icon, iconByName } from '../components/icons';
import { TaskDialog, TaskLine } from '../components/tasks';
import { Dialog, EmptyState, Field, PageIntro, ProgressBar, ProgressRing, SectionHeading, Tabs, Tag } from '../components/ui';

const diagnostics: Record<AreaDiagnostic, string> = { well: 'Estou cuidando bem', attention: 'Precisa de atenção', critical: 'Precisa de atenção agora', unknown: 'Sem percepção registrada' };
const polar = (index: number, total: number, radius: number, center = 180) => { const angle = -Math.PI / 2 + (index * Math.PI * 2) / total; return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius] as const; };
const tabs: { key: AreasTab; label: string }[] = [{ key: 'visao', label: 'As 12 áreas' }, { key: 'financas', label: 'Finanças' }, { key: 'saude', label: 'Saúde' }, { key: 'bemestar', label: 'Bem-estar & Imagem' }];

export function AreasPage({ params, onNavigate }: { params: RouteParams; onNavigate: (params: RouteParams) => void }) {
  const tab = params.tab ?? 'visao';
  const { snapshot } = useLife();
  const selected = snapshot.areas.find(area => area.id === params.areaId);
  if (selected && tab === 'visao') return <AreaDetail area={selected} onBack={() => onNavigate({ tab: 'visao' })} />;
  return <>
    <PageIntro eyebrow="MÉTODO CIS · 12 DIMENSÕES" title="Áreas da Vida" text="Dois olhares que não se misturam: a sua percepção (notas de 1 a 10) e o seu movimento real (ações, hábitos e estudos registrados nos últimos 14 dias)." />
    <Tabs label="Seções de Áreas da Vida" value={tab} options={tabs} onChange={next => onNavigate({ tab: next })} />
    {tab === 'visao' && <AreasOverview onOpen={areaId => onNavigate({ tab: 'visao', areaId })} />}
    {tab === 'financas' && <FinancePanel />}
    {tab === 'saude' && <HealthPanel />}
    {tab === 'bemestar' && <WellbeingPanel />}
  </>;
}

function AreasOverview({ onOpen }: { onOpen: (areaId: EntityId) => void }) {
  const { snapshot, saveAssessment } = useLife();
  const [axis, setAxis] = useState<'perception' | 'movement'>('perception');
  const [radarOpen, setRadarOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, number> | null>(null);
  const now = new Date();
  const cycle = cycleOf(now);
  const current = latestAssessment(snapshot.assessments);
  const ofCycle = assessmentOfCycle(snapshot.assessments, cycle);
  const movement = Object.fromEntries(snapshot.areas.map(area => [area.id, areaMovement(snapshot, area.id, now).value]));
  const radarScores = axis === 'perception' ? current?.scores : Object.values(movement).some(value => value !== undefined) ? Object.fromEntries(Object.entries(movement).map(([id, value]) => [id, (value ?? 0) * 10])) : undefined;

  return <>
    <div className="diagnosis-bar">
      <button type="button" className={`diagnosis-toggle ${radarOpen ? 'is-open' : ''}`} onClick={() => setRadarOpen(!radarOpen)} aria-expanded={radarOpen}><Icon as={RadarIcon} size={18} /> {radarOpen ? 'Ocultar Diagnóstico MAAS' : 'Visualizar Diagnóstico MAAS'} <Icon as={ChevronDown} size={16} /></button>
      <Button variant="primary" onClick={() => setDraft(ofCycle?.scores ?? current?.scores ?? Object.fromEntries(snapshot.areas.map(area => [area.id, 0])))}><Icon as={SlidersHorizontal} size={16} /> Nova Autoavaliação do Ciclo</Button>
    </div>
    {radarOpen && <>
    <section className="area-evaluation">
      <Card className="radar-card">
        <div className="card-head"><div><span className="label">RADAR DA VIDA</span><h2>{axis === 'perception' ? (current ? `Percepção · ${current.period}` : 'Sem autoavaliação ainda') : 'Movimento real · 14 dias'}</h2></div><Tabs label="Eixo do radar" value={axis} options={[{ key: 'perception', label: 'Percepção' }, { key: 'movement', label: 'Movimento real' }]} onChange={setAxis} /></div>
        <Radar areas={snapshot.areas} scores={radarScores} tone={axis} />
        <p className="fine-print">{axis === 'perception' ? 'Notas que você deu, de 1 a 10. A avaliação histórica do CIS fica em Evolução, sem misturar instrumentos.' : 'Calculado a partir do que você registrou: ações feitas ou vencidas, hábitos checados e dias de estudo. Áreas sem registro ficam no centro.'}</p>
      </Card>
      <Card className="cycle-card" tone="soft">
        <span className="label">CICLO ATUAL</span><h2>{cycleLabel(cycle)}</h2>
        <p>{ofCycle ? `Sua autoavaliação deste ciclo foi registrada em ${new Date(ofCycle.assessedAt).toLocaleDateString('pt-BR')}.` : 'Ainda não há autoavaliação neste ciclo. Leva cinco minutos e mostra onde colocar energia.'}</p>
        {snapshot.assessments.length > 0 && <div className="assessment-history">{snapshot.assessments.slice().reverse().map(item => <div key={item.id}><b>{item.period}</b><small>{new Date(item.assessedAt).toLocaleDateString('pt-BR')}</small></div>)}</div>}
      </Card>
    </section>
    </>}
    <SectionHeading label="ACOMPANHAMENTO CONTÍNUO" title={`Suas ${snapshot.areas.length} áreas`} />
    <section className="area-grid area-grid-12">{snapshot.areas.map(area => {
      const value = movement[area.id]; const tone = balanceTone(value); const summary = areaSummary(snapshot, area.id, now); const score = current?.scores[area.id];
      return <Card className="area-card" key={area.id} onClick={() => onOpen(area.id)} role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && onOpen(area.id)} style={{ '--area-color': area.color } as CSSProperties}>
        <div className="area-card-top"><span className="area-symbol"><Icon as={iconByName(area.icon)} size={19} /></span><span className="area-score">{score ? <>{score}<small>/10</small></> : <small>Sem nota</small>}</span></div>
        <h3>{area.name}</h3><p>{area.description}</p>
        <div className="area-movement"><ProgressBar value={value} color={area.color} label={`Movimento em ${area.name}`} /><span>{value === undefined ? '·' : `${percent(value)}%`}</span></div>
        <div className="area-card-foot"><Tag tone={tone.tone}>{tone.label}</Tag><small>{[summary.openActions && `${summary.openActions} ações`, summary.habits && `${summary.habits} hábitos`, summary.currentGoals && `${summary.currentGoals} metas`].filter(Boolean).join(' · ') || 'Sem registros'}</small></div>
      </Card>;
    })}</section>
    {draft && <AssessmentDialog areas={snapshot.areas} draft={draft} onChange={(id, score) => setDraft(values => values ? { ...values, [id]: score } : values)} onClose={() => setDraft(null)} onSave={() => { saveAssessment(draft); setDraft(null); setAxis('perception'); }} />}
  </>;
}

export function Radar({ areas, scores, tone = 'perception' }: { areas: LifeArea[]; scores?: Record<string, number>; tone?: 'perception' | 'movement' }) {
  const rings = [2, 4, 6, 8, 10]; const total = areas.length;
  const points = scores ? areas.map((area, index) => polar(index, total, ((scores[area.id] ?? 0) / 10) * 125).join(',')).join(' ') : '';
  return <div className="radar-wrap"><svg viewBox="0 0 360 360" role="img" aria-label={`Radar das ${total} áreas`}>
    <g className="radar-grid">{rings.map(ring => <polygon key={ring} points={areas.map((_, index) => polar(index, total, ring * 12.5).join(',')).join(' ')} />)}{areas.map((_, index) => { const [x, y] = polar(index, total, 125); return <line key={index} x1="180" y1="180" x2={x} y2={y} />; })}</g>
    {scores ? <polygon className={`radar-value radar-${tone}`} points={points} /> : <circle className="radar-empty" cx="180" cy="180" r="6" />}
    {areas.map((area, index) => { const [x, y] = polar(index, total, 150); return <g key={area.id}><circle cx={x} cy={y} r="4" fill={area.color} /><text className="radar-label" x={x} y={y + (y > 180 ? 14 : -8)} textAnchor="middle">{area.name}</text></g>; })}
  </svg></div>;
}

function AssessmentDialog({ areas, draft, onChange, onClose, onSave }: { areas: LifeArea[]; draft: Record<string, number>; onChange: (id: string, score: number) => void; onClose: () => void; onSave: () => void }) {
  const complete = areas.every(area => (draft[area.id] ?? 0) >= 1);
  return <Dialog eyebrow="NOVA AUTOAVALIAÇÃO DO CICLO" title={cycleLabel(cycleOf(new Date()))} onClose={onClose} onSubmit={() => complete && onSave()} submitLabel={complete ? 'Salvar autoavaliação' : 'Dê uma nota de 1 a 10 a todas as áreas'} wide>
    <p className="dialog-text">Como você sente cada área hoje. Esta autoavaliação é um registro novo: as anteriores e os instrumentos do CIS continuam guardados.</p>
    <div className="assessment-layout"><Radar areas={areas} scores={draft} /><div className="score-controls">{areas.map(area => <label key={area.id}><span><i style={{ background: area.color }} />{area.name}</span><input type="range" min="0" max="10" value={draft[area.id] ?? 0} onChange={event => onChange(area.id, Number(event.target.value))} /><b>{draft[area.id] || '·'}</b></label>)}</div></div>
  </Dialog>;
}

type RecordKind = 'goal' | 'project' | 'commitment' | 'habit';

function AreaDetail({ area, onBack }: { area: LifeArea; onBack: () => void }) {
  const store = useLife();
  const { snapshot } = store;
  const [dialog, setDialog] = useState<RecordKind | 'action' | null>(null);
  const now = new Date();
  const score = latestAssessment(snapshot.assessments)?.scores[area.id];
  const movement = areaMovement(snapshot, area.id, now);
  const tone = balanceTone(movement.value);
  const note = snapshot.areaNotes.find(item => item.areaId === area.id)?.content ?? '';
  const goals = snapshot.goals.filter(goal => goal.areaId === area.id);
  const projects = snapshot.projects.filter(project => project.areaId === area.id);
  const tasks = tasksOfArea(snapshot, area.id);
  const habits = snapshot.habits.filter(habit => habit.areaId === area.id && habit.active);
  const events = snapshot.events.filter(event => event.areaId === area.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return <>
    <button className="back-link" type="button" onClick={onBack}><Icon as={ArrowLeft} size={16} /> Áreas da Vida</button>
    <Card tone="soft" className="area-hero" style={{ '--area-color': area.color } as CSSProperties}>
      <span className="area-symbol big"><Icon as={iconByName(area.icon)} size={28} /></span>
      <div><span className="eyebrow">ÁREA DA VIDA</span><h1>{area.name}</h1><p>{area.description}</p></div>
      <div className="area-hero-stats"><ProgressRing value={movement.value} size={104} stroke={10} label="real" /><div><span className="label">PERCEPÇÃO</span><b>{score ?? '·'}<small>/10</small></b><Tag tone={tone.tone}>{tone.label}</Tag></div></div>
    </Card>
    {movement.parts.length > 0 && <div className="parts-row">{movement.parts.map(part => <span key={part.label}><b>{part.label}</b> {part.detail}</span>)}</div>}
    <section className="detail-grid">
      <Card className="diagnosis-card"><span className="label">COMO ESTOU CUIDANDO DESTA ÁREA?</span><div className="chip-row">{(Object.keys(diagnostics) as AreaDiagnostic[]).map(key => <button type="button" key={key} className={`chip ${area.diagnostic === key ? 'selected' : ''} chip-${key}`} onClick={() => store.setAreaDiagnostic(area.id, key)}>{diagnostics[key]}</button>)}</div><p className="fine-print">Sua percepção não muda os números. Ela fica ao lado deles.</p></Card>
      <Card className="notes-card"><span className="label">MEU ESPAÇO</span><textarea value={note} onChange={event => store.setAreaNote(area.id, event.target.value)} placeholder="O que está acontecendo, o que você quer construir ou lembrar?" /><small>Este caderno pertence somente a {area.name}.</small></Card>
    </section>
    {area.id === 'health' && <HealthPanel />}
    {area.id === 'finance' && <FinancePanel />}
    {area.id === 'wellbeing' && <WellbeingPanel />}
    <section className="record-grid">
      <RecordCard title="Metas" onAdd={() => setDialog('goal')}>{goals.length ? goals.map(goal => { const progress = goalProgress(snapshot, goal, now); return <div key={goal.id} className="record-line"><div><b>{goal.title}</b><small>{progress.parts.map(part => part.detail).join(' · ') || 'Ainda sem registros'}</small></div><span>{progress.value === undefined ? '·' : `${percent(progress.value)}%`}</span></div>; }) : <EmptyState>Nenhuma meta nesta área.</EmptyState>}</RecordCard>
      <RecordCard title="Hábitos" onAdd={() => setDialog('habit')}>{habits.length ? habits.map(habit => { const consistency = habitConsistency(habit, snapshot.habitCheckIns, now); return <div key={habit.id} className="record-line"><div><b>{habit.title}</b><small>{habit.frequency === 'daily' ? 'Diário' : `${habit.timesPerWeek ?? 1}x por semana`}</small></div><span>{consistency ? `${percent(consistency.ratio)}%` : '·'}</span></div>; }) : <EmptyState>Nenhum hábito nesta área.</EmptyState>}</RecordCard>
      <RecordCard title="Projetos" onAdd={() => setDialog('project')}>{projects.length ? projects.map(project => { const info = projectProgress(snapshot, project); return <div key={project.id} className="record-line"><div><b>{project.title}</b><small>{info.nextAction ? `Próxima ação: ${info.nextAction.title}` : 'Sem ações planejadas'}</small></div><span>{info.progress === undefined ? '·' : `${info.progress}%`}</span></div>; }) : <EmptyState>Nenhum projeto nesta área.</EmptyState>}</RecordCard>
      <RecordCard title="Compromissos" onAdd={() => setDialog('commitment')}>{events.length ? events.map(event => <div key={event.id} className="record-line"><div><b>{event.title}</b><small>{formatDay(event.startsAt)} · {formatTime(event.startsAt)}</small></div><span>{eventStatusLabel[event.status]}</span></div>) : <EmptyState>Nenhum compromisso nesta área.</EmptyState>}</RecordCard>
    </section>
    <SectionHeading label="AÇÕES" title="O que está em movimento aqui" action={<Button onClick={() => setDialog('action')}><Icon as={Plus} size={16} /> Nova ação</Button>} />
    <Card className="task-list">{tasks.length ? tasks.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} />) : <EmptyState>As ações desta área aparecem aqui, em Projetos & Metas e no Início.</EmptyState>}</Card>
    {dialog === 'action' && <TaskDialog onClose={() => setDialog(null)} defaults={{ areaId: area.id }} />}
    {dialog && dialog !== 'action' && <RecordDialog kind={dialog} areaId={area.id} onClose={() => setDialog(null)} />}
  </>;
}

function RecordCard({ title, onAdd, children }: { title: string; onAdd: () => void; children: ReactNode }) {
  return <Card className="record-card"><div className="card-head"><span className="label">{title.toUpperCase()}</span><button type="button" className="icon-chip" onClick={onAdd} aria-label={`Adicionar em ${title}`}><Icon as={Plus} size={15} /></button></div><div className="record-list">{children}</div></Card>;
}

const recordTitles: Record<RecordKind, string> = { goal: 'Nova meta do ciclo', project: 'Novo projeto', commitment: 'Novo compromisso', habit: 'Novo hábito' };
function RecordDialog({ kind, areaId, onClose }: { kind: RecordKind; areaId: EntityId; onClose: () => void }) {
  const store = useLife();
  const [title, setTitle] = useState(''); const [when, setWhen] = useState(''); const [goalId, setGoalId] = useState('');
  const goals = store.snapshot.goals.filter(goal => goal.status === 'active' && goal.horizon === 'current');
  const submit = () => {
    if (!title.trim()) return;
    if (kind === 'goal') store.addGoal({ title, areaId, horizon: 'current' });
    if (kind === 'project') store.addProject(areaId, title, goalId || undefined);
    if (kind === 'habit') store.addHabit({ title, areaId, goalId: goalId || undefined, frequency: 'daily' });
    if (kind === 'commitment') { if (!when) return; const start = new Date(when); store.addEvent({ title, areaId, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3_600_000).toISOString() }); }
    onClose();
  };
  return <Dialog eyebrow="NOVA ENTRADA" title={recordTitles[kind]} onClose={onClose} onSubmit={submit}>
    <Field label="Título"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} /></Field>
    {(kind === 'project' || kind === 'habit') && <Field label="Conectar a uma meta"><select value={goalId} onChange={event => setGoalId(event.target.value)}><option value="">Sem meta</option>{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field>}
    {kind === 'commitment' && <Field label="Quando acontece"><input type="datetime-local" required value={when} onChange={event => setWhen(event.target.value)} /></Field>}
  </Dialog>;
}
