import { isDue } from '../lib/sm2';
import { useMive } from '../store/useMive';
import { cn } from '../ui';

/** Revisões pendentes hoje (cartões com revisão marcada até hoje). */
export const useDueCount = () => useMive(state => state.cards.filter(card => isDue(card)).length);

/** Badge ciano com as revisões pendentes da guia Estudos. Some quando está tudo em dia. */
export function DueBadge({ className }: { className?: string }) {
  const due = useDueCount();
  if (!due) return null;
  return <span className={cn('grid h-5 min-w-[20px] place-items-center rounded-full bg-ciano px-1.5 text-[11px] font-bold leading-none text-violeta shadow-[0_4px_10px_rgba(0,201,223,0.35)]', className)} aria-label={`${due} ${due === 1 ? 'revisão pendente' : 'revisões pendentes'} hoje`}>{due > 99 ? '99+' : due}</span>;
}
