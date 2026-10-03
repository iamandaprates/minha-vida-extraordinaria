import { navigation, type Route } from '../app/navigation';

type SidebarProps = { route: Route; onNavigate: (route: Route) => void };

export function Sidebar({ route, onNavigate }: SidebarProps) {
  return <aside className="sidebar"><div className="brand"><span className="brand-mark">m</span><span>minha vida<br /><b>extraordinária</b></span></div><nav aria-label="Navegação principal" className="sidebar-nav">{navigation.map(group => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(item => <button key={item.route} type="button" className={`nav-item ${route === item.route ? 'active' : ''}`} onClick={() => onNavigate(item.route)} aria-current={route === item.route ? 'page' : undefined}><span>{item.icon}</span>{item.label}</button>)}</div>)}</nav><button type="button" className="profile"><span>MP</span><div><b>Mands Prates</b><small>Dados de demonstração</small></div><i>⌄</i></button></aside>;
}
