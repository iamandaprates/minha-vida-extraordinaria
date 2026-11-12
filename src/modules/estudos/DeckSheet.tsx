import { Check, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { formatDay } from '../../lib/dates';
import { intervalLabel, isDue } from '../../lib/sm2';
import { useMive } from '../../store/useMive';
import type { Flashcard } from '../../types';
import { Button, Sheet, Tag } from '../../ui';

const fieldClass = 'rounded-2xl border border-line/15 bg-white/80 px-4 py-3 text-base font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5';

/** Gerenciador de cartões de um baralho. */
export function DeckSheet({ deckId, onClose }: { deckId: string; onClose: () => void }) {
  const state = useMive();
  const deck = state.decks.find(item => item.id === deckId);
  const cards = state.cards.filter(card => card.deckId === deckId);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [name, setName] = useState(deck?.name ?? '');
  const [confirm, setConfirm] = useState(false);
  if (!deck) return null;
  return <Sheet open onClose={onClose} title={deck.name} eyebrow="Baralho">
    <div className="grid gap-5">
      <form className="grid gap-3" onSubmit={event => { event.preventDefault(); if (!front.trim() || !back.trim()) return; state.addCard(deckId, front, back); setFront(''); setBack(''); }}>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">Frente · pergunta</span><textarea value={front} onChange={event => setFront(event.target.value)} rows={2} className={fieldClass} placeholder="Ex.: Quais são os princípios do art. 37 da CF?" /></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">Verso · resposta</span><textarea value={back} onChange={event => setBack(event.target.value)} rows={2} className={fieldClass} placeholder="Escreva com as suas palavras" /></label>
        <Button type="submit" disabled={!front.trim() || !back.trim()}>Adicionar cartão</Button>
      </form>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{cards.length} {cards.length === 1 ? 'cartão' : 'cartões'}</h3>
        <ul className="grid gap-2">{cards.map(card => <CardRow key={card.id} card={card} />)}</ul>
        {!cards.length && <p className="text-sm text-muted">Comece com 5 cartões curtos. Uma pergunta, uma resposta.</p>}
      </div>
      <details className="rounded-2xl border border-line/10 p-3">
        <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold">Configurar baralho</summary>
        <form className="mt-2 flex gap-2" onSubmit={event => { event.preventDefault(); if (name.trim()) state.renameDeck(deckId, name); }}>
          <label className="sr-only" htmlFor="nome-baralho">Nome do baralho</label>
          <input id="nome-baralho" value={name} onChange={event => setName(event.target.value)} className="h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/80 px-4 text-sm font-medium dark:bg-white/5" />
          <Button type="submit" variant="secondary" size="sm">Renomear</Button>
        </form>
        {!confirm ? <Button variant="ghost" size="sm" className="mt-2" onClick={() => setConfirm(true)}><Trash2 size={15} strokeWidth={1.75} /> Excluir baralho</Button>
          : <Button variant="secondary" size="sm" className="mt-2" onClick={() => { state.deleteDeck(deckId); onClose(); }}>Confirmar · apaga {cards.length} {cards.length === 1 ? 'cartão' : 'cartões'}</Button>}
      </details>
    </div>
  </Sheet>;
}

function CardRow({ card }: { card: Flashcard }) {
  const state = useMive();
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  if (editing) return <li className="grid gap-2 rounded-2xl border border-magenta/30 p-3">
    <label className="sr-only" htmlFor={`f-${card.id}`}>Frente</label><textarea id={`f-${card.id}`} value={front} onChange={event => setFront(event.target.value)} rows={2} className={fieldClass} />
    <label className="sr-only" htmlFor={`b-${card.id}`}>Verso</label><textarea id={`b-${card.id}`} value={back} onChange={event => setBack(event.target.value)} rows={2} className={fieldClass} />
    <div className="flex gap-2"><Button size="sm" onClick={() => { if (front.trim() && back.trim()) { state.updateCard(card.id, { front: front.trim(), back: back.trim() }); setEditing(false); } }}><Check size={15} strokeWidth={2} /> Salvar</Button><Button variant="ghost" size="sm" onClick={() => state.deleteCard(card.id)}><Trash2 size={15} strokeWidth={1.75} /> Excluir</Button></div>
  </li>;
  return <li className="flex items-start gap-2 rounded-2xl border border-line/10 bg-white/50 px-3 py-2 dark:bg-white/5">
    <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold leading-snug">{card.front}</p><p className="mt-0.5 text-sm text-ink-soft">{card.back}</p>
      <p className="mt-1.5 flex flex-wrap gap-1.5">{isDue(card) ? <Tag tone="magenta">Revisar hoje</Tag> : <Tag tone="ciano">Próxima em {formatDay(card.due, "d 'de' MMM")}</Tag>}{card.repetitions > 0 && <Tag>Intervalo {intervalLabel(card.interval)}</Tag>}</p></div>
    <button type="button" onClick={() => setEditing(true)} aria-label={`Editar cartão ${card.front}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:text-magenta"><Pencil size={16} strokeWidth={1.75} /></button>
  </li>;
}
