import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { cisLabels } from '../domain/catalog';
import type { CisInstrument, CisRecord } from '../domain/models';
import { getMandsSAIndex, percent } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Card } from '../components/Card';
import { Icon } from '../components/icons';
import { EmptyState, PageIntro, ProgressBar, ProgressRing, SectionHeading, Tabs } from '../components/ui';

/** Mands S.A. report (last 30 days) and the CIS instruments, each in its own tab. */
export function EvolutionPage() {
  const { snapshot } = useLife();
  const index = getMandsSAIndex(snapshot);
  const instruments = (Object.keys(cisLabels) as CisInstrument[]).filter(key => snapshot.cisRecords.some(record => record.instrument === key));
  const [tab, setTab] = useState<CisInstrument>(instruments[0] ?? 'maas');
  const records = snapshot.cisRecords.filter(record => record.instrument === tab);

  return <>
    <PageIntro eyebrow="EVOLUÇÃO" title="Relatório Mands S.A." text={`Consistência dos últimos ${index.windowDays} dias, calculada só com o que foi registrado. Sem registros, o pilar mostra um ponto e não um número inventado.`} />
    <section className="index-hero">
      <Card tone="noble" className="index-overall"><span className="label">ÍNDICE GERAL</span><ProgressRing value={index.overall} size={150} stroke={13} label="30 dias" /><p>Média dos pilares que já têm registros.</p></Card>
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
