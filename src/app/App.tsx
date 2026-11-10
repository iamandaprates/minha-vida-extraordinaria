import { useEffect, useMemo, useState } from 'react';
import type { AgendaView, Route, RouteParams } from './navigation';
import { AssistantPanel } from '../components/AssistantPanel';
import { Button } from '../components/Button';
import { FocusTimerProvider } from '../components/FocusTimer';
import { IdentityDrawer } from '../components/IdentityDrawer';
import { TopNav } from '../components/TopNav';
import { Orb } from '../components/ui';
import { AgendaPage } from '../pages/AgendaPage';
import { AreasPage } from '../pages/AreasPage';
import { EvolutionPage } from '../pages/EvolutionPage';
import { GoalsPage } from '../pages/GoalsPage';
import { HomePage } from '../pages/HomePage';
import { IdeasPage } from '../pages/IdeasPage';
import { StudiesPage } from '../pages/StudiesPage';
import { createDataService } from '../services/dataService';
import { LifeProvider, useLife } from '../state/LifeStore';

export function App() {
  const service = useMemo(createDataService, []);
  return <LifeProvider service={service}><FocusTimerProvider><Shell /></FocusTimerProvider></LifeProvider>;
}

type Theme = 'light' | 'dark';
function readTheme(): Theme {
  try { const saved = localStorage.getItem('mive-theme'); if (saved === 'dark' || saved === 'light') return saved; } catch { /* preference only */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function Shell() {
  const life = useLife();
  const [route, setRoute] = useState<Route>('inicio');
  const [params, setParams] = useState<RouteParams>({});
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const name = life.user?.name?.split(' ')[0] ?? 'Mands';
  const ready = life.status === 'ready';

  useEffect(() => { document.documentElement.classList.toggle('dark-mode', theme === 'dark'); try { localStorage.setItem('mive-theme', theme); } catch { /* preference only */ } }, [theme]);
  const navigate = (next: Route, nextParams: RouteParams = {}) => { setRoute(next); setParams(nextParams); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <div className="app-shell">
    <div className="ambient" aria-hidden="true"><i className="blob b1" /><i className="blob b2" /><i className="blob b3" /></div>
    <TopNav route={route} onNavigate={next => navigate(next)} onIdentity={() => setIdentityOpen(true)} theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} profileName={life.user?.name ?? 'Mands'} profileCaption={life.mode === 'demo' ? 'Modo local' : life.user?.email ?? 'Conta conectada'} ready={ready} />
    <main className="content">
      {life.syncIssue && <p className="note" role="status">{life.syncIssue}</p>}
      {!ready ? <StatusPage /> : <>
        {route === 'inicio' && <HomePage name={name} onNavigate={navigate} onOpenAssistant={() => setAssistantOpen(true)} />}
        {route === 'agenda' && <AgendaPage view={params.view ?? 'dia'} onViewChange={(view: AgendaView) => setParams({ view })} />}
        {route === 'areas' && <AreasPage params={params} onNavigate={next => navigate('areas', next)} />}
        {route === 'metas' && <GoalsPage />}
        {route === 'estudos' && <StudiesPage />}
        {route === 'ideias' && <IdeasPage />}
        {route === 'evolucao' && <EvolutionPage />}
      </>}
    </main>
    {assistantOpen && <AssistantPanel name={name} onClose={() => setAssistantOpen(false)} onNavigate={navigate} />}
    {identityOpen && ready && <IdentityDrawer onClose={() => setIdentityOpen(false)} />}
  </div>;
}

function StatusPage() {
  const { status, signIn } = useLife();
  if (status === 'signed-out') return <div className="placeholder"><Orb size="md" /><h1>Sua vida, guardada com cuidado</h1><p>Entre com sua conta Google para abrir seus registros. Eles ficam na nuvem e pertencem somente a você.</p><Button variant="primary" onClick={() => void signIn()}>Entrar com Google</Button></div>;
  if (status === 'error') return <div className="placeholder"><Orb size="sm" /><h1>Algo não abriu como deveria</h1><p>Não conseguimos carregar seus registros agora. Seus dados continuam seguros na nuvem.</p><Button variant="primary" onClick={() => window.location.reload()}>Tentar novamente</Button></div>;
  return <div className="placeholder"><Orb size="md" speaking /><h1>Abrindo a Mive</h1><p>Reunindo áreas, metas e registros.</p></div>;
}
