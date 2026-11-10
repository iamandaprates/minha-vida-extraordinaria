import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { toISODate } from '../domain/models';
import { areaOf, habitConsistency, habitStreak, isHabitDone, lastDays, MOVEMENT_WINDOW_DAYS, percent } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { Icon, iconByName } from './icons';
import { AreaSelect, Dialog, EmptyState, Field, ProgressBar, SectionHeading } from './ui';

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' });

/** Habits with the last 7 days. Each tap appends a check-in; the latest one of the day wins. */
export function HabitsBoard() {
  const { snapshot, toggleHabit } = useLife();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const days = lastDays(7, now);
  const habits = snapshot.habits.filter(habit => habit.active);

  return <>
    <SectionHeading label={`HÁBITOS · CONSTÂNCIA EM ${MOVEMENT_WINDOW_DAYS} DIAS`} title="O que sustenta as metas" action={<Button onClick={() => setOpen(true)}><Icon as={Plus} size={16} /> Novo hábito</Button>} />
    <Card className="habit-board">
      <div className="habit-row habit-header"><span /><div className="habit-days">{days.map(day => <span key={day.toISOString()} className={toISODate(day) === toISODate(now) ? 'is-today' : ''}>{weekday.format(day)}<small>{day.getDate()}</small></span>)}</div><span>Constância</span></div>
      {habits.length ? habits.map(habit => {
        const consistency = habitConsistency(habit, snapshot.habitCheckIns, now);
        const streak = habitStreak(habit, snapshot.habitCheckIns, now);
        const area = areaOf(snapshot, habit.areaId);
        const goal = snapshot.goals.find(item => item.id === habit.goalId);
        return <div key={habit.id} className="habit-row">
          <div className="habit-name"><span className="habit-icon" style={{ color: area?.color }}><Icon as={iconByName(habit.icon)} size={17} /></span><div><b>{habit.title}</b><small>{[area?.name, goal ? `Meta · ${goal.title}` : undefined].filter(Boolean).join(' · ')}</small></div></div>
          <div className="habit-days">{days.map(day => { const iso = toISODate(day); const done = isHabitDone(habit.id, iso, snapshot.habitCheckIns); return <button key={iso} type="button" className={`habit-dot ${done ? 'is-done' : ''}`} aria-pressed={done} aria-label={`${habit.title} em ${day.toLocaleDateString('pt-BR')}`} onClick={() => toggleHabit(habit.id, iso)}>{done && <Icon as={Check} size={14} strokeWidth={2.2} />}</button>; })}</div>
          <div className="habit-score"><b>{consistency ? `${percent(consistency.ratio)}%` : '·'}</b><ProgressBar value={consistency?.ratio} color={area?.color} label={`Constância de ${habit.title}`} /><small>{streak > 1 ? `${streak} dias seguidos` : consistency ? `${consistency.done} de ${consistency.expected} dias` : ''}</small></div>
        </div>;
      }) : <EmptyState>Crie o primeiro hábito e conecte a uma meta.</EmptyState>}
    </Card>
    <p className="fine-print">Marcar um dia passado também vale: você registra quando lembrar. Nada é apagado, cada toque vira um registro.</p>
    {open && <HabitDialog onClose={() => setOpen(false)} />}
  </>;
}

function HabitDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, addHabit } = useLife();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState('health');
  const [goalId, setGoalId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [times, setTimes] = useState(3);
  return <Dialog eyebrow="NOVO HÁBITO" title="Qual movimento vai se repetir?" onClose={onClose} onSubmit={() => { if (title.trim() && areaId) { addHabit({ title, areaId, goalId: goalId || undefined, frequency, timesPerWeek: frequency === 'weekly' ? times : undefined }); onClose(); } }}>
    <Field label="Hábito"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Ler 10 páginas" /></Field>
    <div className="field-row"><Field label="Área"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} allowEmpty={false} /></Field><Field label="Meta"><select value={goalId} onChange={event => setGoalId(event.target.value)}><option value="">Sem meta</option>{snapshot.goals.filter(goal => goal.status === 'active').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field></div>
    <div className="field-row"><Field label="Frequência"><select value={frequency} onChange={event => setFrequency(event.target.value as 'daily' | 'weekly')}><option value="daily">Todos os dias</option><option value="weekly">Algumas vezes por semana</option></select></Field>{frequency === 'weekly' && <Field label="Vezes por semana"><input type="number" min={1} max={6} value={times} onChange={event => setTimes(Number(event.target.value))} /></Field>}</div>
  </Dialog>;
}
