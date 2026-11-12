import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { useEffect, useState } from 'react';
import { intervalLabel, ratingLabel, sm2, type Rating } from '../../lib/sm2';
import { useMive } from '../../store/useMive';
import { Button, Modal, cn } from '../../ui';

const ratings: Rating[] = ['novamente', 'dificil', 'bom', 'facil'];
const ratingStyle: Record<Rating, string> = {
  novamente: 'border-lilas/60 bg-lilas/15 text-violeta dark:text-lilas',
  dificil: 'border-line/15 bg-white/70 text-ink dark:bg-white/5',
  bom: 'border-magenta/40 bg-rosa text-magenta dark:bg-magenta/15',
  facil: 'border-ciano/50 bg-ciano/10 text-[#007e8c] dark:text-ciano'
};

/** Sessão de revisão: frente, "Mostrar resposta" e os 4 botões do SM-2 com o próximo intervalo. */
export function ReviewSession({ cardIds, title, onClose }: { cardIds: string[]; title: string; onClose: () => void }) {
  const state = useMive();
  const [queue] = useState(cardIds);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = state.cards.find(item => item.id === queue[index]);
  const finished = index >= queue.length;
  const rate = (rating: Rating) => { if (!card) return; state.reviewCard(card.id, rating); setRevealed(false); setIndex(current => current + 1); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (finished) return;
      if (!revealed && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); setRevealed(true); }
      else if (revealed && ['1', '2', '3', '4'].includes(event.key)) rate(ratings[Number(event.key) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return <Modal open onClose={onClose} title={title} eyebrow="Revisão espaçada" className="sm:max-w-2xl">
    {finished ? <div className="grid justify-items-center gap-3 py-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-rosa text-magenta dark:bg-magenta/15"><PartyPopper size={28} strokeWidth={1.5} /></span>
      <h3 className="text-xl font-semibold">{queue.length} {queue.length === 1 ? 'cartão revisado' : 'cartões revisados'}</h3>
      <p className="text-ink-soft">Revisões em dia. Disciplina é liberdade.</p>
      <Button onClick={onClose}>Concluir</Button>
    </div> : card ? <div className="grid gap-5">
      <div className="flex items-center gap-3 text-sm font-semibold text-muted"><span className="tabular-nums">{index + 1} de {queue.length}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/10"><span className="block h-full rounded-full bg-grad-magenta transition-all" style={{ width: `${(index / queue.length) * 100}%` }} /></span></div>
      <AnimatePresence mode="wait"><motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="grid min-h-[220px] content-center gap-4 rounded-3xl border border-white/70 bg-white/70 p-6 text-center shadow-glass dark:border-lilas/20 dark:bg-white/5">
        <p className="whitespace-pre-line text-xl font-semibold leading-snug sm:text-2xl">{card.front}</p>
        {revealed && <><hr className="mx-auto w-16 border-magenta/40" /><p className="whitespace-pre-line text-lg text-ink-soft">{card.back}</p></>}
      </motion.div></AnimatePresence>
      {!revealed ? <Button size="lg" onClick={() => setRevealed(true)}>Mostrar resposta</Button>
        : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{ratings.map((rating, position) => <button key={rating} type="button" onClick={() => rate(rating)} className={cn('grid min-h-[64px] content-center justify-items-center gap-0.5 rounded-2xl border px-2 font-semibold transition hover:-translate-y-0.5', ratingStyle[rating])}>
          <span>{ratingLabel[rating]}</span><span className="text-xs font-medium opacity-80">{intervalLabel(sm2(card, rating).interval)}</span><span className="sr-only">tecla {position + 1}</span>
        </button>)}</div>}
      <p className="hidden text-center text-xs text-muted md:block">Atalhos: espaço mostra a resposta · 1 a 4 avaliam</p>
    </div> : null}
  </Modal>;
}
