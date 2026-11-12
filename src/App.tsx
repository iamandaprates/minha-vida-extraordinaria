import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MobileNav } from './layout/BottomNav';
import { TopNav } from './layout/TopNav';
import { Waves } from './layout/Waves';
import { AgendaPage } from './modules/agenda/AgendaPage';
import { AreaPage } from './modules/areas/AreaPage';
import { AreasPage } from './modules/areas/AreasPage';
import { EstudosPage } from './modules/estudos/EstudosPage';
import { IdeiasPage } from './modules/ideias/IdeiasPage';
import { ProjetoDetail } from './modules/projetos/ProjetoDetail';
import { ProjetosPage } from './modules/projetos/ProjetosPage';
import { ConfiguracoesPage } from './modules/configuracoes/ConfiguracoesPage';
import { EuSouDrawer } from './modules/eusou/EuSouDrawer';
import { InicioPage } from './modules/inicio/InicioPage';
import { SessionEnd, useFocusTick } from './modules/inicio/FocusTimer';
import { Onboarding } from './modules/onboarding/Onboarding';
import { PlaceholderPage } from './modules/Placeholder';
import { useMive } from './store/useMive';

function Shell() {
  const [euSou, setEuSou] = useState(false);
  const location = useLocation();
  useFocusTick();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  return <div className="relative min-h-[100dvh]">
    <Waves />
    <TopNav onEuSou={() => setEuSou(true)} />
    <MobileNav onEuSou={() => setEuSou(true)} />
    <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-24 sm:px-6 md:pb-16 md:pt-32">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<InicioPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/projetos" element={<ProjetosPage />} />
          <Route path="/projetos/:id" element={<ProjetoDetail />} />
          <Route path="/areas" element={<AreasPage />} />
          <Route path="/areas/:id" element={<AreaPage />} />
          <Route path="/estudos" element={<EstudosPage />} />
          <Route path="/ideias" element={<IdeiasPage />} />
          {['/evolucao'].map(path => <Route key={path} path={path} element={<PlaceholderPage />} />)}
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </main>
    <EuSouDrawer open={euSou} onClose={() => setEuSou(false)} />
    <SessionEnd />
  </div>;
}

export function App() {
  const hydrated = useMive(state => state.hydrated);
  const onboarded = useMive(state => Boolean(state.profile?.onboardedAt));
  const theme = useMive(state => state.settings.theme);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0D0C14' : '#F31991'); }, [theme]);
  if (!hydrated) return <div className="grid min-h-[100dvh] place-items-center"><img src="/logo.png" alt="Carregando a Mive" className="h-16 w-auto animate-pulse" /></div>;
  return onboarded ? <BrowserRouter><Shell /></BrowserRouter> : <Onboarding />;
}
