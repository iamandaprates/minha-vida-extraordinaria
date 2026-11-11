import { Plus, Stethoscope, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { WEIGHT_GOAL } from '../../data/seed';
import { useChartColors } from '../../lib/chartColors';
import { formatDay, todayISO } from '../../lib/dates';
import { daysSince } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import { Button, GlassCard, Input, Modal, Tag, cn } from '../../ui';

export const EXAM_ALERT_DAYS = 180;
const kg = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

export function SaudePanel() {
  return <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><WeightCard /><ExamsCard /></div>;
}

function WeightCard() {
  const state = useMive();
  const [adding, setAdding] = useState(false);
  const colors = useChartColors();
  const entries = state.weights;
  const latest = entries.at(-1);
  const toGoal = latest ? latest.kg - WEIGHT_GOAL.targetKg : undefined;
  const values = [...entries.map(item => item.kg), ...WEIGHT_GOAL.checkpointsKg, WEIGHT_GOAL.targetKg];
  const domain = [Math.floor((Math.min(...values) - 1) / 5) * 5, Math.ceil((Math.max(...values) + 1) / 5) * 5];
  const ticks = Array.from({ length: (domain[1] - domain[0]) / 5 + 1 }, (_, index) => domain[0] + index * 5);
  const data = entries.map(item => ({ date: item.date, label: formatDay(item.date, 'dd/MM'), kg: item.kg }));
  return <GlassCard className="grid gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="eyebrow">Shape dos Sonhos</p><p className="mt-2 text-[32px] font-bold tabular-nums leading-none">{latest ? kg(latest.kg) : 'Sem registro'}</p>
        <p className="mt-2 text-sm text-ink-soft">{toGoal === undefined ? 'Registre o primeiro peso para ver a curva.' : toGoal > 0 ? `Faltam ${kg(toGoal)} para a meta de ${WEIGHT_GOAL.targetKg} kg.` : 'Meta alcançada. Disciplina é liberdade.'}</p></div>
      <Button onClick={() => setAdding(true)}><Plus size={18} strokeWidth={2} /> Registrar peso</Button>
    </div>
    <div className="h-64 w-full" role="img" aria-label={`Gráfico de peso com ${entries.length} registros, marcos em 85 e 70 kg e meta em 65 kg`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 64, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors.muted }} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis domain={domain} ticks={ticks} tick={{ fontSize: 12, fill: colors.muted }} tickLine={false} axisLine={false} width={44} />
          {WEIGHT_GOAL.checkpointsKg.map(value => <ReferenceLine key={value} y={value} stroke="#CFA3FF" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: `Marco ${value}`, position: 'right', fontSize: 11, fill: colors.inkSoft }} />)}
          <ReferenceLine y={WEIGHT_GOAL.targetKg} stroke="#F31991" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: `Meta ${WEIGHT_GOAL.targetKg}`, position: 'right', fontSize: 11, fontWeight: 600, fill: '#F31991' }} />
          <Tooltip cursor={{ stroke: colors.secondary }} contentStyle={{ borderRadius: 16, border: '1px solid rgba(207,163,255,0.4)', background: colors.surface, color: colors.ink, fontSize: 13 }} labelStyle={{ color: colors.muted }} formatter={value => [kg(Number(value)), 'Peso']} />
          <Line type="monotone" dataKey="kg" stroke="#F31991" strokeWidth={2} dot={{ r: 4, fill: '#F31991', stroke: colors.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    {entries.length > 0 && <details><summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-ink-soft">Registros · {entries.length}</summary>
      <ul className="grid gap-1">{[...entries].reverse().map(item => <li key={item.id} className="flex items-center gap-3 text-sm"><span className="flex-1 text-ink-soft">{formatDay(item.date, "d 'de' MMMM 'de' yyyy")}</span><span className="font-semibold tabular-nums">{kg(item.kg)}</span><button type="button" onClick={() => state.deleteWeight(item.id)} aria-label={`Excluir registro de ${formatDay(item.date, 'dd/MM')}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta"><Trash2 size={15} strokeWidth={1.75} /></button></li>)}</ul>
    </details>}
    {adding && <WeightModal onClose={() => setAdding(false)} />}
  </GlassCard>;
}

/** Registro de peso: também usado pelo "+ Registrar" global. */
export function WeightModal({ onClose }: { onClose: () => void }) {
  const state = useMive();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayISO());
  const parsed = Number(value.replace(',', '.'));
  const valid = parsed >= 30 && parsed <= 250;
  return <Modal open onClose={onClose} title="Registrar peso" eyebrow="Saúde">
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); if (!valid) return; state.addWeight(date, Math.round(parsed * 10) / 10); onClose(); }}>
      <div className="grid grid-cols-2 gap-3"><Input label="Peso (kg)" inputMode="decimal" value={value} onChange={event => setValue(event.target.value)} placeholder="78,4" autoFocus /><Input label="Data" type="date" value={date} onChange={event => setDate(event.target.value)} /></div>
      <p className="text-sm text-muted">Um registro por dia: salvar de novo na mesma data substitui o anterior.</p>
      <Button type="submit" disabled={!valid}>Salvar peso</Button>
    </form>
  </Modal>;
}

function ExamsCard() {
  const state = useMive();
  const [name, setName] = useState('');
  return <GlassCard className="grid content-start gap-4">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Stethoscope size={20} strokeWidth={1.5} className="text-magenta" /> Exames preventivos</h2>
    <ul className="grid gap-3">{state.exams.map(exam => {
      const days = daysSince(exam.lastDate);
      const due = days !== undefined && days > EXAM_ALERT_DAYS;
      return <li key={exam.id} className={cn('grid gap-2 rounded-2xl border p-3', due ? 'border-lilas bg-lilas/15' : 'border-line/10 bg-white/50 dark:bg-white/5')}>
        <div className="flex items-center gap-2"><span className="flex-1 font-semibold">{exam.name}</span>
          {days === undefined ? <Tag tone="neutral">Sem data</Tag> : due ? <Tag tone="lilas">Hora de agendar · {days} dias</Tag> : <Tag tone="ciano">Em dia</Tag>}
          <button type="button" onClick={() => state.deleteExam(exam.id)} aria-label={`Remover ${exam.name}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta"><Trash2 size={15} strokeWidth={1.75} /></button>
        </div>
        <label className="flex items-center gap-3 text-sm"><span className="text-ink-soft">Última vez</span><input type="date" value={exam.lastDate ?? ''} max={todayISO()} onChange={event => state.updateExam(exam.id, { lastDate: event.target.value || undefined })} className="h-11 flex-1 rounded-xl border border-line/15 bg-white/80 px-3 font-medium dark:bg-white/5" /></label>
      </li>;
    })}</ul>
    <p className="text-xs text-muted">Depois de {EXAM_ALERT_DAYS} dias, o exame ganha um lembrete suave para agendar.</p>
    <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; state.addExam(name); setName(''); }}>
      <label className="sr-only" htmlFor="novo-exame">Novo exame</label>
      <input id="novo-exame" value={name} onChange={event => setName(event.target.value)} placeholder="Outro exame" className="h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/70 px-4 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" />
      <Button type="submit" variant="secondary" size="icon" aria-label="Adicionar exame" disabled={!name.trim()}><Plus size={18} strokeWidth={2} /></Button>
    </form>
  </GlassCard>;
}
