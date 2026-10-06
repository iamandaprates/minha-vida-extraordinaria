import type { Route } from '../app/navigation';

type MobileNavProps = { route: Route; onNavigate: (route: Route) => void; onCapture: () => void };
export function MobileNav({ route, onNavigate, onCapture }: MobileNavProps) {
  return <nav className="mobile-nav" aria-label="Navegação móvel"><button type="button" onClick={() => onNavigate('central')} className={route === 'central' ? 'selected' : ''}>✦<span>Central</span></button><button type="button" onClick={() => onNavigate('areas')} className={route === 'areas' ? 'selected' : ''}>◌<span>Áreas</span></button><button type="button" onClick={() => onNavigate('agenda')} className={route === 'agenda' ? 'selected' : ''}>□<span>Agenda</span></button><button type="button" onClick={onCapture} className="add" aria-label="Adicionar demanda">+</button><button type="button" onClick={() => onNavigate('execution')} className={route === 'execution' ? 'selected' : ''}>✓<span>Execução</span></button><button type="button" onClick={() => onNavigate('identity')} className={route === 'identity' ? 'selected' : ''}>♡<span>Identidade</span></button></nav>;
}
