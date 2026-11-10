import type { Route, RouteParams } from '../app/navigation';

type MobileNavProps = { route: Route; onNavigate: (route: Route, params?: RouteParams) => void; onCapture: () => void };
const items: { route: Route; icon: string; label: string }[] = [{ route: 'central', icon: '✦', label: 'Central' }, { route: 'execution', icon: '✓', label: 'Execução' }, { route: 'habits', icon: '◒', label: 'Hábitos' }, { route: 'finances', icon: '◈', label: 'Finanças' }];

export function MobileNav({ route, onNavigate, onCapture }: MobileNavProps) {
  const button = (item: (typeof items)[number]) => <button key={item.route} type="button" onClick={() => onNavigate(item.route)} className={route === item.route ? 'selected' : ''} aria-current={route === item.route ? 'page' : undefined}>{item.icon}<span>{item.label}</span></button>;
  return <nav className="mobile-nav" aria-label="Navegação móvel">{items.slice(0, 2).map(button)}<button type="button" onClick={onCapture} className="add" aria-label="Captura rápida">＋</button>{items.slice(2).map(button)}</nav>;
}
