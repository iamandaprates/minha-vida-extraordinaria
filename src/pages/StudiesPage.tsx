import { BookMarked, ClipboardList, Layers, ListChecks, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { ratingLabels } from '../domain/catalog';
import { toISODate, type FlashcardRating, type StudyDeck } from '../domain/models';
import { cardSchedule, deckStats, dueCards, formatDay, formatMinutes, percent, retentionHistory, subjectStats } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TimerCard } from '../components/FocusTimer';
import { Icon } from '../components/icons';
import { Dialog, EmptyState, Field, PageIntro, ProgressBar, SectionHeading } from '../components/ui';

const deckColors = ['#8767ed', '#ff5c72', '#ff8a32', '#15b9ac', '#4f8aff', '#f3197d'];

export function StudiesPage() {
  const { snapshot, addStudyDeck } = useLife();
  const decks = snapshot.studyDecks.slice().sort((a, b) => a.position - b.position);
  const [deckId, setDeckId] = useState(decks[0]?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const deck = decks.find(item => item.id === deckId) ?? decks[0];
  const totalDue = decks.reduce((sum, item) => sum + dueCards(snapshot, item.id).length, 0);
  return <>
    <PageIntro eyebrow="ESTUDOS" title="Estudos" text={`Trilhas, matérias, sessões cronometradas e revisão espaçada no padrão Anki.${totalDue ? ` ${totalDue} ${totalDue === 1 ? 'cartão pendente' : 'cartões pendentes'} hoje.` : ''}`} action={<Button onClick={() => setCreating(true)}><Icon as={Plus} size={16} /> Nova trilha</Button>} />
    <div className="segmented" role="tablist" aria-label="Trilhas de estudo">{decks.map(item => { const due = dueCards(snapshot, item.id).length; return <button key={item.id} type="button" role="tab" aria-selected={deck?.id === item.id} className={deck?.id === item.id ? 'selected' : ''} onClick={() => setDeckId(item.id)}>{item.name}{due ? ` · ${due}` : ''}</button>; })}</div>
    {deck ? <DeckView key={deck.id} deck={deck} /> : <Card><EmptyState icon={Layers} title="Todo aprendizado começa com uma trilha" action={<Button variant="primary" onClick={() => setCreating(true)}><Icon as={Plus} size={16} /> Criar a primeira trilha</Button>}>Concurso, idioma ou curso: dê um nome e organize matérias, sessões e flashcards.</EmptyState></Card>}
    {/* Reserved: Ciclo PAT and Short List de Revisão. They receive Mands' own structure when she brings it. */}
    <section className="reserved-grid">
      <Card tone="soft" className="reserved-card"><Icon as={ClipboardList} size={22} /><div><span className="label">CICLO PAT</span><h3>Espaço reservado</h3><p>O ciclo PAT do seu método entra aqui quando você trouxer a estrutura. Nada foi inventado no lugar.</p></div></Card>
      <Card tone="soft" className="reserved-card"><Icon as={ListChecks} size={22} /><div><span className="label">SHORT LIST DE REVISÃO</span><h3>Espaço reservado</h3><p>A Short List de revisão final fica aqui, pronta para os tópicos que você definir.</p></div></Card>
    </section>
    {creating && <Dialog eyebrow="NOVA TRILHA" title="Qual disciplina você vai estudar?" onClose={() => setCreating(false)} onSubmit={() => { if (name.trim()) { const created = addStudyDeck(name, deckColors[decks.length % deckColors.length]); setDeckId(created.id); setName(''); setCreating(false); } }} submitLabel="Criar trilha">
      <Field label="Nome"><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Administração" /></Field>
    </Dialog>}
  </>;
}

function DeckView({ deck }: { deck: StudyDeck }) {
  const { snapshot, addStudySubject } = useLife();
  const [sessionFor, setSessionFor] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const stats = deckStats(snapshot, deck.id);
  const subjects = snapshot.studySubjects.filter(subject => subject.deckId === deck.id).sort((a, b) => a.position - b.position);
  return <>
    <section className="stat-grid stat-grid-3">
      <Card className="stat"><span className="label">TEMPO EM 30 DIAS</span><b>{formatMinutes(stats.minutes)}</b><small>{stats.days} {stats.days === 1 ? 'dia' : 'dias'} com estudo</small></Card>
      <Card className="stat"><span className="label">QUESTÕES</span><b>{stats.questions}</b><small>resolvidas em 30 dias</small></Card>
      <Card className="stat"><span className="label">TAXA DE ACERTOS</span><b className="positive">{stats.accuracy === undefined ? '·' : `${percent(stats.accuracy)}%`}</b><small>{stats.accuracy === undefined ? 'Registre questões para ver' : 'média do período'}</small></Card>
    </section>
    <FlashcardTrainer deck={deck} />
    <section className="studies-layout">
      <TimerCard deckId={deck.id} />
      <Card className="subjects-card">
        <div className="card-head"><div><span className="label">MATÉRIAS · {deck.name.toUpperCase()}</span><h2>Controle por matéria</h2></div><Button onClick={() => setSessionFor(subjects[0]?.id ?? null)} disabled={!subjects.length}><Icon as={Plus} size={16} /> Registrar sessão</Button></div>
        {subjects.length ? <ul className="subject-list">{subjects.map(subject => { const item = subjectStats(snapshot, subject.id); return <li key={subject.id}><button type="button" onClick={() => setSessionFor(subject.id)}>
          <span className="subject-name"><b>{subject.name}</b><small>{item.lastDate ? `Último estudo ${formatDay(item.lastDate).toLowerCase()}` : 'Ainda sem sessões'}</small></span>
          <span className="subject-metric"><b>{formatMinutes(item.minutes)}</b><small>tempo</small></span>
          <span className="subject-metric"><b>{item.questions ? `${item.correct}/${item.questions}` : '·'}</b><small>acertos</small></span>
          <span className="subject-bar"><ProgressBar value={item.accuracy} color={deck.color} label={`Acertos em ${subject.name}`} /><small>{item.accuracy === undefined ? '·' : `${percent(item.accuracy)}%`}</small></span>
        </button></li>; })}</ul> : <EmptyState icon={BookMarked} title="Vamos executar?">Adicione a primeira matéria logo abaixo e registre sua primeira sessão.</EmptyState>}
        <form className="inline-add" onSubmit={event => { event.preventDefault(); if (subjectName.trim()) { addStudySubject(subjectName, deck.id); setSubjectName(''); } }}><input value={subjectName} onChange={event => setSubjectName(event.target.value)} placeholder="Adicionar matéria" aria-label="Nova matéria" /><button type="submit" className="icon-chip" aria-label="Adicionar matéria"><Icon as={Plus} size={15} /></button></form>
        {deck.id === 'deck-prf' && <p className="fine-print">Lista inicial com as matérias mais cobradas para Agente Administrativo. Ajuste conforme o edital oficial.</p>}
      </Card>
    </section>
    {sessionFor && <SessionDialog deckId={deck.id} subjectId={sessionFor} onClose={() => setSessionFor(null)} />}
  </>;
}

function SessionDialog({ deckId, subjectId, onClose }: { deckId: string; subjectId: string; onClose: () => void }) {
  const { snapshot, addStudySession } = useLife();
  const [subject, setSubject] = useState(subjectId); const [minutes, setMinutes] = useState('50'); const [questions, setQuestions] = useState(''); const [correct, setCorrect] = useState(''); const [date, setDate] = useState(toISODate(new Date()));
  const total = Number(questions) || 0; const right = Math.min(Number(correct) || 0, total);
  return <Dialog eyebrow="SESSÃO DE ESTUDO" title="O que você estudou?" onClose={onClose} onSubmit={() => { if (Number(minutes) > 0) { addStudySession({ subjectId: subject, minutes: Number(minutes), questions: total || undefined, correct: total ? right : undefined, date }); onClose(); } }} submitLabel="Registrar sessão">
    <Field label="Matéria"><select value={subject} onChange={event => setSubject(event.target.value)}>{snapshot.studySubjects.filter(item => item.deckId === deckId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <div className="field-row"><Field label="Minutos"><input type="number" min={1} value={minutes} onChange={event => setMinutes(event.target.value)} /></Field><Field label="Data"><input type="date" value={date} max={toISODate(new Date())} onChange={event => setDate(event.target.value)} /></Field></div>
    <div className="field-row"><Field label="Questões resolvidas"><input type="number" min={0} value={questions} onChange={event => setQuestions(event.target.value)} placeholder="0" /></Field><Field label="Acertos"><input type="number" min={0} value={correct} onChange={event => setCorrect(event.target.value)} placeholder="0" /></Field></div>
  </Dialog>;
}

const ratings: FlashcardRating[] = ['again', 'hard', 'good', 'easy'];
const nextLabel = (minutes: number) => minutes < 60 ? `${minutes} min` : minutes < 1440 ? `${Math.round(minutes / 60)} h` : `${Math.round(minutes / 1440)} d`;

/** Anki-style review: front, "Virar Cartão", then Novamente · Difícil · Bom · Fácil (SM-2). */
function FlashcardTrainer({ deck }: { deck: StudyDeck }) {
  const { snapshot, reviewFlashcard, addFlashcard } = useLife();
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [front, setFront] = useState(''); const [back, setBack] = useState('');
  const due = dueCards(snapshot, deck.id);
  const all = snapshot.flashcards.filter(card => card.deckId === deck.id);
  const card = due[0];
  const history = retentionHistory(snapshot, deck.id);
  const maxReviews = Math.max(1, ...history.series.map(day => day.reviews));
  const rate = (rating: FlashcardRating) => { if (!card) return; reviewFlashcard(card.id, rating); setFlipped(false); };
  const preview = (rating: FlashcardRating) => {
    if (!card) return '';
    const state = cardSchedule(card, { ...snapshot, flashcardReviews: [...snapshot.flashcardReviews, { id: 'preview', userId: '', createdAt: '', updatedAt: '', cardId: card.id, rating, reviewedAt: new Date().toISOString() }] });
    return nextLabel(Math.max(1, Math.round((Date.parse(state.dueAt) - Date.now()) / 60_000)));
  };
  const next = all.map(item => cardSchedule(item, snapshot).dueAt).filter(dueAt => Date.parse(dueAt) > Date.now()).sort()[0];
  return <>
    <SectionHeading label={`FLASHCARDS · ${deck.name.toUpperCase()}`} title={card ? `${due.length} ${due.length === 1 ? 'revisão pendente' : 'revisões pendentes'} hoje` : 'Revisões em dia'} action={<Button onClick={() => setAdding(!adding)}><Icon as={Plus} size={16} /> Cartão</Button>} />
    {adding && <Card className="flash-add"><form onSubmit={event => { event.preventDefault(); if (front.trim() && back.trim()) { addFlashcard(deck.id, front, back); setFront(''); setBack(''); setAdding(false); } }}><div className="field-row"><Field label="Frente"><input autoFocus value={front} onChange={event => setFront(event.target.value)} placeholder="Pergunta ou termo" /></Field><Field label="Verso"><input value={back} onChange={event => setBack(event.target.value)} placeholder="Resposta" /></Field></div><Button variant="primary" type="submit">Salvar cartão</Button></form></Card>}
    <section className="flash-layout">
      {card ? <div className="flash-stage">
        <div className={`flashcard ${flipped ? 'is-flipped' : ''}`}>
          <span className="flash-face flash-front" aria-hidden={flipped}><small>{deck.name}{cardSchedule(card, snapshot).isNew ? ' · novo' : ''}</small><b>{card.front}</b></span>
          <span className="flash-face flash-back" aria-hidden={!flipped}><small>Resposta</small><b>{card.back}</b></span>
        </div>
        {!flipped ? <Button variant="primary" onClick={() => setFlipped(true)}><Icon as={RotateCcw} size={16} /> Virar Cartão</Button>
          : <div className="flash-ratings">{ratings.map(rating => <button key={rating} type="button" className={`rating rating-${rating}`} onClick={() => rate(rating)}><b>{ratingLabels[rating]}</b><small>{preview(rating)}</small></button>)}</div>}
      </div> : <Card className="flash-empty">{all.length ? <EmptyState icon={BookMarked} title="Revisões em dia">{`Tudo revisado. Disciplina é liberdade.${next ? ` Próxima revisão ${formatDay(next).toLowerCase()}.` : ''}`}</EmptyState> : <EmptyState icon={Layers} title="Seu primeiro cartão" action={<Button variant="primary" onClick={() => setAdding(true)}><Icon as={Plus} size={16} /> Criar cartão</Button>}>Pergunta na frente, resposta no verso. A revisão espaçada cuida do resto.</EmptyState>}</Card>}
      <Card className="retention-card">
        <span className="label">RETENÇÃO · 14 DIAS</span>
        <b className="big-number">{history.retention === undefined ? '·' : `${percent(history.retention)}%`}</b>
        <small className="support">{history.retention === undefined ? 'Aparece depois da segunda revisão de um cartão.' : 'Revisões respondidas sem "Novamente".'}</small>
        <div className="retention-bars" role="img" aria-label="Revisões por dia nos últimos 14 dias">{history.series.map(day => <i key={day.date} title={`${formatDay(day.date)} · ${day.reviews} revisões`} style={{ height: `${Math.max(4, (day.reviews / maxReviews) * 100)}%`, opacity: day.reviews ? 1 : 0.25 }} />)}</div>
        <small className="support">{history.reviewedToday} {history.reviewedToday === 1 ? 'revisão' : 'revisões'} hoje · {all.length} cartões na trilha</small>
      </Card>
    </section>
  </>;
}
