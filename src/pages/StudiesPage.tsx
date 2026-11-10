import { BookMarked, ClipboardList, Layers, ListChecks, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { deckLabels, ratingLabels } from '../domain/catalog';
import { toISODate, type FlashcardDeck, type FlashcardRating, type StudyTrack } from '../domain/models';
import { cardSchedule, dueCards, formatDay, formatMinutes, percent, subjectStats, trackStats } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TimerCard } from '../components/FocusTimer';
import { Icon } from '../components/icons';
import { Dialog, EmptyState, Field, PageIntro, ProgressBar, SectionHeading, Tabs } from '../components/ui';

export function StudiesPage() {
  const [track, setTrack] = useState<StudyTrack>('prf');
  return <>
    <PageIntro eyebrow="ESTUDOS" title="Estudos & Inglês" text="Aprovação na PRF e fluência em inglês. Cada bloco vira registro: minutos, questões e acertos reais." />
    <Tabs label="Trilha de estudo" value={track} onChange={setTrack} options={[{ key: 'prf', label: 'Concurso PRF' }, { key: 'english', label: 'Inglês' }]} />
    {track === 'prf' ? <PrfTrack /> : <EnglishTrack />}
  </>;
}

function TrackStats({ track }: { track: StudyTrack }) {
  const { snapshot } = useLife();
  const stats = trackStats(snapshot, track);
  return <section className="stat-grid stat-grid-3">
    <Card className="stat"><span className="label">TEMPO EM 30 DIAS</span><b>{formatMinutes(stats.minutes)}</b><small>{stats.days} {stats.days === 1 ? 'dia' : 'dias'} com estudo</small></Card>
    <Card className="stat"><span className="label">QUESTÕES</span><b>{stats.questions}</b><small>resolvidas em 30 dias</small></Card>
    <Card className="stat"><span className="label">TAXA DE ACERTOS</span><b className="positive">{stats.accuracy === undefined ? '·' : `${percent(stats.accuracy)}%`}</b><small>{stats.accuracy === undefined ? 'Registre questões para ver' : 'média do período'}</small></Card>
  </section>;
}

function PrfTrack() {
  const { snapshot, addStudySubject } = useLife();
  const [sessionFor, setSessionFor] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const subjects = snapshot.studySubjects.filter(subject => subject.track === 'prf').sort((a, b) => a.position - b.position);
  const goal = snapshot.goals.find(item => item.pillar === 'studies');
  return <>
    <TrackStats track="prf" />
    <section className="studies-layout">
      <TimerCard defaultTrack="prf" />
      <Card className="subjects-card">
        <div className="card-head"><div><span className="label">MATÉRIAS · AGENTE ADMINISTRATIVO</span><h2>Controle por matéria</h2></div><Button onClick={() => setSessionFor(subjects[0]?.id ?? null)} disabled={!subjects.length}><Icon as={Plus} size={16} /> Registrar sessão</Button></div>
        <ul className="subject-list">{subjects.map(subject => { const stats = subjectStats(snapshot, subject.id); return <li key={subject.id}><button type="button" onClick={() => setSessionFor(subject.id)}>
          <span className="subject-name"><b>{subject.name}</b><small>{stats.lastDate ? `Último estudo ${formatDay(stats.lastDate).toLowerCase()}` : 'Ainda sem sessões'}</small></span>
          <span className="subject-metric"><b>{formatMinutes(stats.minutes)}</b><small>tempo</small></span>
          <span className="subject-metric"><b>{stats.questions ? `${stats.correct}/${stats.questions}` : '·'}</b><small>acertos</small></span>
          <span className="subject-bar"><ProgressBar value={stats.accuracy} color="var(--violet)" label={`Acertos em ${subject.name}`} /><small>{stats.accuracy === undefined ? '·' : `${percent(stats.accuracy)}%`}</small></span>
        </button></li>; })}</ul>
        <form className="inline-add" onSubmit={event => { event.preventDefault(); if (subjectName.trim()) { addStudySubject(subjectName, 'prf', goal?.id); setSubjectName(''); } }}><input value={subjectName} onChange={event => setSubjectName(event.target.value)} placeholder="Adicionar matéria do edital" aria-label="Nova matéria" /><button type="submit" className="icon-chip" aria-label="Adicionar matéria"><Icon as={Plus} size={15} /></button></form>
        <p className="fine-print">Lista inicial com as matérias mais cobradas para Agente Administrativo. Ajuste conforme o edital oficial.</p>
      </Card>
    </section>
    <section className="reserved-grid">
      <Card tone="soft" className="reserved-card"><Icon as={ClipboardList} size={22} /><div><span className="label">ESTRUTURA PAT</span><h3>Espaço reservado</h3><p>O plano PAT do seu método entra aqui assim que você trouxer a estrutura. Nada foi inventado no lugar.</p></div></Card>
      <Card tone="soft" className="reserved-card"><Icon as={ListChecks} size={22} /><div><span className="label">SHORT LIST</span><h3>Espaço reservado</h3><p>A Short List de revisão final fica aqui, pronta para receber os tópicos que você definir.</p></div></Card>
    </section>
    <FlashcardTrainer deck="legislacao" />
    {sessionFor && <SessionDialog track="prf" subjectId={sessionFor} onClose={() => setSessionFor(null)} />}
  </>;
}

function EnglishTrack() {
  const { snapshot } = useLife();
  const [sessionFor, setSessionFor] = useState<string | null>(null);
  const subjects = snapshot.studySubjects.filter(subject => subject.track === 'english');
  return <>
    <TrackStats track="english" />
    <FlashcardTrainer deck="english" />
    <section className="studies-layout">
      <TimerCard defaultTrack="english" />
      <Card className="subjects-card">
        <div className="card-head"><div><span className="label">FLUÊNCIA</span><h2>Curso e conversação</h2></div><Button onClick={() => setSessionFor(subjects[0]?.id ?? null)} disabled={!subjects.length}><Icon as={Plus} size={16} /> Registrar sessão</Button></div>
        <ul className="subject-list">{subjects.map(subject => { const stats = subjectStats(snapshot, subject.id); return <li key={subject.id}><button type="button" onClick={() => setSessionFor(subject.id)}><span className="subject-name"><b>{subject.name}</b><small>{stats.lastDate ? `Último ${formatDay(stats.lastDate).toLowerCase()}` : 'Ainda sem sessões'}</small></span><span className="subject-metric"><b>{formatMinutes(stats.minutes)}</b><small>tempo</small></span><span className="subject-metric"><b>{stats.sessions}</b><small>sessões</small></span></button></li>; })}</ul>
      </Card>
    </section>
    {sessionFor && <SessionDialog track="english" subjectId={sessionFor} onClose={() => setSessionFor(null)} />}
  </>;
}

function SessionDialog({ track, subjectId, onClose }: { track: StudyTrack; subjectId: string; onClose: () => void }) {
  const { snapshot, addStudySession } = useLife();
  const [subject, setSubject] = useState(subjectId); const [minutes, setMinutes] = useState('50'); const [questions, setQuestions] = useState(''); const [correct, setCorrect] = useState(''); const [date, setDate] = useState(toISODate(new Date()));
  const total = Number(questions) || 0; const right = Math.min(Number(correct) || 0, total);
  return <Dialog eyebrow="SESSÃO DE ESTUDO" title="O que você estudou?" onClose={onClose} onSubmit={() => { if (Number(minutes) > 0) { addStudySession({ subjectId: subject, minutes: Number(minutes), questions: total || undefined, correct: total ? right : undefined, date }); onClose(); } }} submitLabel="Registrar sessão">
    <Field label="Matéria"><select value={subject} onChange={event => setSubject(event.target.value)}>{snapshot.studySubjects.filter(item => item.track === track).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <div className="field-row"><Field label="Minutos"><input type="number" min={1} value={minutes} onChange={event => setMinutes(event.target.value)} /></Field><Field label="Data"><input type="date" value={date} max={toISODate(new Date())} onChange={event => setDate(event.target.value)} /></Field></div>
    {track === 'prf' && <div className="field-row"><Field label="Questões resolvidas"><input type="number" min={0} value={questions} onChange={event => setQuestions(event.target.value)} placeholder="0" /></Field><Field label="Acertos"><input type="number" min={0} value={correct} onChange={event => setCorrect(event.target.value)} placeholder="0" /></Field></div>}
  </Dialog>;
}

function FlashcardTrainer({ deck }: { deck: FlashcardDeck }) {
  const { snapshot, reviewFlashcard, addFlashcard } = useLife();
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [front, setFront] = useState(''); const [back, setBack] = useState('');
  const due = dueCards(snapshot, deck);
  const all = snapshot.flashcards.filter(card => card.deck === deck);
  const card = due[0];
  const rate = (rating: FlashcardRating) => { if (!card) return; reviewFlashcard(card.id, rating); setFlipped(false); };
  const next = all.map(item => cardSchedule(item, snapshot).dueAt).filter(dueAt => Date.parse(dueAt) > Date.now()).sort()[0];
  return <>
    <SectionHeading label={`FLASHCARDS · ${deckLabels[deck].toUpperCase()}`} title={card ? `${due.length} ${due.length === 1 ? 'cartão' : 'cartões'} para revisar` : 'Revisão em dia'} action={<Button onClick={() => setAdding(!adding)}><Icon as={Plus} size={16} /> Cartão</Button>} />
    {adding && <Card className="flash-add"><form onSubmit={event => { event.preventDefault(); if (front.trim() && back.trim()) { addFlashcard(deck, front, back); setFront(''); setBack(''); setAdding(false); } }}><div className="field-row"><Field label="Frente"><input autoFocus value={front} onChange={event => setFront(event.target.value)} placeholder={deck === 'english' ? 'Ex.: I look forward to it.' : 'Ex.: Art. 37 da CF'} /></Field><Field label="Verso"><input value={back} onChange={event => setBack(event.target.value)} placeholder={deck === 'english' ? 'Estou ansiosa por isso.' : 'Princípios: LIMPE'} /></Field></div><Button variant="primary" type="submit">Salvar cartão</Button></form></Card>}
    {card ? <div className="flash-stage">
      <button type="button" className={`flashcard ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(!flipped)} aria-label={flipped ? 'Mostrar frente' : 'Virar cartão'}>
        <span className="flash-face flash-front"><small>{deckLabels[deck]}</small><b>{card.front}</b><em><Icon as={RotateCcw} size={14} /> Toque para virar</em></span>
        <span className="flash-face flash-back"><small>Resposta</small><b>{card.back}</b></span>
      </button>
      <div className="flash-ratings">{(['hard', 'medium', 'easy'] as const).map(rating => <button key={rating} type="button" className={`rating rating-${rating}`} disabled={!flipped} onClick={() => rate(rating)}>{ratingLabels[rating]}</button>)}</div>
      <p className="fine-print">Fácil volta em alguns dias, médio em dois, difícil amanhã. Cada avaliação vira registro.</p>
    </div> : <Card><EmptyState icon={all.length ? BookMarked : Layers}>{all.length ? `Todos os cartões revisados.${next ? ` Próxima revisão ${formatDay(next).toLowerCase()}.` : ''}` : 'Nenhum cartão neste baralho ainda. Crie o primeiro.'}</EmptyState></Card>}
  </>;
}
