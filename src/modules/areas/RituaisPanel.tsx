import { addDays } from 'date-fns';
import { CalendarCheck, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { formatDay, fromISODate, todayISO, toISODate } from '../../lib/dates';
import { daysSince } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import { Button, GlassCard, Tag, cn } from '../../ui';

/** Rituais estéticos com intervalo de ciclo e "próxima data". */
export function RituaisPanel() {
  const state = useMive();
  const [name, setName] = useState('');
  const [cycle, setCycle] = useState('30');
  return <GlassCard className="grid gap-4">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck size={20} strokeWidth={1.5} className="text-magenta" /> Rituais de imagem</h2>
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{state.rituals.map(ritual => {
      const next = ritual.lastDate ? toISODate(addDays(fromISODate(ritual.lastDate), ritual.intervalDays)) : undefined;
      const until = next ? -(daysSince(next) ?? 0) : undefined;
      return <li key={ritual.id} className={cn('grid gap-3 rounded-2xl border p-4', until !== undefined && until <= 0 ? 'border-lilas bg-lilas/15' : 'border-line/10 bg-white/50 dark:bg-white/5')}>
        <div className="flex items-start gap-2"><div className="flex-1"><p className="font-semibold">{ritual.name}</p><p className="text-xs text-muted">A cada {ritual.intervalDays} dias</p></div>
          {until === undefined ? <Tag>Sem data</Tag> : until <= 0 ? <Tag tone="lilas">Hora de agendar</Tag> : <Tag tone="ciano">Em {until} {until === 1 ? 'dia' : 'dias'}</Tag>}</div>
        <p className="text-sm text-ink-soft">{next ? <>Próxima data: <strong className="font-semibold text-ink">{formatDay(next, "d 'de' MMMM")}</strong></> : 'Registre a última vez para calcular a próxima.'}</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs font-semibold">Última vez<input type="date" value={ritual.lastDate ?? ''} max={todayISO()} onChange={event => state.updateRitual(ritual.id, { lastDate: event.target.value || undefined })} className="h-11 rounded-xl border border-line/15 bg-white/80 px-2 text-sm font-medium dark:bg-white/5" /></label>
          <label className="grid gap-1 text-xs font-semibold">Ciclo (dias)<input type="number" min={1} value={ritual.intervalDays} onChange={event => state.updateRitual(ritual.id, { intervalDays: Math.max(1, Number(event.target.value) || 1) })} className="h-11 rounded-xl border border-line/15 bg-white/80 px-2 text-sm font-medium dark:bg-white/5" /></label>
        </div>
        <div className="flex gap-2"><Button variant="secondary" size="sm" className="flex-1" onClick={() => state.updateRitual(ritual.id, { lastDate: todayISO() })}>Fiz hoje</Button><button type="button" onClick={() => state.deleteRitual(ritual.id)} aria-label={`Remover ${ritual.name}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta"><Trash2 size={15} strokeWidth={1.75} /></button></div>
      </li>;
    })}</ul>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; state.addRitual(name, Math.max(1, Number(cycle) || 30)); setName(''); }}>
      <label className="sr-only" htmlFor="novo-ritual">Novo ritual</label>
      <input id="novo-ritual" value={name} onChange={event => setName(event.target.value)} placeholder="Novo ritual · ex.: Sobrancelha" className="h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/70 px-4 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" />
      <label className="sr-only" htmlFor="ciclo-ritual">Ciclo em dias</label>
      <input id="ciclo-ritual" type="number" min={1} value={cycle} onChange={event => setCycle(event.target.value)} className="h-11 w-20 rounded-2xl border border-line/15 bg-white/70 px-3 text-sm font-medium dark:bg-white/5" />
      <Button type="submit" variant="secondary" size="icon" aria-label="Adicionar ritual" disabled={!name.trim()}><Plus size={18} strokeWidth={2} /></Button>
    </form>
  </GlassCard>;
}
