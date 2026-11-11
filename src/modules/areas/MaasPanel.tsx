import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Radar as RadarIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { areas } from '../../data/areas';
import { useChartColors } from '../../lib/chartColors';
import { formatDay } from '../../lib/dates';
import { useMive } from '../../store/useMive';
import type { AreaId, MaasAssessment } from '../../types';
import { Button, GlassCard, Input, Modal } from '../../ui';

const short: Partial<Record<AreaId, string>> = { 'bem-estar': 'Bem-estar' };
export const maasAverage = (assessment: MaasAssessment) => { const values = Object.values(assessment.scores).filter((value): value is number => typeof value === 'number'); return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined; };

/** Radar MAAS retrátil: recolhido por padrão, notas 1 a 10 com histórico. */
export function MaasPanel() {
  const state = useMive();
  const colors = useChartColors();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const history = [...state.maas].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const latest = history.at(-1);
  const previous = history.at(-2);
  const data = areas.map(area => ({ area: short[area.id] ?? area.name, atual: latest?.scores[area.id] ?? 0, anterior: previous?.scores[area.id] ?? 0 }));

  return <GlassCard className="grid gap-4">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="maas-radar" className="flex min-h-[48px] items-center gap-3 text-left">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rosa text-magenta dark:bg-magenta/15"><RadarIcon size={22} strokeWidth={1.5} /></span>
      <span className="flex-1"><span className="block text-lg font-semibold">{open ? 'Diagnóstico MAAS' : 'Visualizar Diagnóstico MAAS'}</span><span className="block text-sm text-muted">{latest ? `Última avaliação em ${formatDay(latest.date, "d 'de' MMMM")}` : 'Nenhuma avaliação ainda'}</span></span>
      <ChevronDown size={22} strokeWidth={1.75} className={`text-magenta transition ${open ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence initial={false}>{open && <motion.div id="maas-radar" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="h-[340px] w-full" role="img" aria-label="Radar das 12 áreas da vida com notas de 1 a 10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="70%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                <PolarGrid stroke={colors.grid} />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: colors.inkSoft, fontWeight: 500 }} />
                <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={false} axisLine={false} />
                {previous && <Radar name={`Anterior · ${formatDay(previous.date, 'dd/MM/yy')}`} dataKey="anterior" stroke={colors.secondary} strokeDasharray="4 4" strokeWidth={2} fill="none" isAnimationActive={false} />}
                <Radar name={latest ? `Atual · ${formatDay(latest.date, 'dd/MM/yy')}` : 'Atual'} dataKey="atual" stroke={colors.primary} strokeWidth={2} fill={colors.primary} fillOpacity={0.18} dot={{ r: 3, fill: colors.primary }} isAnimationActive={false} />
                <Tooltip formatter={value => Number(value) ? value : 'sem nota'} contentStyle={{ borderRadius: 16, border: '1px solid rgba(207,163,255,0.4)', background: colors.surface, color: colors.ink, fontSize: 13 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {previous && <p className="flex flex-wrap justify-center gap-4 text-xs font-medium text-ink-soft"><span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-magenta" /> Atual</span><span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-lilas" /> Anterior</span></p>}
        </div>
        <div className="grid content-start gap-3">
          <Button onClick={() => setEditing(true)}>Nova avaliação</Button>
          <h3 className="mt-2 text-sm font-semibold uppercase tracking-wider text-muted">Histórico</h3>
          <ul className="grid gap-2">{[...history].reverse().map(item => { const average = maasAverage(item); return <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-line/10 bg-white/50 px-3 py-2 dark:bg-white/5">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{formatDay(item.date, "d 'de' MMMM 'de' yyyy")}</p>{item.note && <p className="truncate text-xs text-muted">{item.note}</p>}</div>
            <span className="text-sm font-bold tabular-nums">{average ? average.toFixed(1).replace('.', ',') : '·'}</span>
            <button type="button" onClick={() => state.deleteMaas(item.id)} aria-label={`Excluir avaliação de ${formatDay(item.date, 'dd/MM/yy')}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta"><Trash2 size={15} strokeWidth={1.75} /></button>
          </li>; })}</ul>
          <table className="sr-only"><caption>Notas da avaliação atual</caption><tbody>{data.map(row => <tr key={row.area}><th>{row.area}</th><td>{row.atual}</td></tr>)}</tbody></table>
        </div>
      </div>
    </motion.div>}</AnimatePresence>
    {editing && <MaasModal base={latest} onClose={() => setEditing(false)} />}
  </GlassCard>;
}

function MaasModal({ base, onClose }: { base?: MaasAssessment; onClose: () => void }) {
  const state = useMive();
  const [scores, setScores] = useState<Partial<Record<AreaId, number>>>(() => ({ ...base?.scores }));
  const [note, setNote] = useState('');
  return <Modal open onClose={onClose} title="Nova avaliação MAAS" eyebrow="Áreas da Vida" className="sm:max-w-2xl">
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); state.addMaas(scores, note); onClose(); }}>
      <p className="text-sm text-ink-soft">De 1 a 10, quanto cada área está do jeito que você quer hoje? Partimos da avaliação anterior.</p>
      <div className="grid max-h-[46vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">{areas.map(area => { const value = scores[area.id]; return <label key={area.id} className="grid gap-1.5 rounded-2xl border border-line/10 px-3 py-2">
        <span className="flex items-center justify-between text-sm font-semibold"><span className="flex items-center gap-2"><area.icon size={16} strokeWidth={1.5} className="text-magenta" />{area.name}</span><span className="tabular-nums text-magenta">{value ?? '·'}</span></span>
        <input type="range" min={1} max={10} step={1} value={value ?? 5} onChange={event => setScores(current => ({ ...current, [area.id]: Number(event.target.value) }))} className="h-6 accent-magenta" aria-label={`Nota de ${area.name}`} />
      </label>; })}</div>
      <Input label="Observação" value={note} onChange={event => setNote(event.target.value)} placeholder="Opcional · o que mudou" />
      <Button type="submit">Salvar avaliação</Button>
    </form>
  </Modal>;
}
