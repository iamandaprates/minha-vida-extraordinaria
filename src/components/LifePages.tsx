import { useState } from 'react';
import type { Route } from '../app/navigation';
import { eventSourceLabel, eventStatusLabel } from '../domain/catalog';
import { toISODate, type IdentityManifest } from '../domain/models';
import { areaOf, formatDay, formatTime, percent, upcomingEvents, visionProgress } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { AreaDot, AreaSelect, Dialog, EmptyState, Field, PageIntro, ProgressBar, SectionHeading } from './ui';

/* ── Agenda ─────────────────────────────────────────────────────────────── */

export function AgendaModule() {
  const { snapshot } = useLife();
  const [open, setOpen] = useState(false);
  const events = upcomingEvents(snapshot.events);
  const days = [...new Set(events.map(event => toISODate(new Date(event.startsAt))))];
  return <>
    <PageIntro eyebrow="ACOMPANHAR" title="Agenda" text="Seus compromissos locais e do Google Calendar, no mesmo lugar." action={<Button variant="primary" onClick={() => setOpen(true)}>Novo compromisso ＋</Button>} />
    <Card tone="soft" className="integration-note"><span>◉</span><div><b>Google Calendar preparado</b><p>A sincronização chega com o login Google. Nenhum calendário paralelo será criado.</p></div></Card>
    {days.length ? days.map(day => <section key={day} className="task-group"><h3 className="group-title">{formatDay(day)} · {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day}T12:00`))}</h3>
      <Card className="timeline-card"><ol className="timeline">{events.filter(event => toISODate(new Date(event.startsAt)) === day).map(event => { const area = areaOf(snapshot, event.areaId); return <li key={event.id}><b>{formatTime(event.startsAt)}</b><span className="timeline-dot" style={{ background: area?.color }} /><div><strong>{event.title}</strong><small>{area?.name ?? 'Sem área'} · {eventStatusLabel[event.status]} · {eventSourceLabel[event.source]}</small></div></li>; })}</ol></Card></section>)
      : <Card><EmptyState icon="☼">Nenhum compromisso à frente.</EmptyState></Card>}
    {open && <EventDialog onClose={() => setOpen(false)} />}
  </>;
}

function EventDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, addEvent } = useLife();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState('');
  const [when, setWhen] = useState('');
  const [minutes, setMinutes] = useState(60);
  const submit = () => { if (!title.trim() || !when) return; const start = new Date(when); addEvent({ title, areaId: areaId || undefined, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + minutes * 60_000).toISOString() }); onClose(); };
  return <Dialog eyebrow="NOVO COMPROMISSO" title="O que vai acontecer?" onClose={onClose} onSubmit={submit}>
    <Field label="Compromisso"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Consulta com a nutricionista" /></Field>
    <div className="field-row"><Field label="Quando"><input type="datetime-local" required value={when} onChange={event => setWhen(event.target.value)} /></Field><Field label="Duração"><select value={minutes} onChange={event => setMinutes(Number(event.target.value))}>{[30, 60, 90, 120, 180].map(value => <option key={value} value={value}>{value < 60 ? `${value} min` : `${value / 60} h`}</option>)}</select></Field></div>
    <Field label="Área"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} /></Field>
  </Dialog>;
}

/* ── Identity ───────────────────────────────────────────────────────────── */

const editorial = [{ eyebrow: 'MEU NÚCLEO', title: 'Quem eu sou', key: 'core' }, { eyebrow: 'QUEM ESTOU ME TORNANDO', title: 'A mulher que escolho ser', key: 'becoming' }, { eyebrow: 'COMO ESCOLHO AGIR', title: 'Minha forma de estar no mundo', key: 'acting' }, { eyebrow: 'MEU POSICIONAMENTO', title: 'Como quero ser percebida', key: 'positioning' }] as const;
const emptyManifest: IdentityManifest = { core: '', becoming: '', acting: '', positioning: '', declaration: '', strengthen: [], transform: [] };

export function IdentityModule() {
  const { snapshot, saveIdentity } = useLife();
  const versions = snapshot.identityVersions.slice().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const current = versions[0];
  const [draft, setDraft] = useState<IdentityManifest | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const manifest: IdentityManifest = draft ?? current ?? emptyManifest;
  const update = (key: keyof IdentityManifest, value: string) => setDraft({ ...manifest, [key]: key === 'strengthen' || key === 'transform' ? value.split('\n') : value });
  const save = () => { if (!draft) return; saveIdentity({ ...draft, strengthen: draft.strengthen.map(item => item.trim()).filter(Boolean), transform: draft.transform.map(item => item.trim()).filter(Boolean) }); setDraft(null); };

  return <>
    <PageIntro eyebrow="MINHA VIDA" title="Identidade" text="Um manifesto vivo de quem você é. E de quem está escolhendo se tornar." action={draft ? <><Button variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar nova versão</Button></> : <Button variant="primary" onClick={() => setDraft({ ...manifest })}>Editar identidade</Button>} />
    {draft && <p className="note">Cada vez que você salva, uma nova versão entra no histórico. As anteriores continuam guardadas.</p>}
    <section className="editorial-grid">{editorial.map(block => <Card key={block.key} className="editorial-card"><span className="label">{block.eyebrow}</span><h2>{block.title}</h2>{draft ? <textarea value={manifest[block.key]} onChange={event => update(block.key, event.target.value)} /> : <p>{manifest[block.key] || 'Ainda não escrito.'}</p>}</Card>)}</section>
    <SectionHeading label="CARACTERÍSTICAS" title="O que escolho cultivar" />
    <div className="trait-grid">
      <Card><span className="label">QUERO FORTALECER</span>{draft ? <textarea value={manifest.strengthen.join('\n')} onChange={event => update('strengthen', event.target.value)} placeholder="Uma por linha" /> : <div className="trait-list">{manifest.strengthen.map(item => <span key={item}>✦ {item}</span>)}</div>}</Card>
      <Card><span className="label">QUERO TRANSFORMAR</span>{draft ? <textarea value={manifest.transform.join('\n')} onChange={event => update('transform', event.target.value)} placeholder="Uma por linha" /> : <div className="trait-list transform">{manifest.transform.map(item => <span key={item}>→ {item}</span>)}</div>}</Card>
    </div>
    <Card tone="noble" className="declaration-card"><span className="label">MINHA DECLARAÇÃO</span>{draft ? <textarea value={manifest.declaration} onChange={event => update('declaration', event.target.value)} /> : <blockquote>“{manifest.declaration || 'Escreva uma frase para voltar quando precisar.'}”</blockquote>}</Card>
    <button type="button" className="history-toggle" onClick={() => setHistoryOpen(!historyOpen)}>Histórico de versões ({versions.length}) <span>{historyOpen ? '−' : '+'}</span></button>
    {historyOpen && <div className="history-list">{versions.map((version, index) => <Card key={version.id} className="history-card"><b>{index === 0 ? 'Versão atual' : 'Versão anterior'} · {new Date(version.savedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</b><p>“{version.declaration || version.core}”</p></Card>)}</div>}
  </>;
}

/* ── Vision ─────────────────────────────────────────────────────────────── */

export function VisionModule({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { snapshot, addVision } = useLife();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [areaId, setAreaId] = useState('');
  return <>
    <PageIntro eyebrow="MINHA VIDA" title="Visão" text="O mapa macro da vida que você está construindo. Cada visão ganha força pelas metas conectadas a ela." action={<Button variant="primary" onClick={() => setOpen(true)}>Nova visão ＋</Button>} />
    <Card tone="noble" className="vision-hero"><span className="label">SUA DIREÇÃO</span><h2>Uma vida com presença, liberdade e impacto.</h2><p>Visão não é lista de tarefas. É a direção que dá sentido às metas, projetos e ações que vêm depois.</p></Card>
    <section className="vision-grid">{snapshot.visions.length ? snapshot.visions.map(vision => { const info = visionProgress(snapshot, vision.id); const area = areaOf(snapshot, vision.areaId); return <Card key={vision.id} className="vision-card">
      <small><AreaDot color={area?.color} />{area?.name ?? 'Vida inteira'}</small><h2>{vision.title}</h2><p>{vision.statement}</p>
      <div className="vision-chain"><span>{info.goals.length} {info.goals.length === 1 ? 'meta' : 'metas'}</span><i>↓</i><span>{info.projects.length} {info.projects.length === 1 ? 'projeto' : 'projetos'}</span></div>
      <div className="project-meta"><span>Movimento das metas</span><b>{info.value === undefined ? '·' : `${percent(info.value)}%`}</b></div>
      <ProgressBar value={info.value} label={vision.title} />
      <button type="button" className="link-button" onClick={() => onNavigate('goals')}>Ver metas →</button>
    </Card>; }) : <Card><EmptyState icon="◉">Escreva a primeira visão da sua vida.</EmptyState></Card>}</section>
    {open && <Dialog eyebrow="NOVA VISÃO" title="Para onde você está indo?" onClose={() => setOpen(false)} onSubmit={() => { if (title.trim() && statement.trim()) { addVision({ title, statement, areaId: areaId || undefined }); setOpen(false); setTitle(''); setStatement(''); } }}>
      <Field label="Título"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Uma casa cheia de luz" /></Field>
      <Field label="Declaração"><textarea value={statement} onChange={event => setStatement(event.target.value)} placeholder="Escreva no presente, como se já fosse verdade." /></Field>
      <Field label="Área"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} /></Field>
    </Dialog>}
  </>;
}
