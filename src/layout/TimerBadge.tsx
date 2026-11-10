import { Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatClock, useFocus } from '../store/useFocus';
import { cn } from '../ui';

/** Lembrete discreto no topo enquanto há uma sessão de foco aberta. */
export function TimerBadge() {
  const focus = useFocus();
  const navigate = useNavigate();
  if (focus.status !== 'running' && focus.status !== 'paused') return null;
  return <button type="button" onClick={() => navigate('/')} className={cn('flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold tabular-nums', focus.status === 'running' ? 'bg-magenta/10 text-magenta' : 'bg-lilas/25 text-violeta dark:text-lilas')} aria-label="Ver sessão de foco"><Timer size={16} strokeWidth={1.75} />{formatClock(focus.plannedMin * 60_000 - focus.elapsed())}</button>;
}
