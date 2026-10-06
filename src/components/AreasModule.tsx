import { useState, type CSSProperties } from 'react';
import { lifeAreas, type LifeAreaSeed } from '../data/areas';
import { computeAreaMetrics, isTaskOverdue, sortAssessments } from '../domain/areaMetrics';
import { formatDateBR, formatDateTimeBR, semesterLabel } from '../domain/dates';
import type { AreaDiagnostic, LifeAssessment } from '../domain/models';
import { areasActions, useAreasData } from '../services/areasStore';
import { AreaRecordDialog, type RecordKind } from './AreaRecordDialog';
import { Button } from './Button';
import { Card } from './Card';

const diagnostics: Record<AreaDiagnostic, { label: string; icon: string }> = { well: { label: 'Estou cuidando bem', icon: '●' }, attention: { label: 'Precisa de atenção', icon: '●' }, critical: { label: 'Precisa de atenção agora', icon: '●' }, unknown: { label: 'Sem percepção registrada', icon: '○' } };
const initialScores = () => Object.fromEntries(lifeAreas.map(area => [area.id, 0]));
const polar = (index: number, radius: number, center = 180) => { const angle = -Math.PI / 2 + (index * Math.PI * 2) / 12; return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius] as const; };
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function AreasModule() {
  const data = useAreasData();
  const [draft, setDraft] = useState<Record<string, number> | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const assessments = sortAssessments(data.assessments);
  const current = assessments.at(-1);
  const viewing = assessments.find(item => item.id === viewingId);
  const selected = lifeAreas.find(area => area.id === selectedId);
  const saveAssessment = () => { if (!draft) return; areasActions.saveAssessment(draft); setDraft(null); };
  if (!data.ready) return <p className="record-empty">Carregando suas áreas</p>;
  if (selected) return <AreaDetail area={selected} assessment={current} onBack={() => setSelectedId(null)} />;
  return <>
    {data.persistenceError && <p className="demo-note" role="alert">{data.persistenceError}</p>}
    <div className="page-intro wrap-actions"><div><span className="eyebrow">ORGANIZAR</span><h1>Áreas da minha vida</h1><p>Uma visão contínua de tudo o que compõe sua vida. A avaliação é semestral, o cuidado acontece todos os dias.</p></div><Button className="pink-button keep-mobile" onClick={() => setDraft(current?.scores ?? initialScores())}>Nova avaliação ＋</Button></div>
    <section className="area-evaluation"><Card className="radar-card"><div className="radar-heading"><div><span className="label">AVALIAÇÃO DA VIDA</span><h2>{current ? current.period : 'Nenhuma avaliação registrada'}</h2><p>{current ? `Última atualização: ${formatDateBR(current.assessedAt)}` : 'Quando estiver pronta, registre a primeira fotografia das suas áreas.'}</p></div>{current && <span className="assessment-tag">ATUAL</span>}</div><Radar scores={current?.scores} /><p className="radar-caption">A teia mostra apenas avaliações salvas. Seus registros diários continuam disponíveis em cada área.</p></Card><Card className="cycle-card"><span className="label">CICLO ATUAL</span><h2>{current?.period ?? 'Aguardando primeira avaliação'}</h2><p>Uma avaliação cria uma fotografia deste semestre. Ela não bloqueia suas ações, objetivos, projetos ou notas do dia a dia.</p><button type="button" className="history-toggle" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}>Histórico de avaliações <span>{historyOpen ? '−' : '+'}</span></button>{historyOpen && <div className="assessment-history">{assessments.length ? assessments.slice().reverse().map((item, index) => <button type="button" key={item.id} onClick={() => setViewingId(item.id)}><b>{item.period}</b><small>Registrada em {formatDateTimeBR(item.assessedAt)}{index === 0 ? ' · Atual' : ''}</small></button>) : <p>Sem avaliações anteriores.</p>}</div>}</Card></section>
    <section className="section-heading"><div><span className="label">ACOMPANHAMENTO CONTÍNUO</span><h2>Suas 12 áreas</h2></div><span className="area-count">12 áreas</span></section>
    <section className="area-grid">{lifeAreas.map(area => {
      const score = current?.scores[area.id]; const diagnostic = data.states.find(item => item.areaId === area.id)?.diagnostic ?? 'unknown'; const metrics = computeAreaMetrics(area.id, data); const cardStyle = { '--area-color': area.color } as CSSProperties;
      return <Card className="area-life-card" key={area.id} onClick={() => setSelectedId(area.id)} role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && setSelectedId(area.id)} style={cardStyle}><div className="area-card-top"><span className="area-symbol">{area.icon}</span>{score ? <b>{score}<small>/10</small></b> : <small>Sem nota</small>}</div><h3>{area.name}</h3><p>{area.description}</p><div className={`diagnostic ${diagnostic}`}><i>{diagnostics[diagnostic].icon}</i>{diagnostics[diagnostic].label}</div><div className="area-facts"><span>{metrics.projectsTotal ? plural(metrics.projectsTotal, 'projeto', 'projetos') : 'Sem projetos'}</span><span>{metrics.goalsTotal ? plural(metrics.goalsTotal, 'objetivo', 'objetivos') : 'Sem objetivos'}</span><span>{metrics.actionsTotal ? plural(metrics.actionsTotal, 'ação', 'ações') : 'Sem ações'}</span></div><button type="button">Entrar na área →</button></Card>;
    })}</section>
    {draft && <AssessmentDialog draft={draft} onChange={(id, score) => setDraft(values => values ? { ...values, [id]: score } : values)} onClose={() => setDraft(null)} onSave={saveAssessment} />}
    {viewing && <AssessmentViewer assessment={viewing} isCurrent={viewing.id === current?.id} onClose={() => setViewingId(null)} />}
  </>;
}

function Radar({ scores }: { scores?: Record<string, number> }) { const rings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; const points = scores ? lifeAreas.map((area, index) => polar(index, ((scores[area.id] ?? 0) / 10) * 125).join(',')).join(' ') : ''; return <div className="radar-wrap"><svg viewBox="0 0 360 360" role="img" aria-label="Teia de avaliação das 12 áreas"><g className="radar-grid">{rings.map(ring => <polygon key={ring} points={lifeAreas.map((_, index) => polar(index, ring * 12.5).join(',')).join(' ')} />)}{lifeAreas.map((_, index) => { const [x, y] = polar(index, 125); return <line key={index} x1="180" y1="180" x2={x} y2={y} />; })}</g>{rings.filter(ring => ring % 2 === 0).map(ring => <text className="radar-scale" key={ring} x="184" y={180 - ring * 12.5 + 4}>{ring}</text>)}{scores ? <polygon className="radar-value" points={points} /> : <circle className="radar-empty" cx="180" cy="180" r="6" />}{lifeAreas.map((area, index) => { const [x, y] = polar(index, 153); return <g key={area.id}><circle cx={x} cy={y} r="4" fill={area.color} /><text className="radar-label" x={x} y={y + (y > 180 ? 13 : -8)} textAnchor="middle">{area.name}</text></g>; })}</svg></div>; }

function AssessmentDialog({ draft, onChange, onClose, onSave }: { draft: Record<string, number>; onChange: (id: string, score: number) => void; onClose: () => void; onSave: () => void }) { const complete = lifeAreas.every(area => draft[area.id] >= 1); return <div className="dialog-backdrop" onMouseDown={onClose} role="presentation"><section className="assessment-dialog" role="dialog" aria-modal="true" aria-label="Nova avaliação" onMouseDown={event => event.stopPropagation()}><button type="button" className="close" onClick={onClose} aria-label="Fechar">×</button><span className="label">NOVA AVALIAÇÃO</span><h2>{semesterLabel(new Date())}</h2><p>Escolha uma nota de 1 a 10 para cada área. A teia é atualizada antes de salvar esta nova fotografia.</p><Radar scores={draft} /><div className="score-controls">{lifeAreas.map(area => <label key={area.id}><span><i style={{ background: area.color }} />{area.name}</span><input type="range" min="0" max="10" value={draft[area.id]} onChange={event => onChange(area.id, Number(event.target.value))} /><b>{draft[area.id] || '·'}</b></label>)}</div><Button className="pink-button" disabled={!complete} onClick={onSave}>Salvar avaliação</Button></section></div>; }

/** Read-only view of one saved assessment. It never writes to the store, so the current assessment cannot change from here. */
function AssessmentViewer({ assessment, isCurrent, onClose }: { assessment: LifeAssessment; isCurrent: boolean; onClose: () => void }) { return <div className="dialog-backdrop" onMouseDown={onClose} role="presentation"><section className="assessment-dialog" role="dialog" aria-modal="true" aria-label={`Avaliação ${assessment.period}`} onMouseDown={event => event.stopPropagation()}><button type="button" className="close" onClick={onClose} aria-label="Fechar">×</button><span className="label">{isCurrent ? 'AVALIAÇÃO ATUAL' : 'AVALIAÇÃO ANTERIOR'}</span><h2>{assessment.period}</h2><p>Registrada em {formatDateTimeBR(assessment.assessedAt)}. Somente leitura: esta visualização não altera a avaliação atual.</p><Radar scores={assessment.scores} /><ul className="score-readonly">{lifeAreas.map(area => <li key={area.id}><span><i style={{ background: area.color }} />{area.name}</span><b>{assessment.scores[area.id] || '·'}</b></li>)}</ul><Button className="pink-button keep-mobile" onClick={onClose}>Fechar</Button></section></div>; }

type Row = { id: string; title: string; details: string[]; badge: string; tone?: 'done' | 'late'; checked?: boolean; onToggle?: () => void };
const sections: Array<{ key: RecordKind; title: string; text: string }> = [{ key: 'goals', title: 'Objetivos', text: 'Resultados que você quer alcançar neste ciclo.' }, { key: 'futureGoals', title: 'Objetivos futuros e ideias', text: 'O que importa guardar, sem precisar executar agora.' }, { key: 'projects', title: 'Projetos', text: 'Construções relacionadas a esta área.' }, { key: 'actions', title: 'Ações', text: 'Movimentos concretos, com prazo quando necessário.' }, { key: 'commitments', title: 'Compromissos', text: 'Eventos e compromissos preparados para a Agenda.' }];
const statusText = { active: 'Em movimento', paused: 'Pausado', done: 'Concluído', complete: 'Concluído' } as const;
const priorityText = { low: 'baixa', normal: 'normal', high: 'alta' } as const;

function AreaDetail({ area, assessment, onBack }: { area: LifeAreaSeed; assessment?: LifeAssessment; onBack: () => void }) {
  const data = useAreasData();
  const [dialog, setDialog] = useState<{ kind: RecordKind; id?: string } | null>(null);
  const score = assessment?.scores[area.id];
  const diagnostic = data.states.find(item => item.areaId === area.id)?.diagnostic ?? 'unknown';
  const note = data.notes.find(item => item.areaId === area.id)?.content ?? '';
  const metrics = computeAreaMetrics(area.id, data);
  const goals = data.goals.filter(item => item.areaId === area.id);
  const projects = data.projects.filter(item => item.areaId === area.id);
  const tasks = data.tasks.filter(item => item.areaId === area.id).sort((a, b) => (a.status === b.status ? (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999') : a.status === 'done' ? 1 : -1));
  const empty = 'Sem dados';
  const facts = [
    { label: 'Projetos ativos', value: metrics.projectsTotal ? metrics.projectsActive : empty },
    { label: 'Objetivos', value: metrics.goalsTotal || empty },
    { label: 'Ações pendentes', value: metrics.actionsTotal ? metrics.actionsPending : empty },
    { label: 'Ações concluídas', value: metrics.actionsTotal ? metrics.actionsDone : empty },
    { label: 'Ações atrasadas', value: metrics.actionsTotal ? metrics.actionsOverdue : empty },
    { label: 'Compromissos', value: metrics.eventsTotal || empty },
    { label: 'Movimentação (7 dias)', value: metrics.recordsTotal ? metrics.recentMovement : empty },
    { label: 'Execução', value: metrics.executionPct === null ? empty : `${metrics.executionPct}%` }
  ];
  const rows: Record<RecordKind, Row[]> = {
    goals: goals.map(item => ({ id: item.id, title: item.title, details: item.targetDate ? [`Prazo: ${formatDateBR(item.targetDate)}`] : [], badge: statusText[item.status], tone: item.status === 'done' ? 'done' : undefined })),
    futureGoals: data.ideas.filter(item => item.areaId === area.id).map(item => ({ id: item.id, title: item.content, details: [], badge: 'Ideia futura' })),
    projects: projects.map(item => ({ id: item.id, title: item.title, details: item.goalId ? [`Objetivo: ${goals.find(goal => goal.id === item.goalId)?.title ?? ''}`] : [], badge: statusText[item.status], tone: item.status === 'complete' ? 'done' : undefined })),
    actions: tasks.map(item => {
      const late = isTaskOverdue(item);
      const details = [item.dueAt && `Prazo: ${formatDateBR(item.dueAt)}`, item.priority && item.priority !== 'normal' && `Prioridade ${priorityText[item.priority]}`, item.goalId && `Objetivo: ${goals.find(goal => goal.id === item.goalId)?.title ?? ''}`, item.projectId && `Projeto: ${projects.find(project => project.id === item.projectId)?.title ?? ''}`, item.completedAt && `Concluída em ${formatDateBR(item.completedAt)}`, item.description].filter((detail): detail is string => Boolean(detail));
      return { id: item.id, title: item.title, details, badge: item.status === 'done' ? 'Concluída' : late ? 'Atrasada' : 'Pendente', tone: item.status === 'done' ? 'done' : late ? 'late' : undefined, checked: item.status === 'done', onToggle: () => areasActions.toggleTask(item.id) };
    }),
    commitments: data.events.filter(item => item.areaId === area.id && item.status !== 'cancelled').sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(item => ({ id: item.id, title: item.title, details: [formatDateTimeBR(item.startsAt)], badge: 'Planejado' }))
  };
  return <>
    <button className="back-link" type="button" onClick={onBack}>← Áreas da Vida</button>
    <div className="area-detail-hero" style={{ '--area-color': area.color } as CSSProperties}><span>{area.icon}</span><div><p className="eyebrow">ÁREA DA VIDA</p><h1>{area.name}</h1><p>{area.description}</p></div><div className="area-score">{score ? <><b>{score}</b><span>/10</span></> : <span>Sem avaliação</span>}<small>{assessment ? assessment.period : 'Registre uma avaliação semestral'}</small></div></div>
    <section className="indicator-strip">{facts.map(fact => <Card key={fact.label}><b>{fact.value}</b><span>{fact.label}</span></Card>)}</section>
    <section className="detail-grid"><Card className="diagnosis-card"><span className="label">COMO ESTOU CUIDANDO DESTA ÁREA?</span><div className={`diagnostic ${diagnostic}`}>{diagnostics[diagnostic].icon} {diagnostics[diagnostic].label}</div><div className="diagnostic-options">{(Object.keys(diagnostics) as AreaDiagnostic[]).map(key => <button type="button" key={key} className={diagnostic === key ? 'selected' : ''} onClick={() => areasActions.setDiagnostic(area.id, key)}>{diagnostics[key].label}</button>)}</div><p>Dados objetivos aparecem aqui conforme você registra objetivos, projetos, ações e compromissos nesta área.</p></Card><Card className="notes-card"><span className="label">MEU ESPAÇO</span><h2>Notas da área</h2><textarea aria-label={`Notas de ${area.name}`} value={note} onChange={event => areasActions.setNote(area.id, event.target.value)} placeholder="O que está acontecendo, o que você quer construir ou lembrar?" /><small>Este caderno pertence somente a {area.name}.</small></Card></section>
    <section className="area-records">{sections.map(section => <RecordSection key={section.key} title={section.title} text={section.text} rows={rows[section.key]} onAdd={() => setDialog({ kind: section.key })} onEdit={id => setDialog({ kind: section.key, id })} />)}</section>
    {dialog && <AreaRecordDialog kind={dialog.kind} area={area} recordId={dialog.id} onClose={() => setDialog(null)} />}
  </>;
}

function RecordSection({ title, text, rows, onAdd, onEdit }: { title: string; text: string; rows: Row[]; onAdd: () => void; onEdit: (id: string) => void }) { return <Card className="record-section"><div><span className="label">{title.toUpperCase()}</span><h2>{title}</h2><p>{text}</p></div><Button onClick={onAdd}>Adicionar ＋</Button><div className="record-list">{rows.length ? rows.map(row => <article className={`record-row ${row.tone === 'done' ? 'is-done' : ''}`} key={row.id}>{row.onToggle && <button type="button" className={`task-check ${row.checked ? 'checked' : ''}`} aria-pressed={row.checked} aria-label={`${row.checked ? 'Reabrir' : 'Concluir'} ${row.title}`} onClick={row.onToggle}>{row.checked ? '✓' : ''}</button>}<div className="record-main"><b>{row.title}</b>{row.details.map(detail => <small key={detail}>{detail}</small>)}</div><span className={row.tone}>{row.badge}</span><button type="button" className="record-edit" aria-label={`Editar ${row.title}`} onClick={() => onEdit(row.id)}>Editar</button></article>) : <p className="record-empty">Ainda não há registros. Quando existir, esta seção será atualizada automaticamente.</p>}</div></Card>; }
