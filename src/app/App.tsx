import { AnimatePresence, LazyMotion, m, MotionConfig } from 'framer-motion';
import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { navigation, type AgendaView, type Route, type RouteParams } from './navigation';
import { AgendaPage, AreasPage, AssistantPanel, EvolutionPage, GoalsPage, HomePage, IdentityDrawer, IdeasPage, isRouteLoaded, preloadEverything, preloadRoute, StudiesPage } from './routes';
import { Button } from '../components/Button';
import { FocusTimerProvider } from '../components/FocusTimer';
import { TopNav } from '../components/TopNav';
import { Orb } from '../components/ui';
import { createDataService } from '../services/dataService';
import { LifeProvider, useLife } from '../state/LifeStore';

const loadMotion = () => import('./motionFeatures').then(module => module.default);

export function App() {
  const service = useMemo(createDataService, []);
  return <MotionConfig reducedMotion="user"><LazyMotion features={loadMotion} strict><LifeProvider service={service}><FocusTimerProvider><Shell /></FocusTimerProvider></LifeProvider></LazyMotion></MotionConfig>;
}

type Theme = 'light' | 'dark';
const themeColor: Record<Theme, string> = { light: '#fbfbff', dark: '#0d0c14' };
function readTheme(): Theme {
  try { const saved = localStorage.getItem('mive-theme'); if (saved === 'dark' || saved === 'light') return saved; } catch { /* preference only */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
/** `/?guia=agenda` opens a guide directly (used by the shortcuts of the installed app). */
function readRoute(): Route {
  const asked = new URLSearchParams(window.location.search).get('guia');
  return navigation.find(item => item.route === asked)?.route ?? 'inicio';
}
/** How long a click waits for a chunk before the guide opens with its skeleton. */
const CHUNK_PATIENCE_MS = 400;
const initialRoute = readRoute();
// The first guide downloads together with the data, so both are there for the first paint.
void preloadRoute(initialRoute);
function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

function Shell() {
  const life = useLife();
  const [route, setRoute] = useState<Route>(initialRoute);
  const [pageReady, setPageReady] = useState(() => isRouteLoaded(initialRoute));
  const [params, setParams] = useState<RouteParams>({});
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const online = useOnline();
  const profileName = life.snapshot.profiles[0]?.displayName ?? life.user?.name ?? 'Mands';
  const name = profileName.split(' ')[0];
  const ready = life.status === 'ready' && pageReady;

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor[theme]);
    try { localStorage.setItem('mive-theme', theme); } catch { /* preference only */ }
  }, [theme]);
  useEffect(() => { document.title = route === 'inicio' ? 'Mive' : `${navigation.find(item => item.route === route)?.label} · Mive`; }, [route]);
  useEffect(() => { if (pageReady) return; let active = true; const done = () => { if (active) setPageReady(true); }; void preloadRoute(initialRoute).then(done); const patience = setTimeout(done, 2500); return () => { active = false; clearTimeout(patience); }; }, [pageReady]);
  useEffect(() => { if (ready) preloadEverything(); }, [ready]);

  const navigate = useCallback((next: Route, nextParams: RouteParams = {}) => {
    let done = false;
    const open = () => {
      if (done) return; done = true;
      setRoute(next); setParams(nextParams);
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    if (isRouteLoaded(next)) return open();
    // Keep the current guide on screen while the next one downloads; give up waiting on a slow network.
    void preloadRoute(next).then(open);
    setTimeout(open, CHUNK_PATIENCE_MS);
  }, []);
  const goTo = useCallback((next: Route) => navigate(next), [navigate]);
  const openIdentity = useCallback(() => { void IdentityDrawer.preload().then(() => setIdentityOpen(true)); }, []);
  const openAssistant = useCallback(() => { void AssistantPanel.preload().then(() => setAssistantOpen(true)); }, []);
  const toggleTheme = useCallback(() => setTheme(current => current === 'dark' ? 'light' : 'dark'), []);

  return <div className="app-shell">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="ambient" aria-hidden="true"><i className="blob b1" /><i className="blob b2" /><i className="blob b3" /></div>
    <TopNav route={route} onNavigate={goTo} onPreload={preloadRoute} onIdentity={openIdentity} theme={theme} onToggleTheme={toggleTheme} profileName={profileName} profileCaption={life.mode === 'demo' ? 'Modo local · salvo neste aparelho' : life.user?.email ?? 'Conta conectada'} ready={ready} />
    <main className="content" id="conteudo" tabIndex={-1}>
      {!online && <p className="note is-calm" role="status">Você está offline. {life.mode === 'demo' ? 'Tudo continua salvo neste aparelho.' : 'Novas alterações só são enviadas com internet.'}</p>}
      {life.syncIssue && <p className="note" role="status">{life.syncIssue}</p>}
      {!ready ? <StatusPage /> : <AnimatePresence mode="wait" initial={false}>
        <m.div key={route} className="route" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: 'easeIn' } }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
          <ChunkBoundary><Suspense fallback={<RouteFallback />}>
            {route === 'inicio' && <HomePage name={name} onNavigate={navigate} onOpenAssistant={openAssistant} />}
            {route === 'agenda' && <AgendaPage view={params.view ?? 'dia'} onViewChange={(view: AgendaView) => setParams({ view })} />}
            {route === 'areas' && <AreasPage params={params} onNavigate={next => navigate('areas', next)} />}
            {route === 'metas' && <GoalsPage />}
            {route === 'estudos' && <StudiesPage />}
            {route === 'ideias' && <IdeasPage />}
            {route === 'evolucao' && <EvolutionPage />}
          </Suspense></ChunkBoundary>
        </m.div>
      </AnimatePresence>}
    </main>
    <ChunkBoundary quiet><Suspense fallback={null}>
      {assistantOpen && ready && <AssistantPanel name={name} onClose={() => setAssistantOpen(false)} onNavigate={navigate} />}
      {identityOpen && ready && <IdentityDrawer onClose={() => setIdentityOpen(false)} />}
    </Suspense></ChunkBoundary>
  </div>;
}

/**
 * A guide is a separate file. If it cannot be downloaded (no connection before the app was
 * saved for offline use, or a new version was published meanwhile), the rest of the app stays
 * up and this offers the way out. The records are not involved: they live in the store.
 */
class ChunkBoundary extends Component<{ children: ReactNode; quiet?: boolean }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.quiet) return null;
    return <div className="placeholder" role="alert"><Orb size="sm" /><h1>Esta guia não abriu</h1><p>Parece que a conexão falhou no caminho. Seus registros estão guardados; é só recarregar para continuar.</p><Button variant="primary" onClick={() => window.location.reload()}>Recarregar a Mive</Button></div>;
  }
}

/** Shown while the chunk of a guide arrives: the shape of the page, quietly breathing. */
function RouteFallback() {
  return <div className="route-fallback" role="status" aria-label="Abrindo a guia"><i className="skeleton sk-title" /><i className="skeleton sk-line" /><div className="sk-grid"><i className="skeleton sk-card" /><i className="skeleton sk-card" /><i className="skeleton sk-card" /></div></div>;
}

function StatusPage() {
  const { status, signIn } = useLife();
  if (status === 'ready') return <div className="placeholder" role="status"><Orb size="md" speaking /><h1>Abrindo a Mive</h1><p>Quase lá.</p></div>;
  if (status === 'signed-out') return <div className="placeholder"><Orb size="md" /><h1>Sua vida, guardada com cuidado</h1><p>Entre com sua conta Google para abrir seus registros. Eles ficam na nuvem e pertencem somente a você.</p><Button variant="primary" onClick={() => void signIn()}>Entrar com Google</Button></div>;
  if (status === 'error') return <div className="placeholder"><Orb size="sm" /><h1>Algo não abriu como deveria</h1><p>Não conseguimos carregar seus registros agora. Seus dados continuam seguros na nuvem.</p><Button variant="primary" onClick={() => window.location.reload()}>Tentar novamente</Button></div>;
  return <div className="placeholder" role="status"><Orb size="md" speaking /><h1>Abrindo a Mive</h1><p>Reunindo áreas, metas e registros.</p></div>;
}
