import { useEffect, useMemo, useState } from 'react';
import type { ExecutionView, Route, RouteParams } from './navigation';
import { AreasModule } from '../components/AreasModule';
import { AssistantPanel } from '../components/AssistantPanel';
import { Button } from '../components/Button';
import { Central } from '../components/Central';
import { ExecutionModule, FocusSession } from '../components/ExecutionModule';
import { FinanceModule } from '../components/FinanceModule';
import { GoalsModule } from '../components/GoalsModule';
import { HabitsModule } from '../components/HabitsModule';
import { AgendaModule, IdentityModule, VisionModule } from '../components/LifePages';
import { MobileNav } from '../components/MobileNav';
import { ProjectsModule } from '../components/ProjectsModule';
import { Sidebar } from '../components/Sidebar';
import { Dialog, Field, Orb } from '../components/ui';
import { originLabel } from '../domain/catalog';
import type { Task } from '../domain/models';
import { areaName } from '../domain/selectors';
import { createDataService } from '../services/dataService';
import { LifeProvider, useLife } from '../state/LifeStore';

const placeholders: Partial<Record<Route, { title: string; text: string }>> = {
  studies: { title: 'Estudos', text: 'O bloco diário da PRF já vive em Hábitos e Metas. O módulo de estudos com trilhas e revisões chega em um próximo lote.' },
  library: { title: 'Biblioteca', text: 'Livros, versículos e frases que sustentam a sua jornada chegam em um próximo lote.' },
  reviews: { title: 'Revisões', text: 'Revisões semanais e mensais, conectadas ao MAAS, chegam em um próximo lote.' },
  cis: { title: 'Método CIS', text: 'O MAAS semestral já está em Áreas da Vida. O guia completo do método chega em um próximo lote.' }
};

export function App() {
  const service = useMemo(createDataService, []);
  return <LifeProvider service={service}><Shell /></LifeProvider>;
}

type Theme = 'light' | 'dark';
function readTheme(): Theme { try { return localStorage.getItem('mve-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } }

function Shell() {
  const life = useLife();
  const { snapshot } = life;
  const [route, setRoute] = useState<Route>('central');
  const [params, setParams] = useState<RouteParams>({});
  const [query, setQuery] = useState('');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const name = life.user?.name?.split(' ')[0] ?? 'Mands';

  useEffect(() => { document.documentElement.classList.toggle('dark-mode', theme === 'dark'); try { localStorage.setItem('mve-theme', theme); } catch { /* preference only */ } }, [theme]);

  const navigate = (next: Route, nextParams: RouteParams = {}) => { setRoute(next); setParams(nextParams); setQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return [
      ...snapshot.tasks.map(item => ({ key: item.id, title: item.title, meta: `${originLabel[item.origin]} · ${areaName(snapshot, item.areaId)}`, route: 'execution' as Route, params: { view: 'all' } as RouteParams })),
      ...snapshot.goals.map(item => ({ key: item.id, title: item.title, meta: `Meta · ${areaName(snapshot, item.areaId)}`, route: 'goals' as Route, params: {} })),
      ...snapshot.projects.map(item => ({ key: item.id, title: item.title, meta: `Projeto · ${areaName(snapshot, item.areaId)}`, route: 'projects' as Route, params: {} })),
      ...snapshot.habits.map(item => ({ key: item.id, title: item.title, meta: `Hábito · ${areaName(snapshot, item.areaId)}`, route: 'habits' as Route, params: {} })),
      ...snapshot.areas.map(item => ({ key: item.id, title: item.name, meta: 'Área da vida', route: 'areas' as Route, params: { areaId: item.id } })),
      ...snapshot.visions.map(item => ({ key: item.id, title: item.title, meta: 'Visão', route: 'vision' as Route, params: {} })),
      ...snapshot.events.map(item => ({ key: item.id, title: item.title, meta: `Agenda · ${areaName(snapshot, item.areaId)}`, route: 'agenda' as Route, params: {} }))
    ].filter(item => `${item.title} ${item.meta}`.toLocaleLowerCase().includes(term)).slice(0, 7);
  }, [query, snapshot]);

  const ready = life.status === 'ready';
  const placeholder = placeholders[route];
  const page = !ready ? <StatusPage /> : <>
    {route === 'central' && <Central name={name} onNavigate={navigate} onStartFocus={setFocusTask} onOpenAssistant={() => setAssistantOpen(true)} />}
    {route === 'identity' && <IdentityModule />}
    {route === 'vision' && <VisionModule onNavigate={navigate} />}
    {route === 'areas' && <AreasModule selectedId={params.areaId} onSelect={areaId => navigate('areas', { areaId })} />}
    {route === 'goals' && <GoalsModule />}
    {route === 'projects' && <ProjectsModule />}
    {route === 'execution' && <ExecutionModule view={params.view ?? 'today'} onViewChange={(view: ExecutionView) => setParams({ view })} onCapture={() => setCaptureOpen(true)} />}
    {route === 'habits' && <HabitsModule />}
    {route === 'agenda' && <AgendaModule />}
    {route === 'finances' && <FinanceModule />}
    {placeholder && <div className="placeholder"><Orb size="sm" /><h1>{placeholder.title}</h1><p>{placeholder.text}</p><Button variant="primary" onClick={() => navigate('central')}>Voltar para a Central</Button></div>}
  </>;

  return <div className="app-shell">
    <div className="ambient" aria-hidden="true"><i className="blob b1" /><i className="blob b2" /><i className="blob b3" /></div>
    <Sidebar route={route} areaId={params.areaId} onNavigate={navigate} profileName={life.user?.name ?? 'Minha conta'} profileCaption={life.mode === 'demo' ? 'Dados de demonstração' : life.user?.email ?? 'Conta conectada'} />
    <main>
      <header className="topbar">
        <div className="mobile-brand"><span>m</span></div>
        <div className="global-search"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar na sua vida" aria-label="Buscar na sua vida" />
          {query && <div className="search-results">{results.length ? results.map(result => <button type="button" key={result.key} onClick={() => navigate(result.route, result.params)}><b>{result.title}</b><small>{result.meta}</small></button>) : <p>Nenhum registro encontrado.</p>}</div>}
        </div>
        <div className="top-actions">
          <button type="button" className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>{theme === 'dark' ? '☼' : '☾'}</button>
          <Button variant="primary" className="new-button" onClick={() => setCaptureOpen(true)} disabled={!ready}>＋ <span>Novo</span></Button>
        </div>
      </header>
      <div className="content">{life.syncIssue && <p className="note" role="status">{life.syncIssue}</p>}{page}</div>
    </main>
    <MobileNav route={route} onNavigate={navigate} onCapture={() => ready && setCaptureOpen(true)} />
    {captureOpen && <CaptureDialog onClose={() => setCaptureOpen(false)} />}
    {assistantOpen && <AssistantPanel name={name} onClose={() => setAssistantOpen(false)} onNavigate={navigate} onStartFocus={setFocusTask} />}
    {focusTask && <FocusSession task={focusTask} onClose={() => setFocusTask(null)} />}
  </div>;
}

function StatusPage() {
  const { status, signIn } = useLife();
  if (status === 'signed-out') return <div className="placeholder"><Orb size="md" /><h1>Sua vida, guardada com cuidado</h1><p>Entre com sua conta Google para abrir seus registros. Eles ficam na nuvem e pertencem somente a você.</p><Button variant="primary" onClick={() => void signIn()}>Entrar com Google</Button></div>;
  if (status === 'error') return <div className="placeholder"><Orb size="sm" /><h1>Algo não abriu como deveria</h1><p>Não conseguimos carregar seus registros agora. Seus dados continuam seguros na nuvem.</p><Button variant="primary" onClick={() => window.location.reload()}>Tentar novamente</Button></div>;
  return <div className="placeholder"><Orb size="md" speaking /><h1>Abrindo sua vida</h1><p>Reunindo áreas, metas e registros.</p></div>;
}

function CaptureDialog({ onClose }: { onClose: () => void }) {
  const { captureDemand } = useLife();
  const [title, setTitle] = useState('');
  return <Dialog eyebrow="CAPTURA RÁPIDA" title="O que precisa da sua atenção?" onClose={onClose} onSubmit={() => { if (title.trim()) { captureDemand(title); onClose(); } }} submitLabel="Adicionar demanda →">
    <Field label="Demanda" hint="Ela entra em Execução e aparece na Central quando for relevante."><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: marcar consulta" /></Field>
  </Dialog>;
}
