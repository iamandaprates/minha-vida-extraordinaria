import { Activity, HeartPulse, Scale, Stethoscope, Syringe } from 'lucide-react';
import { useState } from 'react';
import { checkupLabels } from '../domain/catalog';
import { fromISODate, toISODate, type CheckupKind } from '../domain/models';
import { CHECKUP_LIMIT_DAYS, daysBetween, formatAgo, formatDay, formatKg, goalProgress, healthMarkers, percent, weightTrend } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './icons';
import { Dialog, EmptyState, Field, ProgressBar, SectionHeading, Tag } from './ui';

const markerKey: Record<CheckupKind, 'lastBloodTestDate' | 'lastMedicalCheckupDate' | 'lastDentalCheckupDate'> = { blood_test: 'lastBloodTestDate', medical: 'lastMedicalCheckupDate', dental: 'lastDentalCheckupDate' };
const markerIcon = { blood_test: Syringe, medical: Stethoscope, dental: HeartPulse } as const;

/** Bio-maintenance and shape tracking. Every date and weight is a HealthMarker fact. */
export function HealthPanel() {
  const { snapshot } = useLife();
  const [checkup, setCheckup] = useState<CheckupKind | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const now = new Date();
  const markers = healthMarkers(snapshot);
  const trend = weightTrend(snapshot);
  const shapeGoal = snapshot.goals.find(goal => goal.measure?.kind === 'weight' && goal.status === 'active');
  const measure = shapeGoal?.measure?.kind === 'weight' ? shapeGoal.measure : undefined;
  const shape = shapeGoal ? goalProgress(snapshot, shapeGoal, now).parts.find(part => part.key === 'measure') : undefined;

  return <>
    <SectionHeading label="BIO-MANUTENÇÃO" title="Cuidado preventivo" />
    <section className="marker-grid">{(Object.keys(checkupLabels) as CheckupKind[]).map(kind => {
      const last = markers[markerKey[kind]];
      const days = last ? daysBetween(fromISODate(last), now) : undefined;
      const late = days !== undefined && days > CHECKUP_LIMIT_DAYS;
      return <Card key={kind} className={`marker-card ${late ? 'is-late' : ''}`}>
        <span className="marker-icon"><Icon as={markerIcon[kind]} size={20} /></span>
        <span className="label">{checkupLabels[kind].short.toUpperCase()}</span>
        <h3>{last ? formatDay(last) : 'Sem registro'}</h3>
        <p>{last ? `Foi ${formatAgo(last, now)} · próximo até ${formatDay(new Date(fromISODate(last).getTime() + CHECKUP_LIMIT_DAYS * 86_400_000).toISOString())}.` : 'Registre a data da última vez para a Mive acompanhar.'}</p>
        {last && <Tag tone={late ? 'care' : 'flow'}>{late ? 'Hora de agendar' : 'Em dia'}</Tag>}
        <Button onClick={() => setCheckup(kind)}>Registrar data</Button>
      </Card>;
    })}</section>
    <p className="fine-print">Quando um cuidado passa de 6 meses, a Central mostra um alerta preventivo automaticamente.</p>

    <SectionHeading label={measure ? `SHAPE · META ${formatKg(measure.targetKg).toUpperCase()}` : 'SHAPE'} title={measure ? `Marcos: ${formatKg(measure.startKg)} → ${measure.checkpointsKg.map(formatKg).join(' → ')} → ${formatKg(measure.targetKg)}` : 'Evolução do corpo'} action={<Button variant="primary" onClick={() => setWeightOpen(true)}><Icon as={Scale} size={16} /> Registrar peso</Button>} />
    <Card className="shape-card">
      {trend.latest ? <>
        <div className="shape-head">
          <div><span className="label">PESO ATUAL</span><b>{formatKg(trend.latest.valueKg!)}</b><small>{formatDay(trend.latest.date)}</small></div>
          <div><span className="label">DESDE O PRIMEIRO REGISTRO</span><b>{!trend.changeKg ? '·' : `${trend.changeKg > 0 ? '+' : ''}${trend.changeKg.toLocaleString('pt-BR')} kg`}</b><small>{trend.first ? formatDay(trend.first.date) : ''}</small></div>
          {measure && <div><span className="label">META · {formatKg(measure.targetKg).toUpperCase()}</span><b>{shape ? `${percent(shape.value)}%` : '·'}</b><small>{shape?.detail}</small></div>}
        </div>
        {shape && <ProgressBar value={shape.value} color="var(--green)" label="Caminho até a meta de peso" />}
        <WeightChart points={trend.history.map(item => ({ date: item.date, value: item.valueKg! }))} lines={measure ? [...measure.checkpointsKg, measure.targetKg] : []} />
        <ul className="weight-history">{trend.history.slice().reverse().slice(0, 6).map(item => <li key={item.id}><span>{formatDay(item.date)}</span><b>{formatKg(item.valueKg!)}</b>{item.note && <small>{item.note}</small>}</li>)}</ul>
      </> : <EmptyState icon={Activity}>Registre o peso de hoje. Meta: 65 kg. Cada número é só informação.</EmptyState>}
    </Card>
    {checkup && <CheckupDialog kind={checkup} onClose={() => setCheckup(null)} />}
    {weightOpen && <WeightDialog onClose={() => setWeightOpen(false)} />}
  </>;
}

function WeightChart({ points, lines }: { points: { date: string; value: number }[]; lines: number[] }) {
  if (points.length < 2) return null;
  const width = 560; const height = 160; const pad = 20;
  const values = points.map(point => point.value).concat(lines);
  const min = Math.min(...values) - 0.5; const max = Math.max(...values) + 0.5;
  const x = (index: number) => pad + (index * (width - pad * 2)) / (points.length - 1);
  const y = (value: number) => pad + ((max - value) * (height - pad * 2)) / (max - min);
  return <svg className="weight-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do peso">
    {lines.map(kg => <g key={kg}><line className="target-line" x1={pad} x2={width - pad} y1={y(kg)} y2={y(kg)} /><text className="target-label" x={width - pad} y={y(kg) - 6} textAnchor="end">{kg} kg</text></g>)}
    <polyline className="weight-line" points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')} />
    {points.map((point, index) => <circle key={point.date + index} className="weight-point" cx={x(index)} cy={y(point.value)} r={index === points.length - 1 ? 5 : 3.5} />)}
  </svg>;
}

function CheckupDialog({ kind, onClose }: { kind: CheckupKind; onClose: () => void }) {
  const { recordHealthMarker } = useLife();
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  return <Dialog eyebrow="EXAME PREVENTIVO" title={checkupLabels[kind].title} onClose={onClose} onSubmit={() => { if (date) { recordHealthMarker(kind, date, undefined, note); onClose(); } }} submitLabel="Registrar">
    <Field label="Quando aconteceu"><input type="date" value={date} max={toISODate(new Date())} onChange={event => setDate(event.target.value)} /></Field>
    <Field label="Observação"><input value={note} onChange={event => setNote(event.target.value)} placeholder="Opcional" /></Field>
  </Dialog>;
}

export function WeightDialog({ onClose }: { onClose: () => void }) {
  const { recordHealthMarker } = useLife();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const kg = Number(value.replace(',', '.'));
  const valid = Number.isFinite(kg) && kg > 20 && kg < 300;
  return <Dialog eyebrow="REGISTRO DE PESO · META 65 KG" title="Registrar peso" onClose={onClose} onSubmit={() => { if (valid) { recordHealthMarker('weight', date, kg, note); onClose(); } }} submitLabel="Registrar">
    <div className="field-row"><Field label="Peso em kg"><input autoFocus inputMode="decimal" value={value} onChange={event => setValue(event.target.value)} placeholder="Ex.: 84,6" /></Field><Field label="Data"><input type="date" value={date} max={toISODate(new Date())} onChange={event => setDate(event.target.value)} /></Field></div>
    <Field label="Como você se sente?"><input value={note} onChange={event => setNote(event.target.value)} placeholder="Opcional" /></Field>
    <p className="fine-print">Cada registro é informação, não julgamento.</p>
  </Dialog>;
}
