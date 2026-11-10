import { BarChart3, Flag, Play, RotateCcw, Timer } from 'lucide-react';
import { useState } from 'react';
import { cisLabels } from '../domain/catalog';
import type { CisInstrument, CisRecord } from '../domain/models';
import { behaviorMetrics, formatMinutes, getMandsSAIndex, percent, periodRange, type PeriodKey } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Card } from '../components/Card';
import { Icon } from '../components/icons';
import { EmptyState, PageIntro, ProgressBar, ProgressRing, SectionHeading, Tabs } from '../components/ui';

/** Mands S.A. report (last 30 days) and the CIS instruments, each in its own tab. */
export function EvolutionPage() {
  const { snapshot } = useLife();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('30d');
  const period = periodRange(periodKey);
  const index = getMandsSAIndex(snapshot, new Date(period.end.getTime() - 1), period.days);
  const metrics = behaviorMetrics(snapshot, period);
  const cards = [
    { key: 'initiation', label: 'Taxa de Iniciação', icon: Play, value: metrics.initiation, detail: metrics.planned ? `${metrics.started} de ${metrics.planned} entregas planejadas foram iniciadas` : 'Escolha entregas no Início para medir.' },
    { key: 'focus', label: 'Taxa de Foco', icon: Timer, value: metrics.focus, detail: metrics.sessions ? `${formatMinutes(metrics.focusedMinutes)} de ${formatMinutes(metrics.plannedMinutes)} planejados em ${metrics.sessions} ${metrics.sessions === 1 ? 'sessão' : 'sessões'}` : 'Conclua uma sessão no Modo Foco para medir.' },
    { key: 'resumption', label: 'Taxa de Retomada', icon: RotateCcw, value: metrics.resumption, detail: metrics.pauses ? `${metrics.resumes} ${metrics.resumes === 1 ? 'retomada' : 'retomadas'} em ${metrics.pauses} ${metrics.pauses === 1 ? 'pausa' : 'pausas'}` : 'Nenhuma pausa registrada no período.' },
    { key: 'finish', label: 'Taxa de Finalização', icon: Flag, value: metrics.finish, detail: metrics.planned ? `${metrics.finished} de ${metrics.planned} entregas concluídas` : 'Sem entregas planejadas no período.' }
  ];
  const instruments = (Object.keys(cisLabels) as CisInstrument[]).filter(key => snapshot.cisRecords.some(record => record.instrument === key));
  const [tab, setTab] = useState<CisInstrument>(instruments[0] ?? 'maas');
  const records = snapshot.cisRecords.filter(record => record.instrument === tab);

  return <>
    <PageIntro eyebrow="EVOLUÇÃO" title="Relatório Mands S.A." text="Comportamento real de execução, calculado só com o que foi registrado. Sem registros, a métrica mostra um ponto e não um número inventado." />
    <Tabs label="Período" value={periodKey} onChange={setPeriodKey} options={[{ key: '7d', label: 'Últimos 7 dias' }, { key: '30d', label: 'Últimos 30 dias' }, { key: '90d', label: 'Últimos 90 dias' }, { key: 'month', label: 'Mês fechado' }]} />
    <p className="period-label">{period.label}{metrics.unblocks ? ` · ${metrics.unblocks} ${metrics.unblocks === 1 ? 'vez' : 'vezes'} usou Preciso Começar` : ''}</p>
    <section className="behavior-grid">{cards.map(card => <Card key={card.key} className="behavior-card">
      <div className="behavior-head"><span className="behavior-icon"><Icon as={card.icon} size={18} /></span><span className="label">{card.label.toUpperCase()}</span></div>
      <b className="behavior-value">{card.value === undefined ? '·' : `${percent(card.value)}%`}</b>
      <ProgressBar value={card.value} label={card.label} />
      <p className="support">{card.detail}</p>
    </Card>)}</section>
    <SectionHeading label="CONSISTÊNCIA POR PILAR" title={`Índice Mands S.A. · ${period.label.toLowerCase()}`} />
    <section className="index-hero">
      <Card tone="noble" className="index-overall"><span className="label">ÍNDICE GERAL</span><ProgressRing value={index.overall} size={150} stroke={13} label={`${period.days} dias`} /><p>Média dos pilares que já têm registros.</p></Card>
      <div className="index-grid">{index.pillars.map(pillar => <Card key={pillar.key} className="index-card">
        <div className="card-head"><span className="label">{pillar.label.toUpperCase()}</span><b>{pillar.value === undefined ? '·' : `${percent(pillar.value)}%`}</b></div>
        <ProgressBar value={pillar.value} label={pillar.label} />
        <ul>{pillar.parts.length ? pillar.parts.map(part => <li key={part.label}>{part.label}: {part.detail}</li>) : <li>Ainda sem registros neste pilar.</li>}</ul>
      </Card>)}</div>
    </section>

    <SectionHeading label="MÉTODO CIS · INSTRUMENTOS PRESERVADOS" title="Histórico dos diagnósticos" />
    <p className="fine-print">Cada instrumento tem as próprias dimensões e escala. Eles ficam em abas separadas e nunca são somados entre si.</p>
    {instruments.length ? <>
      <Tabs label="Instrumento do CIS" value={tab} onChange={setTab} options={instruments.map(key => ({ key, label: cisLabels[key].tab }))} />
      {records.map(record => <CisCard key={record.id} record={record} />)}
    </> : <Card><EmptyState icon={BarChart3}>Nenhum instrumento do CIS registrado.</EmptyState></Card>}
  </>;
}

function CisCard({ record }: { record: CisRecord }) {
  const scored = record.scores.filter(item => item.score !== null);
  const lowest = Math.min(...scored.map(item => item.score!));
  return <Card className="cis-card">
    <div className="card-head"><div><span className="label">{record.source.toUpperCase()}</span><h2>{record.title}</h2></div>{record.totalPoints !== undefined && <b className="big-number">{record.totalPoints} pts</b>}</div>
    <ul className="cis-scores">{record.scores.map(item => <li key={item.label} className={item.score !== null && item.score === lowest ? 'is-low' : ''}>
      <span>{item.label}</span>
      <span className="cis-bar">{item.score === null ? <small>Não se aplica</small> : <ProgressBar value={item.score / record.scale} color={item.score <= 3 ? 'var(--magenta)' : item.score >= 8 ? 'var(--green)' : undefined} label={item.label} />}</span>
      <b>{item.score ?? '·'}</b>
    </li>)}</ul>
    {record.priorities && <div className="cis-meta"><span className="label">PRIORIDADES ORIGINAIS</span><div className="chip-row">{record.priorities.map((item, position) => <span key={item} className="chip selected">{position + 1}. {item}</span>)}</div></div>}
    {record.bottlenecks && <div className="cis-meta"><span className="label">GARGALOS</span><div className="chip-row">{record.bottlenecks.map(item => <span key={item} className="chip chip-warn">{item}</span>)}</div></div>}
    {record.instrument === 'eval55' && <p className="fine-print">Só os dois gargalos foram trazidos deste instrumento. As demais respostas entram aqui quando você registrar.</p>}
    <p className="fine-print"><Icon as={BarChart3} size={12} /> Registro histórico imutável. Escala de 0 a {record.scale}.</p>
  </Card>;
}
