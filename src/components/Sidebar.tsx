import { navigation, type Route } from '../app/navigation';

type SidebarProps = { route: Route; onNavigate: (route: Route) => void; profileName?: string; profileCaption?: string };

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');

export function Sidebar({ route, onNavigate, profileName = 'Mands Prates', profileCaption = 'Dados de demonstração' }: SidebarProps) {
  return <aside className="sidebar"><div className="brand"><span className="brand-mark">m</span><span>minha vida<br /><b>extraordinária</b></span></div><nav aria-label="Navegação principal" className="sidebar-nav">{navigation.map(group => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(item => <button key={item.route} type="button" className={`nav-item ${route === item.route ? 'active' : ''}`} onClick={() => onNavigate(item.route)} aria-current={route === item.route ? 'page' : undefined}><span>{item.icon}</span>{item.label}</button>)}</div>)}</nav><button type="button" className="profile"><span>{initials(profileName)}</span><div><b>{profileName}</b><small>{profileCaption}</small></div><i>⌄</i></button></aside>;
}
