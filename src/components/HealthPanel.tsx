import { useState } from 'react';
import { checkupLabels } from '../domain/catalog';
import { fromISODate, toISODate, type CheckupKind } from '../domain/models';
import { CHECKUP_LIMIT_DAYS, daysBetween, formatAgo, formatDay, formatKg, goalProgress, healthMarkers, percent, weightTrend } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { Dialog, EmptyState, Field, ProgressBar, SectionHeading, Tag } from './ui';

const markerKey: Record<CheckupKind, 'lastBloodTestDate' | 'lastMedicalCheckupDate' | 'lastDentalCheckupDate'> = { blood_test: 'lastBloodTestDate', medical: 'lastMedicalCheckupDate', dental: 'lastDentalCheckupDate' };

/** Bio-maintenance and shape tracking. Lives inside the Saúde area. */
export function HealthPanel() {
  const { snapshot } = useLife();
  const [checkup, setCheckup] = useState<CheckupKind | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const now = new Date();
  const markers = healthMarkers(snapshot);
  const trend = weightTrend(snapshot);
  const shapeGoal = snapshot.goals.find(goal => goal.measure?.kind === 'weight' && goal.status === 'active');
  const target = shapeGoal?.measure?.targetKg;
  const shape = shapeGoal ? goalProgress(snapshot, shapeGoal, now).parts.find(part => part.key === 'measure') : undefined;

  return <>
    <SectionHeading label="BIO-MAINTENANCE" title="Cuidado preventivo" />
    <section className="marker-grid">{(Object.keys(checkupLabels) as CheckupKind[]).map(kind => {
      const last = markers[markerKey[kind]];
      const days = last ? daysBetween(fromISODate(last), now) : undefined;
      const late = days !== undefined && days > CHECKUP_LIMIT_DAYS;
      return <Card key={kind} className={`marker-card ${late ? 'is-late' : ''}`}>
        <span className="label">{checkupLabels[kind].short.toUpperCase()}</span>
        <h3>{last ? formatDay(last) : 'Sem registro'}</h3>
        <p>{last ? `Foi ${formatAgo(last, now)}.` : 'Registre a data da última vez para acompanhar.'}</p>
        {last && <Tag tone={late ? 'care' : 'flow'}>{late ? 'Hora de agendar' : 'Em dia'}</Tag>}
        <Button onClick={() => setCheckup(kind)}>Registrar {late || !last ? 'data' : 'novo'}</Button>
      </Card>;
    })}</section>
    <p className="fine-print">Quando um cuidado passa de 6 meses, a Central mostra um sinal de atenção automaticamente.</p>

    <SectionHeading label="SHAPE" title={target ? `Rumo aos ${formatKg(target)}` : 'Evolução do corpo'} action={<Button variant="primary" onClick={() => setWeightOpen(true)}>Registrar peso</Button>} />
    <Card className="shape-card">
      {trend.latest ? <>
        <div className="shape-head">
          <div><span className="label">PESO ATUAL</span><b>{formatKg(trend.latest.weightKg)}</b><small>{formatDay(trend.latest.date)}</small></div>
          <div><span className="label">DESDE O INÍCIO</span><b>{trend.changeKg === undefined || trend.changeKg === 0 ? '·' : `${trend.changeKg > 0 ? '+' : ''}${trend.changeKg.toLocaleString('pt-BR')} kg`}</b><small>{trend.first ? `Primeiro registro ${formatDay(trend.first.date).toLowerCase()}` : ''}</small></div>
          {target && <div><span className="label">CAMINHO PERCORRIDO</span><b>{shape ? `${percent(shape.value)}%` : '·'}</b><small>Meta {formatKg(target)}</small></div>}
        </div>
        {shape && <ProgressBar value={shape.value} label="Caminho até a meta de peso" />}
        <WeightChart points={trend.history.map(item => ({ date: item.date, value: item.weightKg }))} target={target} />
        <ul className="weight-history">{trend.history.slice().reverse().slice(0, 6).map(item => <li key={item.id}><span>{formatDay(item.date)}</span><b>{formatKg(item.weightKg)}</b>{item.note && <small>{item.note}</small>}</li>)}</ul>
      </> : <EmptyState icon="◒">Seu primeiro registro vira o ponto de partida. Sem cobranças: cada número é só informação.</EmptyState>}
    </Card>

    {checkup && <CheckupDialog kind={checkup} onClose={() => setCheckup(null)} />}
    {weightOpen && <WeightDialog onClose={() => setWeightOpen(false)} />}
  </>;
}

function WeightChart({ points, target }: { points: { date: string; value: number }[]; target?: number }) {
  if (points.length < 2) return null;
  const width = 560; const height = 150; const pad = 18;
  const values = points.map(point => point.value).concat(target ? [target] : []);
  const min = Math.min(...values) - 0.5; const max = Math.max(...values) + 0.5;
  const x = (index: number) => pad + (index * (width - pad * 2)) / (points.length - 1);
  const y = (value: number) => pad + ((max - value) * (height - pad * 2)) / (max - min);
  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  return <svg className="weight-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do peso">
    {target && <><line className="target-line" x1={pad} x2={width - pad} y1={y(target)} y2={y(target)} /><text className="target-label" x={width - pad} y={y(target) - 6} textAnchor="end">meta {target} kg</text></>}
    <polyline className="weight-line" points={line} />
    {points.map((point, index) => <circle key={point.date + index} className="weight-point" cx={x(index)} cy={y(point.value)} r={index === points.length - 1 ? 5 : 3.5} />)}
  </svg>;
}

function CheckupDialog({ kind, onClose }: { kind: CheckupKind; onClose: () => void }) {
  const { recordCheckup } = useLife();
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  return <Dialog eyebrow="REGISTRAR CUIDADO" title={checkupLabels[kind].title} onClose={onClose} onSubmit={() => { if (date) { recordCheckup(kind, date, note); onClose(); } }} submitLabel="Registrar">
    <Field label="Quando aconteceu"><input type="date" value={date} max={toISODate(new Date())} onChange={event => setDate(event.target.value)} /></Field>
    <Field label="Observação"><input value={note} onChange={event => setNote(event.target.value)} placeholder="Opcional" /></Field>
  </Dialog>;
}

function WeightDialog({ onClose }: { onClose: () => void }) {
  const { recordWeight } = useLife();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const kg = Number(value.replace(',', '.'));
  const valid = Number.isFinite(kg) && kg > 20 && kg < 300;
  return <Dialog eyebrow="SHAPE" title="Registrar peso" onClose={onClose} onSubmit={() => { if (valid) { recordWeight(kg, date, note); onClose(); } }} submitLabel="Registrar">
    <div className="field-row"><Field label="Peso em kg"><input autoFocus inputMode="decimal" value={value} onChange={event => setValue(event.target.value)} placeholder="Ex.: 70,4" /></Field><Field label="Data"><input type="date" value={date} max={toISODate(new Date())} onChange={event => setDate(event.target.value)} /></Field></div>
    <Field label="Como você se sente?"><input value={note} onChange={event => setNote(event.target.value)} placeholder="Opcional" /></Field>
    <p className="fine-print">Cada registro é informação, não julgamento.</p>
  </Dialog>;
}
