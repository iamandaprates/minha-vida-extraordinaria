import { CalendarDays, Check, Crown, Plus, Timer, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { greeting, firstName } from '../../lib/greeting';
import { blocksOn, deliveriesOf } from '../../lib/selectors';
import { formatDay, todayISO } from '../../lib/dates';
import { useFocus } from '../../store/useFocus';
import { useMive } from '../../store/useMive';
import type { DeliveryRole, Task } from '../../types';
import { Button, GlassCard, ProgressRing, cn } from '../../ui';
import { Page } from '../GuidePage';
import { DeliveryPicker } from './DeliveryPicker';
import { FocusTimer } from './FocusTimer';
import { Unblock } from './Unblock';

const phrases = ['Disciplina é liberdade.', 'Execução hoje, resultado amanhã.', 'Feito é melhor que perfeito.', 'Um bloco de cada vez.', 'Você não precisa de vontade, precisa de começo.', 'Pequeno e todo dia vence grande e às vezes.', 'Sua vida extraordinária é construída nas terças-feiras comuns.'];
const phraseOfDay = () => phrases[Math.floor(Date.now() / 86_400_000) % phrases.length];

export function InicioPage() {
  const state = useMive();
  const name = firstName(state.profile?.name);
  const deliveries = deliveriesOf(state);
  const [picker, setPicker] = useState<DeliveryRole | null>(null);
  const [unblock, setUnblock] = useState(false);
  const today = todayISO();
  const agenda = blocksOn(state, today);

  return <Page>
    <header className="mb-8">
      <p className="eyebrow">{formatDay(new Date())}</p>
      <p className="mt-3 text-xl font-medium text-ink-soft sm:text-2xl">{greeting()}, <span className="font-bold text-ink">{name || 'você'}</span>!</p>
      <h1 className="mt-1 text-[40px] leading-[1.05] sm:text-[56px]">Vamos executar?</h1>
    </header>

    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <GlassCard className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="eyebrow">Regra das 3 entregas</p><h2 className="mt-1 text-2xl">Entregas de hoje</h2></div>
          <ProgressRing value={deliveries.all.length ? deliveries.done / 3 : 0} size={92} stroke={9} label={`${deliveries.done} de 3 entregas`}><span className="text-xl font-bold">{deliveries.done}/3</span></ProgressRing>
        </div>
        <ul className="grid gap-3">
          {deliveries.magna ? <DeliveryRow task={deliveries.magna} role="magna" /> : <EmptySlot role="magna" onPick={() => setPicker('magna')} />}
          {deliveries.secundarias.map(task => <DeliveryRow key={task.id} task={task} role="secundaria" />)}
          {Array.from({ length: 2 - deliveries.secundarias.length }, (_, index) => <EmptySlot key={index} role="secundaria" onPick={() => setPicker('secundaria')} />)}
        </ul>
        <div className="flex flex-wrap items-center gap-3 border-t border-line/10 pt-4">
          <Button size="lg" onClick={() => setUnblock(true)}><Zap size={20} strokeWidth={1.75} /> Preciso Começar</Button>
          <p className="min-w-[180px] flex-1 text-sm text-ink-soft">Travou? Diga o motivo e a Mive te põe em movimento agora.</p>
        </div>
      </GlassCard>
      <FocusTimer />
    </div>

    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <GlassCard className="grid content-start gap-4">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={20} strokeWidth={1.75} className="text-magenta" /><h2 className="text-lg">Agenda de hoje</h2></div><Link to="/agenda" className="text-sm font-semibold text-magenta">Ver agenda →</Link></div>
        {agenda.length ? <ol className="grid gap-2">{agenda.slice(0, 5).map(block => <li key={block.id} className="flex items-center gap-3"><span className="w-12 text-sm font-semibold tabular-nums text-muted">{block.start}</span><span className={cn('h-2.5 w-2.5 rounded-full', block.doneAt ? 'bg-magenta' : 'border-2 border-magenta')} /><span className={cn('flex-1 font-medium', block.doneAt && 'text-muted line-through decoration-magenta/50')}>{block.title}</span></li>)}</ol>
          : <p className="text-ink-soft">Nenhum bloco hoje. Que tal reservar o horário da sua Prioridade Magna?</p>}
      </GlassCard>
      <GlassCard tone="rosa" className="relative grid content-center overflow-hidden">
        <p className="eyebrow">Frase do dia</p>
        <p className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{phraseOfDay()}</p>
        <img src="/logo.png" alt="" className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-auto opacity-15" />
      </GlassCard>
    </div>

    {picker && <DeliveryPicker open onClose={() => setPicker(null)} initialRole={picker} />}
    <Unblock open={unblock} onClose={() => setUnblock(false)} />
  </Page>;
}

function DeliveryRow({ task, role }: { task: Task; role: DeliveryRole }) {
  const { completeTask, reopenTask, unplanDelivery, projects } = useMive();
  const start = useFocus(state => state.start);
  const busy = useFocus(state => state.status !== 'idle');
  const done = Boolean(task.completedAt);
  const project = projects.find(item => item.id === task.projectId)?.name;
  const magna = role === 'magna';
  return <li className={cn('flex items-center gap-3 rounded-3xl border p-3 sm:p-4', magna ? 'border-transparent bg-grad-magenta text-white shadow-magenta' : 'border-line/10 bg-white/50 dark:bg-white/5')}>
    <button type="button" onClick={() => done ? reopenTask(task.id) : completeTask(task.id)} aria-pressed={done} aria-label={`${done ? 'Reabrir' : 'Concluir'} ${task.title}`} className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 transition', magna ? 'border-white/80' : 'border-magenta/60', done && (magna ? 'bg-white text-magenta' : 'border-magenta bg-magenta text-white'))}>{done && <Check size={20} strokeWidth={2.5} />}</button>
    <div className="min-w-0 flex-1">
      <p className={cn('flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em]', magna ? 'text-white/85' : 'text-muted')}>{magna && <Crown size={12} strokeWidth={2} />}{magna ? 'Prioridade Magna' : 'Secundária'}</p>
      <p className={cn('font-semibold', magna ? 'text-lg' : 'text-base', done && 'line-through opacity-75')}>{task.title}</p>
      <p className={cn('text-sm', magna ? 'text-white/85' : 'text-muted')}>{[project, task.estimateMin && `${task.estimateMin} min`].filter(Boolean).join(' · ') || 'Sem projeto'}</p>
    </div>
    {!done && <button type="button" disabled={busy} onClick={() => start(task.title, task.estimateMin && task.estimateMin <= 50 ? task.estimateMin : 25, task.id)} className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full transition disabled:opacity-40', magna ? 'bg-white/20 hover:bg-white/30' : 'text-magenta hover:bg-rosa dark:hover:bg-white/10')} aria-label={`Focar em ${task.title}`}><Timer size={20} strokeWidth={1.75} /></button>}
    <button type="button" onClick={() => unplanDelivery(task.id)} className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full transition', magna ? 'hover:bg-white/20' : 'text-muted hover:bg-rosa hover:text-magenta dark:hover:bg-white/10')} aria-label={`Devolver ${task.title} ao projeto`}><X size={18} strokeWidth={1.75} /></button>
  </li>;
}

function EmptySlot({ role, onPick }: { role: DeliveryRole; onPick: () => void }) {
  const magna = role === 'magna';
  return <li><button type="button" onClick={onPick} className={cn('flex min-h-[72px] w-full items-center gap-3 rounded-3xl border-2 border-dashed p-4 text-left transition hover:border-magenta', magna ? 'border-magenta/50 bg-rosa/50 dark:bg-magenta/10' : 'border-lilas/60')}>
    <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', magna ? 'bg-magenta text-white' : 'bg-rosa text-magenta dark:bg-white/10')}>{magna ? <Crown size={20} strokeWidth={1.75} /> : <Plus size={20} strokeWidth={1.75} />}</span>
    <span><span className="block font-semibold">{magna ? 'Escolher a Prioridade Magna' : 'Escolher uma secundária'}</span><span className="block text-sm text-muted">{magna ? 'A entrega que faz o dia valer.' : 'Opcional. No máximo duas.'}</span></span>
  </button></li>;
}
