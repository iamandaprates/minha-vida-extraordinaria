import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { Route } from './navigation';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MobileNav } from '../components/MobileNav';
import { Sidebar } from '../components/Sidebar';
import { AreasModule } from '../components/AreasModule';
import { demoSignals, demoVisions, identitySeed } from '../data/demo';
import type { CalendarEvent, LifeSnapshot, Task } from '../domain/models';
import { areaName, byRelevance, completionOf, eventSourceLabel, eventStatusLabel, formatActivity, formatDay, formatDue, formatTime, openTasks, originLabel, projectProgress, upcomingEvents } from '../domain/selectors';
import { createDataService } from '../services/dataService';
import { LifeProvider, useLife } from '../state/LifeStore';

const dailyMessages = ['Você não precisa fazer tudo hoje. Só precisa honrar o que importa.', 'A vida que você imagina também é construída nos movimentos pequenos.', 'Seu ritmo pode ser bonito, estratégico e verdadeiro.'];
const labels: Record<string, string> = { central: 'Central', identity: 'Identidade', vision: 'Visão', execution: 'Execução', agenda: 'Agenda', projects: 'Projetos', goals: 'Metas', areas: 'Áreas da Vida', habits: 'Hábitos' };
const readyRoutes: Route[] = ['central', 'identity', 'vision', 'areas', 'agenda', 'execution'];

export function App() {
  const service = useMemo(createDataService, []);
  return <LifeProvider service={service}><Shell /></LifeProvider>;
}

function Shell() {
  const life = useLife();
  const { snapshot } = life;
  const [route, setRoute] = useState<Route>('central');
  const [query, setQuery] = useState('');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [identity, setIdentity] = useState(identitySeed);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const message = dailyMessages[new Date().getDate() % dailyMessages.length];
  const firstName = life.user?.name?.split(' ')[0] ?? 'Mands';
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return [
      ...snapshot.tasks.map(item => ({ key: item.id, title: item.title, meta: `${originLabel[item.origin]} · ${areaName(snapshot, item.areaId)}`, target: 'execution' as Route })),
      ...snapshot.projects.map(item => ({ key: item.id, title: item.title, meta: `Projeto · ${areaName(snapshot, item.areaId)}`, target: 'projects' as Route })),
      ...snapshot.areas.map(item => ({ key: item.id, title: item.name, meta: 'Área da vida', target: 'areas' as Route })),
      ...demoVisions.map(item => ({ key: item.id, title: item.title, meta: `Visão · ${item.area}`, target: 'vision' as Route })),
      ...snapshot.events.map(item => ({ key: item.id, title: item.title, meta: `Agenda · ${areaName(snapshot, item.areaId)}`, target: 'agenda' as Route }))
    ].filter(item => `${item.title} ${item.meta}`.toLocaleLowerCase().includes(term)).slice(0, 6);
  }, [query, snapshot]);
  const navigate = (next: Route) => { setRoute(next); setQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const capture = (title: string) => { life.captureDemand(title); setCaptureOpen(false); };

  const page = life.status !== 'ready' ? <StatusPage /> : <>
    {route === 'central' && <Central greeting={greeting} name={firstName} date={date} message={message} identityReminder={identity.core} onNavigate={navigate} />}
    {route === 'identity' && <IdentityPage identity={identity} onSave={setIdentity} editing={editingIdentity} setEditing={setEditingIdentity} historyOpen={historyOpen} setHistoryOpen={setHistoryOpen} />}
    {route === 'vision' && <VisionPage onNavigate={navigate} />}
    {route === 'areas' && <AreasModule />}
    {route === 'agenda' && <AgendaPage />}
    {route === 'execution' && <ExecutionPage onCapture={() => setCaptureOpen(true)} />}
    {!readyRoutes.includes(route) && <Placeholder title={labels[route] ?? 'Em breve'} onNavigate={() => navigate('central')} />}
  </>;

  return <div className="app-shell"><Sidebar route={route} onNavigate={navigate} profileName={life.user?.name ?? (life.mode === 'demo' ? undefined : 'Minha conta')} profileCaption={life.mode === 'demo' ? 'Dados de demonstração' : life.user?.email ?? 'Conta conectada'} /><main><header className="topbar"><div className="mobile-brand"><span>m</span></div><div className="global-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar na sua vida" aria-label="Buscar na sua vida" />{query && <div className="search-results">{results.length ? results.map(result => <button type="button" key={result.key} onClick={() => navigate(result.target)}><b>{result.title}</b><small>{result.meta}</small></button>) : <p>Nenhum registro encontrado.</p>}</div>}</div><div className="top-actions"><button type="button" aria-label="Alertas">♧</button><Button className="new-button" onClick={() => setCaptureOpen(true)} disabled={life.status !== 'ready'}>＋ <span>Novo</span></Button></div></header><div className="content">{life.syncIssue && <p className="demo-note sync-note" role="status">{life.syncIssue}</p>}{page}</div></main><MobileNav route={route} onNavigate={navigate} onCapture={() => life.status === 'ready' && setCaptureOpen(true)} />{captureOpen && <CaptureDialog onClose={() => setCaptureOpen(false)} onSubmit={capture} />}</div>;
}

function StatusPage() {
  const { status, signIn } = useLife();
  if (status === 'signed-out') return <div className="placeholder"><span>♡</span><h1>Sua vida, guardada com cuidado</h1><p>Entre com sua conta Google para abrir seus registros. Eles ficam na nuvem e pertencem somente a você.</p><Button className="pink-button" onClick={() => void signIn()}>Entrar com Google</Button></div>;
  if (status === 'error') return <div className="placeholder"><span>✦</span><h1>Algo não abriu como deveria</h1><p>Não conseguimos carregar seus registros agora. Seus dados continuam seguros na nuvem.</p><Button className="pink-button" onClick={() => window.location.reload()}>Tentar novamente</Button></div>;
  return <div className="placeholder"><span>✦</span><h1>Abrindo sua vida</h1><p>Reunindo áreas, planos e registros.</p></div>;
}

function TaskLine({ task, snapshot, onToggle, onOpen }: { task: Task; snapshot: LifeSnapshot; onToggle: () => void; onOpen?: () => void }) {
  const completion = completionOf(task.id, snapshot.executions);
  const meta = `${areaName(snapshot, task.areaId)} · ${originLabel[task.origin]}${task.priority === 'high' ? ' · PRIORIDADE' : ''}`;
  const when = completion ? `Concluída: ${formatDay(completion.occurredAt)} · ${formatTime(completion.occurredAt)}` : formatDue(task);
  const copy = <><small>{meta}</small><strong>{task.title}</strong><span>{when}</span></>;
  return <Card className={`todo-item ${completion ? 'is-done' : ''}`}><button type="button" className="task-check" aria-label={`${completion ? 'Reabrir' : 'Concluir'} ${task.title}`} aria-pressed={Boolean(completion)} onClick={onToggle}>{completion ? '✓' : ''}</button>{onOpen ? <button type="button" className="todo-copy" onClick={onOpen}>{copy}</button> : <div className="todo-copy">{copy}</div>}{onOpen && <button type="button" className="arrow-button" onClick={onOpen} aria-label={`Abrir ${task.title}`}>→</button>}</Card>;
}

function EventLine({ event, snapshot, onOpen }: { event: CalendarEvent; snapshot: LifeSnapshot; onOpen: () => void }) {
  return <button type="button" className="calendar-line clickable" onClick={onOpen}><b>{formatTime(event.startsAt)}</b><span className="dot" /><div><strong>{event.title}</strong><small>{formatDay(event.startsAt)} · {areaName(snapshot, event.areaId)} · {eventStatusLabel[event.status]}</small></div></button>;
}

function Central({ greeting, name, date, message, identityReminder, onNavigate }: { greeting: string; name: string; date: string; message: string; identityReminder: string; onNavigate: (route: Route) => void }) {
  const { snapshot, toggleTaskCompletion } = useLife();
  const pending = openTasks(snapshot);
  const nextEvents = upcomingEvents(snapshot.events).slice(0, 3);
  const projects = snapshot.projects.filter(project => project.status === 'active').sort((a, b) => Number(Boolean(b.focus)) - Number(Boolean(a.focus)));
  return <><div className="eyebrow">CENTRAL <span>•</span> {date}</div><div className="welcome"><div><h1>{greeting}, {name} <em>♡</em></h1><p>{message}</p></div><Button className="pink-button" onClick={() => onNavigate('execution')}>Ver meu dia <span>→</span></Button></div>
    <section className="hero-grid"><Card className="identity-card"><div className="card-top"><span className="label">LEMBRETE DE IDENTIDADE</span><button type="button" aria-label="Mais opções">•••</button></div><blockquote>“{identityReminder}”</blockquote><div className="identity-footer"><span>Da sua identidade</span><button type="button" onClick={() => onNavigate('identity')}>Ver declarações →</button></div><div className="orb orb-one" /><div className="orb orb-two" /></Card><Card className="day-card"><div className="card-top"><span className="label">PRÓXIMOS COMPROMISSOS</span><button type="button" onClick={() => onNavigate('agenda')}>Ver agenda →</button></div><h2>Seu dia, com espaço para você.</h2>{nextEvents.length ? nextEvents.map(event => <EventLine key={event.id} event={event} snapshot={snapshot} onOpen={() => onNavigate('agenda')} />) : <p className="calendar-empty">Nenhum compromisso à frente. Um bom espaço para respirar.</p>}</Card></section>
    <section className="section-heading"><div><span className="label">TO DO</span><h2>O que pede movimento</h2></div><button type="button" onClick={() => onNavigate('execution')}>Ver execução →</button></section>
    <section className="todo-list">{pending.length ? pending.slice(0, 5).map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => toggleTaskCompletion(task.id)} onOpen={() => onNavigate('execution')} />) : <Card className="empty-state"><span>✦</span><p>Seu to do está leve por aqui.</p></Card>}</section>
    <section className="section-heading"><div><span className="label">O QUE MERECE SUA ATENÇÃO</span><h2>Sinais da sua vida</h2></div><button type="button" onClick={() => onNavigate('projects')}>Ver todos os sinais →</button></section>
    <section className="signals">{demoSignals.map(signal => <Card className="signal clickable" key={signal.id} onClick={() => onNavigate(signal.target)} role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && onNavigate(signal.target)}><span className={`signal-icon ${signal.kind}`}>✦</span><div><small>{signal.area.toUpperCase()}</small><h3>{signal.title}</h3><p>{signal.detail}</p></div><span className="arrow">→</span></Card>)}</section>
    <section className="section-heading"><div><span className="label">PROJETOS EM MOVIMENTO</span><h2>O que você está construindo</h2></div><button type="button" onClick={() => onNavigate('projects')}>Ver projetos →</button></section>
    <section className="project-grid">{projects.length ? projects.map(project => { const { progress, nextAction, lastActivityAt } = projectProgress(snapshot, project); return <Card className="project-card clickable" key={project.id} onClick={() => onNavigate('projects')} role="button" tabIndex={0}><div><small>{areaName(snapshot, project.areaId)} {project.focus && '· FOCO'}</small><h3>{project.title}</h3></div><div className="project-meta"><span>{formatActivity(lastActivityAt)}</span>{progress !== undefined && <b>{progress}%</b>}</div><div className="progress"><i style={{ width: `${progress ?? 0}%` }} /></div><p>Próxima ação: <strong>{nextAction?.title ?? 'Defina o próximo passo'}</strong></p></Card>; }) : <Card className="empty-state"><span>✦</span><p>Quando um projeto nascer em uma área, ele aparece aqui.</p></Card>}</section></>;
}

function IdentityPage({ identity, onSave, editing, setEditing, historyOpen, setHistoryOpen }: { identity: typeof identitySeed; onSave: (value: typeof identitySeed) => void; editing: boolean; setEditing: (value: boolean) => void; historyOpen: boolean; setHistoryOpen: (value: boolean) => void }) {
  const update = (key: keyof typeof identitySeed, value: string) => onSave({ ...identity, [key]: value });
  const editorial = [{ eyebrow: 'MEU NÚCLEO', title: 'Quem eu sou', key: 'core' as const }, { eyebrow: 'QUEM ESTOU ME TORNANDO', title: 'A mulher que escolho ser', key: 'becoming' as const }, { eyebrow: 'COMO ESCOLHO AGIR', title: 'Minha forma de estar no mundo', key: 'acting' as const }, { eyebrow: 'MEU POSICIONAMENTO', title: 'Como quero ser percebida', key: 'positioning' as const }];
  return <><PageIntro eyebrow="MINHA VIDA" title="Identidade" text="Um manifesto vivo de quem você é. De quem está escolhendo se tornar." action={<Button className="pink-button" onClick={() => setEditing(!editing)}>{editing ? 'Salvar mudanças' : 'Editar identidade'}</Button>} />{editing && <p className="demo-note">Modo de edição ativo. As mudanças ficam somente nesta sessão de demonstração.</p>}<section className="editorial-grid">{editorial.map(block => <Card className="editorial-card" key={block.key}><span className="label">{block.eyebrow}</span><h2>{block.title}</h2>{editing ? <textarea value={identity[block.key]} onChange={event => update(block.key, event.target.value)} /> : <p>{identity[block.key]}</p>}</Card>)}</section><section className="section-heading"><div><span className="label">CARACTERÍSTICAS</span><h2>O que escolho cultivar</h2></div></section><div className="trait-grid"><Card><span className="label">QUERO FORTALECER</span><div className="trait-list">{identity.strengthen.map(item => <span key={item}>✦ {item}</span>)}</div></Card><Card><span className="label">QUERO TRANSFORMAR</span><div className="trait-list transform">{identity.transform.map(item => <span key={item}>→ {item}</span>)}</div></Card></div><Card className="declaration-card"><div><span className="label">MINHAS DECLARAÇÕES</span><h2>Uma frase para voltar quando precisar</h2><blockquote>“Eu me movimento com coragem em direção à vida que quero viver.”</blockquote></div><Button onClick={() => setEditing(true)}>Editar declarações</Button></Card><button type="button" className="history-toggle" onClick={() => setHistoryOpen(!historyOpen)}>Histórico de versões <span>{historyOpen ? '−' : '+'}</span></button>{historyOpen && <Card className="history-card"><b>Versão anterior · 12 set 2026</b><p>“Eu aprendo a confiar no meu próprio ritmo.”</p></Card>}</>;
}

function VisionPage({ onNavigate }: { onNavigate: (route: Route) => void }) { return <><PageIntro eyebrow="MINHA VIDA" title="Visão" text="O mapa macro da vida que você está construindo." action={<Button className="pink-button">Nova visão ＋</Button>} /><Card className="vision-hero"><span className="label">SUA DIREÇÃO</span><h2>Uma vida com presença, liberdade e impacto.</h2><p>Visão não é uma lista de tarefas. É a direção que dá sentido às metas, projetos e ações que vêm depois.</p></Card><section className="vision-grid">{demoVisions.map(vision => <Card key={vision.id} className={`vision-card ${vision.color}`}><small>{vision.area.toUpperCase()}</small><h2>{vision.title}</h2><p>{vision.text}</p><div className="vision-chain"><span>{vision.goalCount} meta{vision.goalCount !== 1 && 's'}</span><i>↓</i><span>{vision.projectCount} projeto{vision.projectCount !== 1 && 's'}</span></div><div className="project-meta"><span>Movimento atual</span><b>{vision.progress}%</b></div><div className="progress"><i style={{ width: `${vision.progress}%` }} /></div><button type="button" onClick={() => onNavigate('goals')}>Ver metas e projetos →</button></Card>)}</section></>;
}

function AgendaPage() {
  const { snapshot } = useLife();
  const events = upcomingEvents(snapshot.events);
  return <><PageIntro eyebrow="ACOMPANHAR" title="Agenda" text="Seus compromissos locais e do Google Calendar, no mesmo lugar." action={<Button className="pink-button">Novo compromisso ＋</Button>} /><Card className="integration-note"><span>◉</span><div><b>Google Calendar preparado</b><p>Conecte sua conta quando a integração OAuth estiver disponível. Nenhum calendário paralelo será criado.</p></div><button type="button">Em breve</button></Card><section className="agenda-list">{events.length ? events.map(event => <Card key={event.id} className="agenda-item"><b>{formatTime(event.startsAt)}</b><span className="dot" /><div><small>{formatDay(event.startsAt).toUpperCase()} · {areaName(snapshot, event.areaId).toUpperCase()} · {eventStatusLabel[event.status]}</small><h3>{event.title}</h3><p>{eventSourceLabel[event.source]}</p></div></Card>) : <Card className="empty-state"><span>✦</span><p>Nenhum compromisso à frente. Você pode criar um a partir de qualquer área.</p></Card>}</section></>;
}

function ExecutionPage({ onCapture }: { onCapture: () => void }) {
  const { snapshot, mode, toggleTaskCompletion } = useLife();
  const pending = openTasks(snapshot);
  const done = snapshot.tasks.filter(task => completionOf(task.id, snapshot.executions)).sort((a, b) => (completionOf(b.id, snapshot.executions)?.occurredAt ?? '').localeCompare(completionOf(a.id, snapshot.executions)?.occurredAt ?? '') || byRelevance(a, b));
  return <><PageIntro eyebrow="ORGANIZAR" title="Execução" text="Tudo o que você planejou, venha de onde vier: demandas, ações das áreas e passos dos projetos. A Central apenas espelha o que importa." action={<Button className="pink-button" onClick={onCapture}>Nova demanda ＋</Button>} />{mode === 'demo' && <p className="demo-note">Modo demonstração. As alterações ficam somente nesta sessão.</p>}<section className="execution-list">{pending.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => toggleTaskCompletion(task.id)} />)}{!pending.length && <Card className="empty-state"><span>✦</span><p>Nada pendente. Respire, isso também é movimento.</p></Card>}</section>{done.length > 0 && <><section className="section-heading"><div><span className="label">REALIZADO</span><h2>O que já aconteceu</h2></div></section><section className="execution-list">{done.map(task => <TaskLine key={task.id} task={task} snapshot={snapshot} onToggle={() => toggleTaskCompletion(task.id)} />)}</section></>}</>;
}

function PageIntro({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) { return <div className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</div>; }
function Placeholder({ title, onNavigate }: { title: string; onNavigate: () => void }) { return <div className="placeholder"><span>✦</span><h1>{title}</h1><p>Esta área está preparada para um próximo lote. A Central continua mostrando somente dados que têm origem no sistema.</p><Button className="pink-button" onClick={onNavigate}>Voltar para a Central</Button></div>; }
function CaptureDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (title: string) => void }) { const [title, setTitle] = useState(''); const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) onSubmit(title.trim()); }; return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><form className="capture-dialog" onSubmit={submit} onMouseDown={event => event.stopPropagation()}><button type="button" className="close" onClick={onClose}>×</button><span className="label">CAPTURA RÁPIDA</span><h2>O que precisa da sua atenção?</h2><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: marcar consulta" /><p>Ela será criada como demanda em Execução e aparecerá na Central quando for relevante.</p><Button className="pink-button" type="submit">Adicionar demanda →</Button></form></div>; }
