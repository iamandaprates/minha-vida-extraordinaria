import { BookOpen, Layers, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { isDue } from '../../lib/sm2';
import { useMive } from '../../store/useMive';
import type { Track } from '../../types';
import { Button, GlassCard, Tabs, Tag, cn } from '../../ui';
import { Page, PageHeader } from '../GuidePage';
import { DeckSheet } from './DeckSheet';
import { ReviewSession } from './ReviewSession';

const inputClass = 'h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/70 px-4 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5';

export function EstudosPage() {
  const state = useMive();
  const due = state.cards.filter(card => isDue(card));
  const [review, setReview] = useState<{ ids: string[]; title: string } | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [trackName, setTrackName] = useState('');
  const start = (ids: string[], title: string) => ids.length && setReview({ ids: shuffle(ids), title });

  return <Page>
    <PageHeader eyebrow="Estudos" title="Aprender é repetir no tempo certo" subtitle="Trilhas, baralhos e revisão espaçada no algoritmo SM-2. Poucos minutos por dia, todos os dias." />
    <GlassCard tone="strong" className="mb-6 flex flex-wrap items-center gap-4">
      <span className="grid h-14 w-14 place-items-center rounded-3xl bg-grad-magenta text-white shadow-magenta"><Layers size={26} strokeWidth={1.5} /></span>
      <div className="flex-1"><p className="text-[32px] font-bold tabular-nums leading-none">{due.length}</p><p className="mt-1 text-sm font-medium text-ink-soft">{due.length === 1 ? 'revisão pendente hoje' : 'revisões pendentes hoje'}</p></div>
      <Button size="lg" disabled={!due.length} onClick={() => start(due.map(card => card.id), 'Revisões de hoje')}><Play size={18} strokeWidth={2} /> {due.length ? 'Revisar agora' : 'Tudo em dia'}</Button>
    </GlassCard>

    <div className="grid items-start gap-5 lg:grid-cols-2">{state.tracks.map(track => <TrackCard key={track.id} track={track} onReview={start} onOpenDeck={setDeckId} />)}</div>
    <form className="mt-4 flex max-w-md gap-2" onSubmit={event => { event.preventDefault(); if (!trackName.trim()) return; state.addTrack(trackName); setTrackName(''); }}>
      <label className="sr-only" htmlFor="nova-trilha">Nova trilha</label>
      <input id="nova-trilha" value={trackName} onChange={event => setTrackName(event.target.value)} placeholder="Nova trilha de estudo" className={inputClass} />
      <Button type="submit" variant="secondary" size="icon" aria-label="Adicionar trilha" disabled={!trackName.trim()}><Plus size={18} strokeWidth={2} /></Button>
    </form>

    <StudyNotesCard />
    {review && <ReviewSession cardIds={review.ids} title={review.title} onClose={() => setReview(null)} />}
    {deckId && <DeckSheet deckId={deckId} onClose={() => setDeckId(null)} />}
  </Page>;
}

function TrackCard({ track, onReview, onOpenDeck }: { track: Track; onReview: (ids: string[], title: string) => void; onOpenDeck: (deckId: string) => void }) {
  const state = useMive();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(track.name);
  const [deckName, setDeckName] = useState('');
  const [confirm, setConfirm] = useState(false);
  const decks = state.decks.filter(deck => deck.trackId === track.id);
  const trackCards = state.cards.filter(card => decks.some(deck => deck.id === card.deckId));
  const due = trackCards.filter(card => isDue(card));
  return <GlassCard className="grid content-start gap-4">
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rosa text-magenta dark:bg-magenta/15"><BookOpen size={22} strokeWidth={1.5} /></span>
      {editing ? <form className="flex flex-1 gap-2" onSubmit={event => { event.preventDefault(); if (name.trim()) { state.renameTrack(track.id, name); setEditing(false); } }}>
        <label className="sr-only" htmlFor={`trilha-${track.id}`}>Nome da trilha</label><input id={`trilha-${track.id}`} value={name} onChange={event => setName(event.target.value)} className={inputClass} autoFocus /><Button type="submit" size="sm">Salvar</Button>
      </form> : <div className="min-w-0 flex-1"><h2 className="text-xl font-semibold leading-tight">{track.name}</h2><p className="text-sm text-muted">{decks.length} {decks.length === 1 ? 'baralho' : 'baralhos'} · {trackCards.length} {trackCards.length === 1 ? 'cartão' : 'cartões'}</p></div>}
      {!editing && <button type="button" onClick={() => setEditing(true)} aria-label={`Editar trilha ${track.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:text-magenta"><Pencil size={16} strokeWidth={1.75} /></button>}
    </div>
    {due.length > 0 && <Button variant="secondary" onClick={() => onReview(due.map(card => card.id), track.name)}><Play size={16} strokeWidth={2} /> Revisar {due.length} {due.length === 1 ? 'cartão' : 'cartões'} da trilha</Button>}
    <ul className="grid gap-2">{decks.map(deck => { const cards = state.cards.filter(card => card.deckId === deck.id); const deckDue = cards.filter(card => isDue(card)); return <li key={deck.id} className="flex items-center gap-2 rounded-2xl border border-line/10 bg-white/50 py-1 pl-3 pr-1 dark:bg-white/5">
      <button type="button" onClick={() => onOpenDeck(deck.id)} className="min-h-[44px] min-w-0 flex-1 text-left"><span className="block truncate text-[15px] font-semibold">{deck.name}</span><span className="block text-xs text-muted">{cards.length} {cards.length === 1 ? 'cartão' : 'cartões'}</span></button>
      {deckDue.length > 0 && <Tag tone="magenta">{deckDue.length} hoje</Tag>}
      <button type="button" onClick={() => onReview(deckDue.map(card => card.id), deck.name)} disabled={!deckDue.length} aria-label={`Revisar ${deck.name}`} className={cn('grid h-11 w-11 place-items-center rounded-full text-magenta transition hover:bg-magenta/10 disabled:opacity-30')}><Play size={18} strokeWidth={1.75} /></button>
    </li>; })}</ul>
    <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (!deckName.trim()) return; state.addDeck(track.id, deckName); setDeckName(''); }}>
      <label className="sr-only" htmlFor={`baralho-${track.id}`}>Novo baralho em {track.name}</label>
      <input id={`baralho-${track.id}`} value={deckName} onChange={event => setDeckName(event.target.value)} placeholder="Novo baralho" className={inputClass} />
      <Button type="submit" variant="secondary" size="icon" aria-label={`Adicionar baralho em ${track.name}`} disabled={!deckName.trim()}><Plus size={18} strokeWidth={2} /></Button>
    </form>
    {editing && (!confirm ? <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setConfirm(true)}><Trash2 size={15} strokeWidth={1.75} /> Excluir trilha</Button>
      : <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => state.deleteTrack(track.id)}>Confirmar · apaga {decks.length} {decks.length === 1 ? 'baralho' : 'baralhos'} e {trackCards.length} {trackCards.length === 1 ? 'cartão' : 'cartões'}</Button>)}
  </GlassCard>;
}

/** Seção reservada: Estrutura PAT e Short List, editor de texto simples com salvamento automático. */
function StudyNotesCard() {
  const notes = useMive(state => state.studyNotes);
  const update = useMive(state => state.updateStudyNotes);
  const [tab, setTab] = useState<'pat' | 'shortList'>('pat');
  return <GlassCard className="mt-8 grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Anotações de estudo</h2><Tabs label="Anotações" value={tab} onChange={setTab} options={[{ value: 'pat', label: 'Estrutura PAT' }, { value: 'shortList', label: 'Short List' }]} /></div>
    <label className="grid gap-2"><span className="sr-only">{tab === 'pat' ? 'Estrutura PAT' : 'Short List'}</span>
      <textarea key={tab} value={notes[tab]} onChange={event => update({ [tab]: event.target.value })} rows={10} placeholder={tab === 'pat' ? 'Monte aqui a sua Estrutura PAT.' : 'Os pontos que mais caem, em lista curta.'} className="rounded-2xl border border-line/15 bg-white/80 px-4 py-3 text-base font-medium leading-relaxed outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" /></label>
    <p className="text-xs text-muted">Salva sozinho enquanto você escreve.</p>
  </GlassCard>;
}

function shuffle<T>(items: T[]) { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
