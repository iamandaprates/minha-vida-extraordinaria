import { useState, type CSSProperties, type FormEvent } from 'react';
import type { AreaDiagnostic, EntityId, LifeArea, LifeAssessment, LifeSnapshot } from '../domain/models';
import { areaSummary, eventStatusLabel, formatDay, formatDue, formatTime, isTaskCompleted, latestAssessment, projectProgress, tasksOfArea } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';

const diagnostics: Record<AreaDiagnostic, { label: string; icon: string }> = { well: { label: 'Estou cuidando bem', icon: '●' }, attention: { label: 'Precisa de atenção', icon: '●' }, critical: { label: 'Precisa de atenção agora', icon: '●' }, unknown: { label: 'Sem percepção registrada', icon: '○' } };
const polar = (index: number, total: number, radius: number, center = 180) => { const angle = -Math.PI / 2 + (index * Math.PI * 2) / total; return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius] as const; };
const assessedOn = (assessment: LifeAssessment) => new Date(assessment.assessedAt).toLocaleDateString('pt-BR');

type RecordKind = 'goals' | 'futureGoals' | 'projects' | 'actions' | 'commitments';
const recordSections: { key: RecordKind; title: string; singular: string; text: string }[] = [
  { key: 'goals', title: 'Objetivos', singular: 'objetivo', text: 'Resultados que você quer alcançar neste ciclo.' },
  { key: 'futureGoals', title: 'Objetivos futuros e ideias', singular: 'objetivo futuro', text: 'O que importa guardar, sem precisar executar agora.' },
  { key: 'projects', title: 'Projetos', singular: 'projeto', text: 'Construções relacionadas a esta área.' },
  { key: 'actions', title: 'Ações', singular: 'ação', text: 'Movimentos concretos. Aparecem também em Execução e na Central.' },
  { key: 'commitments', title: 'Compromissos', singular: 'compromisso', text: 'Eventos com data e hora. Aparecem também na Agenda.' }
];

export function AreasModule() {
  const { snapshot, saveAssessment } = useLife();
  const [draft, setDraft] = useState<Record<string, number> | null>(null);
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { areas, assessments } = snapshot;
  const current = latestAssessment(assessments);
  const selected = areas.find(area => area.id === selectedId);
  const initialScores = () => Object.fromEntries(areas.map(area => [area.id, 0]));
  const submitAssessment = () => { if (!draft) return; saveAssessment(semesterLabel(new Date()), draft); setDraft(null); };

  if (selected) return <AreaDetail area={selected} snapshot={snapshot} assessment={current} onBack={() => setSelectedId(null)} />;
  return <>
    <div className="page-intro"><div><span className="eyebrow">ORGANIZAR</span><h1>Áreas da minha vida</h1><p>Uma visão contínua de tudo o que compõe sua vida. A avaliação é semestral, o cuidado acontece todos os dias.</p></div><Button className="pink-button" onClick={() => setDraft(current?.scores ?? initialScores())}>Nova avaliação ＋</Button></div>
    <section className="area-evaluation"><Card className="radar-card"><div className="radar-heading"><div><span className="label">AVALIAÇÃO DA VIDA</span><h2>{current ? current.period : 'Nenhuma avaliação registrada'}</h2><p>{current ? `Última atualização: ${assessedOn(current)}` : 'Quando estiver pronta, registre a primeira fotografia das suas áreas.'}</p></div>{current && <span className="assessment-tag">ATUAL</span>}</div><Radar areas={areas} scores={current?.scores} /><p className="radar-caption">A teia mostra apenas avaliações salvas. Seus registros diários continuam disponíveis em cada área.</p></Card><Card className="cycle-card"><span className="label">CICLO ATUAL</span><h2>{current?.period ?? 'Aguardando primeira avaliação'}</h2><p>Uma avaliação cria uma fotografia deste semestre. Ela não bloqueia suas ações, objetivos, projetos ou notas do dia a dia.</p><button type="button" className="history-toggle" onClick={() => setHistoryOpen(!historyOpen)}>Histórico de avaliações <span>{historyOpen ? '−' : '+'}</span></button>{historyOpen && <div className="assessment-history">{assessments.length ? assessments.slice().reverse().map(item => <button type="button" key={item.id} onClick={() => setDraft(item.scores)}><b>{item.period}</b><small>Registrada em {assessedOn(item)}</small></button>) : <p>Sem avaliações anteriores.</p>}</div>}</Card></section>
    <section className="section-heading"><div><span className="label">ACOMPANHAMENTO CONTÍNUO</span><h2>Suas {areas.length} áreas</h2></div><span className="area-count">{areas.length} áreas</span></section>
    <section className="area-grid">{areas.map(area => {
      const score = current?.scores[area.id]; const summary = areaSummary(snapshot, area.id); const cardStyle = { '--area-color': area.color } as CSSProperties;
      return <Card className="area-life-card" key={area.id} onClick={() => setSelectedId(area.id)} role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && setSelectedId(area.id)} style={cardStyle}><div className="area-card-top"><span className="area-symbol">{area.icon}</span>{score ? <b>{score}<small>/10</small></b> : <small>Sem nota</small>}</div><h3>{area.name}</h3><p>{area.description}</p><div className={`diagnostic ${area.diagnostic}`}><i>{diagnostics[area.diagnostic].icon}</i>{diagnostics[area.diagnostic].label}</div><div className="area-facts"><span>{summary.activeProjects || 'Sem'} projetos</span><span>{summary.currentGoals || 'Sem'} objetivos</span><span>{summary.openActions || 'Sem'} ações</span></div><button type="button">Entrar na área →</button></Card>;
    })}</section>
    {draft && <AssessmentDialog areas={areas} draft={draft} onChange={(id, score) => setDraft(values => values ? { ...values, [id]: score } : values)} onClose={() => setDraft(null)} onSave={submitAssessment} />}
  </>;
}

function Radar({ areas, scores }: { areas: LifeArea[]; scores?: Record<string, number> }) { const rings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; const total = areas.length; const points = scores ? areas.map((area, index) => polar(index, total, ((scores[area.id] ?? 0) / 10) * 125).join(',')).join(' ') : ''; return <div className="radar-wrap"><svg viewBox="0 0 360 360" role="img" aria-label={`Teia de avaliação das ${total} áreas`}><g className="radar-grid">{rings.map(ring => <polygon key={ring} points={areas.map((_, index) => polar(index, total, ring * 12.5).join(',')).join(' ')} />)}{areas.map((_, index) => { const [x, y] = polar(index, total, 125); return <line key={index} x1="180" y1="180" x2={x} y2={y} />; })}</g>{rings.filter(ring => ring % 2 === 0).map(ring => <text className="radar-scale" key={ring} x="184" y={180 - ring * 12.5 + 4}>{ring}</text>)}{scores ? <polygon className="radar-value" points={points} /> : <circle className="radar-empty" cx="180" cy="180" r="6" />}{areas.map((area, index) => { const [x, y] = polar(index, total, 153); return <g key={area.id}><circle cx={x} cy={y} r="4" fill={area.color} /><text className="radar-label" x={x} y={y + (y > 180 ? 13 : -8)} textAnchor="middle">{area.name}</text></g>; })}</svg></div>; }

function AssessmentDialog({ areas, draft, onChange, onClose, onSave }: { areas: LifeArea[]; draft: Record<string, number>; onChange: (id: string, score: number) => void; onClose: () => void; onSave: () => void }) { const complete = areas.every(area => (draft[area.id] ?? 0) >= 1); return <div className="dialog-backdrop" onMouseDown={onClose} role="presentation"><section className="assessment-dialog" onMouseDown={event => event.stopPropagation()}><button type="button" className="close" onClick={onClose}>×</button><span className="label">NOVA AVALIAÇÃO</span><h2>{semesterLabel(new Date())}</h2><p>Escolha uma nota de 1 a 10 para cada área. A teia é atualizada antes de salvar esta nova fotografia.</p><Radar areas={areas} scores={draft} /><div className="score-controls">{areas.map(area => <label key={area.id}><span><i style={{ background: area.color }} />{area.name}</span><input type="range" min="0" max="10" value={draft[area.id] ?? 0} onChange={event => onChange(area.id, Number(event.target.value))} /><b>{draft[area.id] || '·'}</b></label>)}</div><Button className="pink-button" disabled={!complete} onClick={onSave}>Salvar avaliação</Button></section></div>; }

type RecordView = { id: string; title: string; meta?: string; status: string; done?: boolean; onToggle?: () => void };

function AreaDetail({ area, snapshot, assessment, onBack }: { area: LifeArea; snapshot: LifeSnapshot; assessment?: LifeAssessment; onBack: () => void }) {
  const store = useLife();
  const [recordKind, setRecordKind] = useState<RecordKind | null>(null);
  const score = assessment?.scores[area.id];
  const summary = areaSummary(snapshot, area.id);
  const note = snapshot.areaNotes.find(item => item.areaId === area.id)?.content ?? '';
  const facts = [{ label: 'Projetos ativos', value: summary.activeProjects || 'Sem dados' }, { label: 'Objetivos', value: summary.currentGoals || 'Sem dados' }, { label: 'Ações pendentes', value: summary.openActions || 'Sem dados' }, { label: 'Compromissos', value: summary.upcomingEvents || 'Sem dados' }];
  const goalStatus = { active: 'Em movimento', paused: 'Pausado', achieved: 'Alcançado' } as const;
  const projectStatus = { active: 'Em movimento', paused: 'Pausado', complete: 'Concluído' } as const;
  const records: Record<RecordKind, RecordView[]> = {
    goals: snapshot.goals.filter(goal => goal.areaId === area.id && goal.horizon === 'current').map(goal => ({ id: goal.id, title: goal.title, meta: goal.targetDate && `Prazo: ${formatDay(goal.targetDate)}`, status: goalStatus[goal.status] })),
    futureGoals: snapshot.goals.filter(goal => goal.areaId === area.id && goal.horizon === 'future').map(goal => ({ id: goal.id, title: goal.title, status: 'Ideia futura' })),
    projects: snapshot.projects.filter(project => project.areaId === area.id).map(project => { const { progress } = projectProgress(snapshot, project); return { id: project.id, title: project.title, meta: progress !== undefined ? `${progress}% das ações concluídas` : 'Sem ações planejadas', status: projectStatus[project.status] }; }),
    actions: tasksOfArea(snapshot, area.id).map(task => { const done = isTaskCompleted(task.id, snapshot.executions); return { id: task.id, title: task.title, meta: formatDue(task), status: done ? 'Concluída' : 'Em aberto', done, onToggle: () => store.toggleTaskCompletion(task.id) }; }),
    commitments: snapshot.events.filter(event => event.areaId === area.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(event => ({ id: event.id, title: event.title, meta: `${formatDay(event.startsAt)} · ${formatTime(event.startsAt)}`, status: eventStatusLabel[event.status] }))
  };
  const save = (kind: RecordKind, input: RecordInput) => {
    if (kind === 'goals' || kind === 'futureGoals') store.addGoal(area.id, input.title, kind === 'goals' ? 'current' : 'future');
    if (kind === 'projects') store.addProject(area.id, input.title);
    if (kind === 'actions') store.addTask({ title: input.title, areaId: area.id, dueAt: input.date ? new Date(`${input.date}T12:00`).toISOString() : undefined, dueHasTime: false });
    if (kind === 'commitments' && input.date) { const startsAt = new Date(input.date); store.addEvent({ title: input.title, areaId: area.id, startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + 60 * 60_000).toISOString() }); }
    setRecordKind(null);
  };
  const activeSection = recordSections.find(section => section.key === recordKind);

  return <><button className="back-link" type="button" onClick={onBack}>← Áreas da Vida</button><div className="area-detail-hero" style={{ '--area-color': area.color } as CSSProperties}><span>{area.icon}</span><div><p className="eyebrow">ÁREA DA VIDA</p><h1>{area.name}</h1><p>{area.description}</p></div><div className="area-score">{score ? <><b>{score}</b><span>/10</span></> : <span>Sem avaliação</span>}<small>{assessment ? assessment.period : 'Registre uma avaliação semestral'}</small></div></div><section className="indicator-strip">{facts.map(fact => <Card key={fact.label}><b>{fact.value}</b><span>{fact.label}</span></Card>)}{summary.totalActions > 0 && <Card><b>{Math.round((summary.completedActions / summary.totalActions) * 100)}%</b><span>Execução</span></Card>}</section><section className="detail-grid"><Card className="diagnosis-card"><span className="label">COMO ESTOU CUIDANDO DESTA ÁREA?</span><div className={`diagnostic ${area.diagnostic}`}>{diagnostics[area.diagnostic].icon} {diagnostics[area.diagnostic].label}</div><div className="diagnostic-options">{(Object.keys(diagnostics) as AreaDiagnostic[]).map(key => <button type="button" key={key} className={area.diagnostic === key ? 'selected' : ''} onClick={() => store.setAreaDiagnostic(area.id, key)}>{diagnostics[key].label}</button>)}</div><p>Dados objetivos aparecem aqui conforme você registra objetivos, projetos, ações e compromissos nesta área.</p></Card><Card className="notes-card"><span className="label">MEU ESPAÇO</span><h2>Notas da área</h2><textarea value={note} onChange={event => store.setAreaNote(area.id, event.target.value)} placeholder="O que está acontecendo, o que você quer construir ou lembrar?" /><small>Este caderno pertence somente a {area.name}.</small></Card></section><section className="area-records">{recordSections.map(section => <RecordSection key={section.key} title={section.title} text={section.text} records={records[section.key]} onAdd={() => setRecordKind(section.key)} />)}</section>{activeSection && <RecordDialog kind={activeSection.key} singular={activeSection.singular} onClose={() => setRecordKind(null)} onSave={input => save(activeSection.key, input)} />}</>;
}

function RecordSection({ title, text, records, onAdd }: { title: string; text: string; records: RecordView[]; onAdd: () => void }) { return <Card className="record-section"><div><span className="label">{title.toUpperCase()}</span><h2>{title}</h2><p>{text}</p></div><Button onClick={onAdd}>Adicionar ＋</Button><div className="record-list">{records.length ? records.map(record => <div key={record.id} className={record.done ? 'is-done' : ''}>{record.onToggle && <button type="button" className="task-check record-check" aria-label={`${record.done ? 'Reabrir' : 'Concluir'} ${record.title}`} aria-pressed={record.done} onClick={record.onToggle}>{record.done ? '✓' : ''}</button>}<b>{record.title}</b>{record.meta && <small>{record.meta}</small>}<span>{record.status}</span></div>) : <p className="record-empty">Ainda não há registros. Quando existir, esta seção será atualizada automaticamente.</p>}</div></Card>; }

type RecordInput = { title: string; date?: string };
function RecordDialog({ kind, singular, onClose, onSave }: { kind: RecordKind; singular: string; onClose: () => void; onSave: (input: RecordInput) => void }) {
  const [title, setTitle] = useState(''); const [date, setDate] = useState('');
  const needsDate = kind === 'commitments';
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim() && (!needsDate || date)) onSave({ title: title.trim(), date: date || undefined }); };
  return <div className="dialog-backdrop" onMouseDown={onClose} role="presentation"><form className="capture-dialog" onSubmit={submit} onMouseDown={event => event.stopPropagation()}><button type="button" className="close" onClick={onClose}>×</button><span className="label">NOVA ENTRADA</span><h2>Adicionar {singular}</h2><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Escreva um título" aria-label="Título" />{kind === 'actions' && <label className="dialog-field"><span>Prazo, se houver</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>}{needsDate && <label className="dialog-field"><span>Quando acontece</span><input type="datetime-local" required value={date} onChange={event => setDate(event.target.value)} /></label>}{kind === 'actions' && <p>Esta ação entra na sua lista de Execução e aparece na Central.</p>}{needsDate && <p>Este compromisso aparece na Agenda.</p>}<Button className="pink-button" type="submit">Salvar</Button></form></div>;
}

function semesterLabel(date: Date) { return `${date.getMonth() < 6 ? '1º' : '2º'} semestre de ${date.getFullYear()}`; }
